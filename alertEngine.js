// alertEngine.js
const axios = require("axios");
const fs = require("fs");
const WebSocket = require("ws");
const { RSI } = require("technicalindicators");
const { pushSignal } = require("./notifier");
const { saveHistory } = require("./saveHistory");

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
function subscribeKline(symbol, tf) {
  const stream = `${symbol.toLowerCase()}@kline_${tf}`;
  const ws = new WebSocket(`wss://fstream.binance.com/ws/${stream}`);

  ws.on("message", (msg) => {
    const k = JSON.parse(msg).k;
    if (!k.x) return; // chỉ khi nến đóng

    if (!klineCache[symbol]) klineCache[symbol] = {};
    if (!klineCache[symbol][tf]) klineCache[symbol][tf] = [];

    const arr = klineCache[symbol][tf];

    arr.push(Number(k.c));
    if (arr.length > 200) arr.shift();

    if (arr.length < 50) return;

    const rsi = RSI.calculate({ values: arr, period: 14 }).at(-1);

    const max = Math.max(...arr.slice(-50));
    const min = Math.min(...arr.slice(-50));

    if (!indicatorCache[symbol]) indicatorCache[symbol] = {};
    indicatorCache[symbol][tf] = {
      rsi,
      upper: max,
      lower: min,
    };

    checkSignal(symbol, tf); // hàm bạn đang có
  });

  ws.on("close", () =>
    setTimeout(() => subscribeKline(symbol, tf), 2000)
  );
}

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

function checkSignal(symbol, tf) {
  const price = priceMap[symbol];
  const c = indicatorCache?.[symbol]?.[tf];
  if (!price || !c) return;

  if (!signalsCache[symbol]) signalsCache[symbol] = {};
  if (!signalsCache[symbol][tf]) {
    signalsCache[symbol][tf] = { lastSignal: "WAIT" };
  }

  const prev = signalsCache[symbol][tf];
  let signal = "WAIT";

  // ⭐ ĐIỀU KIỆN QUAN TRỌNG BỊ THIẾU
  if (
    price < c.lower &&
    c.lower < c.mid &&
    c.rsi < 35
  ) {
    signal = "LONG";
  }
  else if (
    price > c.upper &&
    c.upper > c.mid &&
    c.rsi > 65
  ) {
    signal = "SHORT";
  }

  const isNewSignal =
    prev.lastSignal === "WAIT" && signal !== "WAIT";

  let trade = {
    entry: prev.entry,
    tp: prev.tp,
    sl: prev.sl,
    rr: prev.rr,
  };

  if (isNewSignal) {
    trade = calcTrade(price, c.upper, c.lower, c.mid, c.atr, tf, signal);

    if (trade.entry) {
      pushSignal({
        symbol,
        interval: tf,
        signal,
        price,
        rsi: Number(c.rsi.toFixed(2)),
        ...trade,
      });
      saveHistory({
        symbol,
        interval: tf,
        signal,
        entry,
        tp,
        sl,
        rsi: Number(c.rsi.toFixed(2)),
        price,
      });
    }
  }

  signalsCache[symbol][tf] = {
    symbol,
    interval: tf,
    price,
    rsi: Number(c.rsi.toFixed(2)),
    lower: c.lower,
    upper: c.upper,
    mid: c.mid,
    signal,
    lastSignal: signal,
    time: Date.now(),
    ...trade,
  };

  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
}

function subscribePrice(symbol) {
  const ws = new WebSocket(
    `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@markPrice`
  );

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    priceMap[symbol] = Number(data.p);
  });

  ws.on("close", () =>
    setTimeout(() => subscribePrice(symbol), 2000)
  );
}
/* ================= INIT SYMBOL ================= */

async function initSymbol(symbol) {
  if (!signalsCache[symbol]) signalsCache[symbol] = {};

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
