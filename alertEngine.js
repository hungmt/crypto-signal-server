// alertEngine.js
const axios = require("axios");
const fs = require("fs");
const WebSocket = require("ws");
const { RSI } = require("technicalindicators");
const { pushSignal } = require("./notifier");
const { saveHistory } = require("./saveHistory");
const { hlc3, nadarayaWatsonLux, envelopeLux } = require("./indicator");

const INTERVALS = ["15m", "1h", "2h", "4h", "1d"];

const signalsCache = fs.existsSync("signals.json")
  ? JSON.parse(fs.readFileSync("signals.json"))
  : {};

const indicatorCache = {};
const priceMap = {};
const klineCache = {};
/* ================= PRICE STREAM ================= */
function atrMultiplier(tf) {
  return {
    "15m": 1.2,
    "1h": 1.5,
    "2h": 1.8,
    "4h": 2.2,
    "1d": 3.0,
  }[tf] || 1.5;
}
function calcTrade(price, up, lo, mid, atr, tf, signal) {
  if (!atr || !up || !lo || !mid) {
    return { entry: null, tp: null, sl: null, rr: null };
  }

  const k = atrMultiplier(tf);

  if (signal === "LONG") {

    // ⭐ CHỐNG ĐẢO
    if (!(lo < price && mid > price)) {
      return { entry: null, tp: null, sl: null, rr: null };
    }

    const sl = lo - atr * k;
    const tp = mid;
    const rr = (tp - price) / (price - sl);

    return {
      entry: price,
      tp,
      sl,
      rr: Number(rr.toFixed(2)),
    };
  }

  if (signal === "SHORT") {

    // ⭐ CHỐNG ĐẢO
    if (!(up > price && mid < price)) {
      return { entry: null, tp: null, sl: null, rr: null };
    }

    const sl = up + atr * k;
    const tp = mid;
    const rr = (price - tp) / (sl - price);

    return {
      entry: price,
      tp,
      sl,
      rr: Number(rr.toFixed(2)),
    };
  }

  return { entry: null, tp: null, sl: null, rr: null };
}
function startPriceStream() {
  const ws = new WebSocket("wss://fstream.binance.com/ws/!markPrice@arr");

  ws.on("message", (msg) => {
    JSON.parse(msg).forEach(p => {
      priceMap[p.s] = Number(p.p);
    });
  });

  ws.on("close", () => setTimeout(startPriceStream, 2000));
}

/* ================= KLINE SUB ================= */

/* ================= FETCH KLINES ================= */

async function getKlines(symbol, tf) {
  const { data } = await axios.get(
    "https://fapi.binance.com/fapi/v1/klines",
    { params: { symbol, interval: tf, limit: 200 } }
  );

  return data.map(k => Number(k[4]));
}

/* ================= INDICATORS ================= */

async function updateIndicators(symbol, tf) {
  const closes = await getKlines(symbol, tf);
  const rsi = RSI.calculate({ values: closes, period: 14 }).at(-1);

  const max = Math.max(...closes.slice(-50));
  const min = Math.min(...closes.slice(-50));

  if (!indicatorCache[symbol]) indicatorCache[symbol] = {};
  indicatorCache[symbol][tf] = { rsi, upper: max, lower: min };
}

/* ================= SIGNAL ENGINE (STATEFUL) ================= */
async function preloadKlinesSafe(symbol, tf) {
  await new Promise(r => setTimeout(r, 500)); // chống rate limit

  const { data } = await axios.get(
    "https://fapi.binance.com/fapi/v1/klines",
    { params: { symbol, interval: tf, limit: 60 } }
  );

  if (!klineCache[symbol]) klineCache[symbol] = {};
  if (!klineCache[symbol][tf]) {
    klineCache[symbol][tf] = data.map(k => Number(k[4]));
  }
}

