const fs = require("fs");
const WebSocket = require("ws");
const { RSI } = require("technicalindicators");
const { pushSignal } = require("./notifier");
const { saveHistory } = require("./saveHistory");
const { nadarayaWatsonLux, envelopeLux } = require("./indicator");

const INTERVALS = ["15m", "1h", "2h", "4h", "1d"];

/* ================= LOAD CACHE ================= */

const signalsCache = fs.existsSync("signals.json")
  ? JSON.parse(fs.readFileSync("signals.json"))
  : {};

const priceMap = {};
const klineCache = {};

/* ================= SIGNAL STRENGTH ================= */

function getSignalStrength(signal, rsi, price, upper, lower, mid) {
  let score = 0;

  // độ lệch khỏi envelope
  const distance =
    signal === "LONG"
      ? (lower - price) / lower
      : (price - upper) / upper;

  if (distance > 0.002) score++;
  if (distance > 0.004) score++;

  // RSI cực đoan
  if (signal === "LONG" && rsi < 25) score++;
  if (signal === "SHORT" && rsi > 75) score++;

  // RSI cực mạnh
  if (signal === "LONG" && rsi < 15) score++;
  if (signal === "SHORT" && rsi > 85) score++;

  // vị trí so với mid (trend confirmation)
  if (signal === "LONG" && price < mid) score++;
  if (signal === "SHORT" && price > mid) score++;

  if (score >= 4) return "EXTREME";
  if (score >= 3) return "STRONG";
  if (score >= 2) return "NORMAL";
  return "WEAK";
}

/* ================= ATR ================= */

function calcATR(arr) {
  return (
    arr.slice(-15).reduce((a, b, i, ar) =>
      i === 0 ? 0 : a + Math.abs(b - ar[i - 1]), 0
    ) / 14
  );
}

/* ================= TRADE ================= */

function calcTrade(price, up, lo, mid, atr, signal) {
  if (!atr) return {};

  if (signal === "LONG") {
    const sl = lo - atr * 1.5;
    const tp = mid;
    const rr = (tp - price) / (price - sl);
    return { entry: price, tp, sl, rr: Number(rr.toFixed(2)) };
  }

  if (signal === "SHORT") {
    const sl = up + atr * 1.5;
    const tp = mid;
    const rr = (price - tp) / (sl - price);
    return { entry: price, tp, sl, rr: Number(rr.toFixed(2)) };
  }

  return {};
}

/* ================= SIGNAL CHECK ================= */

function checkSignal(symbol, tf) {
  const c = signalsCache?.[symbol]?.[tf];
  const price = priceMap[symbol];
  if (!c || !price || c.rsi == null) return;

  const prev = signalsCache[symbol][tf];
  let signal = "WAIT";

  // ===== SIGNAL CONDITIONS =====
  if (price <= c.lower && c.rsi < 40 && price > prev.price) {
    signal = "LONG";
  }

  if (price >= c.upper && c.rsi > 60 && price < prev.price) {
    signal = "SHORT";
  }

  if (signal === "WAIT") return;

  const strength = getSignalStrength(
    signal,
    c.rsi,
    price,
    c.upper,
    c.lower,
    c.mid
  );

  // ❗ bỏ tín hiệu yếu
  if (strength === "WEAK") return;

  const isNew =
    signal !== prev.lastSignal;

  if (!isNew) return;

  const trade = calcTrade(price, c.upper, c.lower, c.mid, c.atr, signal);

  console.log(
    `🚨 ${symbol} ${tf} ${signal} | RSI ${c.rsi.toFixed(1)} | ${strength}`
  );

  pushSignal({
    symbol,
    interval: tf,
    signal,
    price,
    rsi: Number(c.rsi.toFixed(2)),
    strength,
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
    rsi: Number(c.rsi.toFixed(2)),
    price,
  });

  signalsCache[symbol][tf] = {
    ...c,
    signal,
    lastSignal: signal,
    strength,
    price,
    time: Date.now(),
    ...trade,
  };

  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
}

/* ================= KLINE STREAM ================= */

function subscribeKline(symbol, tf) {
  const ws = new WebSocket(
    `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${tf}`
  );

  if (!klineCache[symbol]) klineCache[symbol] = {};
  klineCache[symbol][tf] = [];

  ws.on("message", msg => {
    const k = JSON.parse(msg).k;
    const arr = klineCache[symbol][tf];

    arr.push(Number(k.c));
    if (arr.length > 200) arr.shift();
    if (arr.length < 60) return;

    const rsi = RSI.calculate({ values: arr, period: 14 }).at(-1);

    const nw = nadarayaWatsonLux(arr, 8, 60);
    const { upper, lower } = envelopeLux(nw, arr, 60, 2);

    const mid = nw.at(-1);
    const up = upper.at(-1);
    const lo = lower.at(-1);

    const atr = calcATR(arr);

    if (!signalsCache[symbol]) signalsCache[symbol] = {};
    if (!signalsCache[symbol][tf])
      signalsCache[symbol][tf] = { lastSignal: "WAIT" };

    signalsCache[symbol][tf] = {
      ...signalsCache[symbol][tf],
      rsi,
      upper: up,
      lower: lo,
      mid,
      atr,
    };

    if (k.x) checkSignal(symbol, tf);
  });

  ws.on("close", () =>
    setTimeout(() => subscribeKline(symbol, tf), 2000)
  );
}

/* ================= PRICE ================= */

function subscribePrice(symbol) {
  const ws = new WebSocket(
    `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@markPrice`
  );

  ws.on("message", msg => {
    priceMap[symbol] = Number(JSON.parse(msg).p);
  });

  ws.on("close", () =>
    setTimeout(() => subscribePrice(symbol), 2000)
  );
}

/* ================= INIT ================= */

function initSymbol(symbol) {
  if (!signalsCache[symbol]) signalsCache[symbol] = {};

  subscribePrice(symbol);

  for (const tf of INTERVALS) {
    signalsCache[symbol][tf] = {
      symbol,
      interval: tf,
      signal: "WAIT",
      lastSignal: "WAIT",
      price: 0,
      rsi: 0,
      time: Date.now(),
    };

    subscribeKline(symbol, tf);
  }

  console.log("✅ Init:", symbol);
}

module.exports = { initSymbol, signalsCache };
