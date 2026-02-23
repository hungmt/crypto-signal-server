const axios = require("axios");
const fs = require("fs");
const WebSocket = require("ws");
const { RSI } = require("technicalindicators");
const { pushSignal } = require("./notifier");
const { saveHistory } = require("./saveHistory");
const { nadarayaWatsonLux, envelopeLux } = require("./indicator");

const INTERVALS = ["15m", "1h", "4h", "1d"];

const signalsCache = fs.existsSync("signals.json")
  ? JSON.parse(fs.readFileSync("signals.json"))
  : {};

const priceMap = {};
const klineCache = {};

function startPriceStream() {
  const ws = new WebSocket("wss://fstream.binance.com/ws/!markPrice@arr");

  ws.on("message", msg => {
    JSON.parse(msg).forEach(p => {
      priceMap[p.s] = Number(p.p);
    });
  });

  ws.on("close", () => setTimeout(startPriceStream, 2000));
}

/* ================= ATR ================= */
function calcATR(arr) {
  return arr.slice(-15).reduce((a,b,i,ar)=>
    i===0?0:a+Math.abs(b-ar[i-1]),0)/14;
}

/* ================= TRADE LEVELS ================= */
function calcTrade(price, upper, lower, mid, atr, signal) {
  if (!price || !upper || !lower || !mid || !atr) {
    return { entry:null, tp:null, sl:null, rr:null };
  }

  if (signal === "LONG") {
    const sl = lower - atr * 1.5;
    const tp = mid;
    const rr = (tp - price) / (price - sl);

    return {
      entry: price,
      tp,
      sl,
      rr: Number(rr.toFixed(2))
    };
  }

  if (signal === "SHORT") {
    const sl = upper + atr * 1.5;
    const tp = mid;
    const rr = (price - tp) / (sl - price);

    return {
      entry: price,
      tp,
      sl,
      rr: Number(rr.toFixed(2))
    };
  }

  return { entry:null, tp:null, sl:null, rr:null };
}

/* ================= SIGNAL ENGINE ================= */
function checkSignal(symbol, tf) {
  const state = signalsCache?.[symbol]?.[tf];
  const price = priceMap[symbol];

  if (!state || !price || !state.upper) return;

  let signal = "WAIT";
  let strength = 0;

  const nearLower = price <= state.lower * 1.002;
  const nearUpper = price >= state.upper * 0.998;

  /* ===== LONG ===== */
  if (nearLower && state.rsi < 35) {
    strength += 2;
    if (state.rsi < 25) strength += 2;
    if (price > state.mid) strength += 1;
    signal = "LONG";
  }

  /* ===== SHORT ===== */
  if (nearUpper && state.rsi > 65) {
    strength += 2;
    if (state.rsi > 75) strength += 2;
    if (price < state.mid) strength += 1;
    signal = "SHORT";
  }

  /* ===== TRADE LEVELS REALTIME ===== */
  const trade = calcTrade(
    price,
    state.upper,
    state.lower,
    state.mid,
    state.atr,
    signal
  );

  const isNew = signal !== "WAIT" && signal !== state.lastSignal;

  if (isNew && trade.entry) {
    pushSignal({
      symbol,
      interval: tf,
      signal,
      strength,
      price,
      rsi: Number(state.rsi.toFixed(2)),
      ...trade
    });

    saveHistory({
      symbol,
      interval: tf,
      signal,
      strength,
      entry: trade.entry,
      tp: trade.tp,
      sl: trade.sl,
      rsi: state.rsi,
      price
    });
  }

  signalsCache[symbol][tf] = {
    ...state,
    price,
    signal,
    strength,
    lastSignal: signal,
    entry: trade.entry,
    tp: trade.tp,
    sl: trade.sl,
    rr: trade.rr,
    time: Date.now()
  };

  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
}

/* ================= KLINE SUB ================= */
function subscribeKline(symbol, tf) {
  const ws = new WebSocket(
    `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${tf}`
  );

  if (!klineCache[symbol]) klineCache[symbol] = {};
  klineCache[symbol][tf] = [];

  ws.on("message", msg => {
    const k = JSON.parse(msg).k;
    if (!k.x) return; // chỉ nến đóng

    const arr = klineCache[symbol][tf];
    arr.push(Number(k.c));
    if (arr.length > 200) arr.shift();
    if (arr.length < 50) return;

    const rsi = RSI.calculate({ values: arr, period: 14 }).at(-1);

    const nw = nadarayaWatsonLux(arr, 8, 60);
    const { upper, lower } = envelopeLux(nw, arr, 60, 2);
    const mid = nw.at(-1);

    if (!signalsCache[symbol]) signalsCache[symbol] = {};
    if (!signalsCache[symbol][tf]) signalsCache[symbol][tf] = {};

    signalsCache[symbol][tf] = {
      ...signalsCache[symbol][tf],
      rsi,
      upper: upper.at(-1),
      lower: lower.at(-1),
      mid,
      atr: calcATR(arr)
    };

    checkSignal(symbol, tf);
  });

  ws.on("close", () =>
    setTimeout(() => subscribeKline(symbol, tf), 2000)
  );
}

/* ================= INIT ================= */
async function initSymbol(symbol) {
  if (!signalsCache[symbol]) signalsCache[symbol] = {};

  for (const tf of INTERVALS) {
    if (!signalsCache[symbol][tf]) {
      signalsCache[symbol][tf] = {
        symbol,
        interval: tf,
        signal: "WAIT",
        lastSignal: "WAIT",
        price: 0
      };
    }

    subscribeKline(symbol, tf);
  }

  console.log("✅ Running:", symbol);
}

/* ================= LOOP ================= */
setInterval(() => {
  for (const s in signalsCache)
    for (const tf of INTERVALS)
      checkSignal(s, tf);
}, 1500);

startPriceStream();

module.exports = { initSymbol, signalsCache };