function checkSignal(symbol, tf) {
  const state = signalsCache?.[symbol]?.[tf];
  const price = priceMap[symbol];

  if (!state || !price || !state.upper || !state.lower) return;

  const prevPrice = state.price || price;

  let signal = "WAIT";
  let strength = 0;

  const nearLower = price <= state.lower * 1.002;
  const nearUpper = price >= state.upper * 0.998;

  const bounceUp = price > prevPrice;
  const bounceDown = price < prevPrice;

  /* ===== LONG ===== */
  if (nearLower && bounceUp) {
    if (state.rsi < 35) strength += 2;
    if (state.rsi < 25) strength += 2;
    if (price > state.mid) strength += 1;

    if (strength >= 2) signal = "LONG";
  }

  /* ===== SHORT ===== */
  if (nearUpper && bounceDown) {
    if (state.rsi > 65) strength += 2;
    if (state.rsi > 75) strength += 2;
    if (price < state.mid) strength += 1;

    if (strength >= 2) signal = "SHORT";
  }

  const isNewSignal =
    state.lastSignal !== signal && signal !== "WAIT";

  if (isNewSignal) {
    const trade = calcTrade(
      price,
      state.upper,
      state.lower,
      state.mid,
      state.atr,
      tf,
      signal
    );

    if (trade.entry) {
      pushSignal({
        symbol,
        interval: tf,
        signal,
        strength,
        price,
        rsi: Number(state.rsi.toFixed(2)),
        ...trade,
      });

      saveHistory({
        symbol,
        interval: tf,
        signal,
        strength,
        entry: trade.entry,
        tp: trade.tp,
        sl: trade.sl,
        rsi: Number(state.rsi.toFixed(2)),
        price,
      });
    }
  }

  signalsCache[symbol][tf] = {
    ...state,
    price,
    signal,
    strength,
    lastSignal: signal,
    time: Date.now(),
  };

  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
}



function subscribeKline(symbol, tf) {
  const stream = `${symbol.toLowerCase()}@kline_${tf}`;
  const ws = new WebSocket(`wss://fstream.binance.com/ws/${stream}`);

  if (!klineCache[symbol]) klineCache[symbol] = {};
  if (!klineCache[symbol][tf]) klineCache[symbol][tf] = [];

  ws.on("message", (msg) => {
    const k = JSON.parse(msg).k;

    const arr = klineCache[symbol][tf];

    // ⭐ LẤY CẢ NẾN CHƯA ĐÓNG để preload cực nhanh
    arr.push(Number(k.c));
    if (arr.length > 200) arr.shift();

    if (arr.length < 50) return;

    const rsi = RSI.calculate({ values: arr, period: 14 }).at(-1);
    const hlc3Arr = arr;

    const nw = nadarayaWatsonLux(hlc3Arr, 8, 60);
    const { upper, lower } = envelopeLux(nw, hlc3Arr, 60, 2);

    const up = upper.at(-1);
    const lo = lower.at(-1);
    const mid = nw.at(-1);

    const atr =
      arr.slice(-15).reduce((a, b, i, ar) =>
        i === 0 ? 0 : a + Math.abs(b - ar[i - 1]), 0
      ) / 14;

    if (!signalsCache[symbol]) signalsCache[symbol] = {};
    if (!signalsCache[symbol][tf]) {
      signalsCache[symbol][tf] = { lastSignal: "WAIT" };
    }

    signalsCache[symbol][tf] = {
      ...signalsCache[symbol][tf],
      rsi,
      upper: up,
      lower: lo,
      mid,
      atr,
    };

    checkSignal(symbol, tf);
  });

  ws.on("close", () =>
    setTimeout(() => subscribeKline(symbol, tf), 2000)
  );
}



function subscribePrice(symbol) {
  const ws = new WebSocket(
    `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@markPrice`
  );

ws.on("message", (msg) => {
  const data = JSON.parse(msg);
  const price = Number(data.p);

  priceMap[symbol] = price;

  if (!signalsCache[symbol]) return;

  for (const tf of INTERVALS) {
    if (!signalsCache[symbol][tf]) continue;
    signalsCache[symbol][tf].price = price;
  }
});

  ws.on("close", () =>
    setTimeout(() => subscribePrice(symbol), 2000)
  );
}

/* ================= INIT SYMBOL ================= */

async function initSymbol(symbol) {
  if (!signalsCache[symbol]) signalsCache[symbol] = {};
  if (!klineCache[symbol]) klineCache[symbol] = {};

  subscribePrice(symbol);

  for (const tf of INTERVALS) {
    signalsCache[symbol][tf] = {
      symbol,
      interval: tf,
      signal: "WAIT",
      price: 0,
      rsi: 0,
      entry: null,
      tp: null,
      sl: null,
      time: Date.now(),
    };

    subscribeKline(symbol, tf);
  }

  console.log("✅ Init symbol:", symbol);
}


/* ================= LOOP ================= */

setInterval(() => {
  for (const symbol in signalsCache) {
    for (const tf of INTERVALS) {
      checkSignal(symbol, tf);
    }
  }
}, 1000);

startPriceStream();

module.exports = { initSymbol, signalsCache };
