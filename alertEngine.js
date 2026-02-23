const axios = require("axios");
const fs = require("fs");
const WebSocket = require("ws");
const { RSI } = require("technicalindicators");
const { pushSignal } = require("./notifier");
const { saveHistory } = require("./saveHistory");
const { nadarayaWatsonLux, envelopeLux } = require("./indicator");

const INTERVALS = ["15m", "1h", "2h", "4h", "1d"];

const signalsCache = fs.existsSync("signals.json")
  ? JSON.parse(fs.readFileSync("signals.json"))
  : {};

const priceMap = {};
const klineCache = {};

/* ================= PRICE STREAM ================= */

function startPriceStream() {
  const ws = new WebSocket("wss://fstream.binance.com/ws/!markPrice@arr");

  ws.on("message", msg => {
    JSON.parse(msg).forEach(p => {
      priceMap[p.s] = Number(p.p);
    });
  });

  ws.on("close", () => setTimeout(startPriceStream, 2000));
}

/* ================= TRADE CALC ================= */

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
  if (!atr || !up || !lo || !mid) return {};

  const k = atrMultiplier(tf);

  if (signal === "LONG") {
    const sl = lo - atr * k;
    const tp = mid;
    const rr = (tp - price) / (price - sl);

    return { entry: price, tp, sl, rr: rr.toFixed(2) };
  }

  if (signal === "SHORT") {
    const sl = up + atr * k;
    const tp = mid;
    const rr = (price - tp) / (sl - price);

    return { entry: price, tp, sl, rr: rr.toFixed(2) };
  }

  return {};
}

/* ================= SIGNAL LOGIC ================= */

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

  const isNewSignal = signal !== "WAIT" && state.lastSignal !== signal;

  let trade = {};

  if (isNewSignal) {
    trade = calcTrade(
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
        rsi: state.rsi.toFixed(2),
        ...trade,
      });

      saveHistory({
        symbol,
        interval: tf,
        signal,
        strength,
        price,
        rsi: state.rsi.toFixed(2),
        ...trade,
      });
    }
  }

  signalsCache[symbol][tf] = {
    ...state,
    price,
    signal,
    strength,
    entry: trade.entry ?? state.entry ?? null,
    tp: trade.tp ?? state.tp ?? null,
    sl: trade.sl ?? state.sl ?? null,
    lastSignal: signal,
    time: Date.now(),
  };

  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
}

/* ================= KLINE STREAM ================= */

function subscribeKline(symbol, tf) {
  const stream = `${symbol.toLowerCase()}@kline_${tf}`;
  const ws = new WebSocket(`wss://fstream.binance.com/ws/${stream}`);

  if (!klineCache[symbol]) klineCache[symbol] = {};
  if (!klineCache[symbol][tf]) klineCache[symbol][tf] = [];

  ws.on("message", msg => {
    const k = JSON.parse(msg).k;

    if (!k.x) return; // chỉ dùng nến đóng

    const close = Number(k.c);
    const high = Number(k.h);
    const low = Number(k.l);

    const hlc3 = (high + low + close) / 3;

    const arr = klineCache[symbol][tf];
    arr.push(hlc3);
    if (arr.length > 200) arr.shift();
    if (arr.length < 60) return;

    const rsi = RSI.calculate({ values: arr, period: 14 }).at(-1);

    const nw = nadarayaWatsonLux(arr, 8, 60);
    const { upper, lower } = envelopeLux(nw, arr, 60, 2);

    const atr =
      arr.slice(-15).reduce((a, b, i, ar) =>
        i === 0 ? 0 : a + Math.abs(b - ar[i - 1]), 0
      ) / 14;

    if (!signalsCache[symbol]) signalsCache[symbol] = {};
    if (!signalsCache[symbol][tf])
      signalsCache[symbol][tf] = { lastSignal: "WAIT" };

    signalsCache[symbol][tf] = {
      ...signalsCache[symbol][tf],
      rsi,
      upper: upper.at(-1),
      lower: lower.at(-1),
      mid: nw.at(-1),
      atr,
    };

    checkSignal(symbol, tf);
  });

  ws.on("close", () => setTimeout(() => subscribeKline(symbol, tf), 2000));
}

/* ================= INIT ================= */

async function initSymbol(symbol) {
  if (!signalsCache[symbol]) signalsCache[symbol] = {};

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
      lastSignal: "WAIT",
    };

    subscribeKline(symbol, tf);
  }

  console.log("✅ Init:", symbol);
}

/* ================= LOOP ================= */

setInterval(() => {
  for (const symbol in signalsCache) {
    for (const tf of INTERVALS) {
      checkSignal(symbol, tf);
    }
  }
}, 1500);

startPriceStream();

module.exports = { initSymbol, signalsCache };
