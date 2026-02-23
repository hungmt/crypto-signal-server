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
  return arr.slice(-15).reduce((a, b, i, ar) =>
    i === 0 ? 0 : a + Math.abs(b - ar[i - 1]), 0) / 14;
}
function tfMultiplier(tf) {
  return {
    "15m": { tp: 1, sl: 1 },
    "1h":  { tp: 1.4, sl: 1.1 },
    "4h":  { tp: 2.2, sl: 1.3 },
    "1d":  { tp: 3.5, sl: 1.6 }
  }[tf] || { tp: 1, sl: 1 };
}


/* ================= TRADE LEVELS ================= */
function calcTrade({ price, lower, upper, signal, tf }) {
  if (!price || !lower || !upper) return null;

  // ===== LONG =====
 const mult = tfMultiplier(tf);

  // ===== LONG =====
  if (signal === "LONG") {

    const fallingKnife = price < lower;

    // SAFE LONG
    if (!fallingKnife) {
      const entry = lower * 1.002;

      const sl = entry * (1 - 0.01 * mult.sl);
      const tp = entry * (1 + 0.02 * mult.tp);

      return {
        entry,
        tp,
        sl,
        rr: (tp - entry) / (entry - sl),
        mode: "SAFE",
        risk: "LOW"
      };
    }

    // FALLING KNIFE (HIGH RISK giữ nguyên)
    const entry = price;
    const sl = entry * (1 - 0.015 * mult.sl);
    const tp = lower;

    return {
      entry,
      tp,
      sl,
      rr: (tp - entry) / (entry - sl),
      mode: "FALLING_KNIFE",
      risk: "HIGH"
    };
  }

  // ===== SHORT =====
 if (signal === "SHORT") {

    const overPump = price > upper;

    // SAFE SHORT
    if (!overPump) {
      const entry = upper * 0.998;

      const sl = entry * (1 + 0.01 * mult.sl);
      const tp = entry * (1 - 0.02 * mult.tp);

      return {
        entry,
        tp,
        sl,
        rr: (entry - tp) / (sl - entry),
        mode: "SAFE",
        risk: "LOW"
      };
    }

    // FOMO SHORT (HIGH RISK giữ nguyên)
    const entry = price;
    const sl = entry * (1 + 0.015 * mult.sl);
    const tp = upper;

    return {
      entry,
      tp,
      sl,
      rr: (entry - tp) / (sl - entry),
      mode: "FOMO",
      risk: "HIGH"
    };
  }

  return null;

}

module.exports = calcTrade;



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
  /* ===== TRADE LEVELS REALTIME ===== */
/* ===== TRADE LEVELS REALTIME ===== */
const trade = calcTrade({
  price,
  lower: state.lower,
  upper: state.upper,
  signal,
  tf
}) || {};

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
  entry: trade.entry || null,
  tp: trade.tp || null,
  sl: trade.sl || null,
  rr: trade.rr || null,
  mode: trade.mode || null,
  risk: trade.risk || null,
  lastSignal: signal,
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
