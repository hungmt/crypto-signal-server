const axios = require("axios");
const { RSI, ATR } = require("technicalindicators");
const fs = require("fs");
const { pushSignal } = require("./notifier");

const INTERVALS = ["15m", "1h", "2h", "4h", "1d"];

/* ================= AXIOS SAFE ================= */

const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    "User-Agent": "Mozilla/5.0",
    Accept: "application/json"
  }
});

async function safeGet(url) {
  try {
    return await axiosInstance.get(url);
  } catch (e) {
    if (e.response?.status === 418) {
      console.log("⚠️ Binance 418 → retry");
      await new Promise(r => setTimeout(r, 2000));
      return axiosInstance.get(url);
    }
    throw e;
  }
}

/* ================= CACHE ================= */

const signalsCache = {};
const lastPushedSignal = {};
const indicatorCache = {};
const lastIndicatorBucket = {};
let priceMap = {};

/* ================= FAVORITES ================= */

function getFavorites() {
  try {
    const favs = JSON.parse(fs.readFileSync("favorites.json"));
    return favs.length ? favs : ["BTCUSDT", "ETHUSDT"];
  } catch {
    return ["BTCUSDT", "ETHUSDT"];
  }
}

/* ================= LOAD ALL PRICE ================= */

async function loadAllPrices() {
  const { data } = await safeGet(
    "https://api.binance.com/api/v3/ticker/price"
  );

  for (const p of data) {
    priceMap[p.symbol] = Number(p.price);
  }
}

/* ================= TF BUCKET ================= */

function hasNewClosedCandle(tf) {
  const tfMs = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "2h": 2 * 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
  }[tf];

  const bucket = Math.floor(Date.now() / tfMs);

  if (lastIndicatorBucket[tf] !== bucket) {
    lastIndicatorBucket[tf] = bucket;
    return true;
  }
  return false;
}

/* ================= KLINES ================= */

async function getKlines(symbol, interval, limit = 300) {
  const { data } = await safeGet(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );

  return data.map(k => ({
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
  }));
}

/* ================= ATR ================= */

function calcATR(klines) {
  return ATR.calculate({
    high: klines.map(k => k.high),
    low: klines.map(k => k.low),
    close: klines.map(k => k.close),
    period: 14,
  }).at(-1) || 0;
}

function atrMultiplier(tf) {
  return {
    "15m": 1.2,
    "1h": 1.5,
    "2h": 1.8,
    "4h": 2.2,
    "1d": 3.0,
  }[tf] || 1.5;
}

/* ================= NW ================= */

function nw(values, h = 8, window = 60) {
  const out = [];

  for (let i = 0; i < values.length; i++) {
    let num = 0, den = 0;
    const start = Math.max(0, i - window);

    for (let j = start; j <= i; j++) {
      const w = Math.exp(-((i - j) ** 2) / (2 * h * h));
      num += values[j] * w;
      den += w;
    }

    out.push(num / den);
  }

  return out;
}

function envelope(nwLine, values, mult = 2) {
  const dev = values.map((v, i) => Math.abs(v - nwLine[i]));
  const avg = dev.reduce((a, b) => a + b, 0) / dev.length;

  return {
    upper: nwLine.map(v => v + avg * mult),
    lower: nwLine.map(v => v - avg * mult),
  };
}

/* ================= UPDATE INDICATOR ================= */

async function updateIndicators(symbol, tf) {
  const klines = await getKlines(symbol, tf);
  const closes = klines.slice(0, -1).map(k => k.close);

  const rsi = RSI.calculate({ values: closes, period: 14 }).at(-1);
  const nwLine = nw(closes);
  const { upper, lower } = envelope(nwLine, closes);
  const atr = calcATR(klines);

  if (!indicatorCache[symbol]) indicatorCache[symbol] = {};

  indicatorCache[symbol][tf] = {
    rsi,
    upper: upper.at(-1),
    lower: lower.at(-1),
    mid: nwLine.at(-1),
    atr,
  };
}

/* ================= TRADE ================= */

function calcTrade(price, up, lo, mid, atr, tf, signal) {
  if (!atr) return {};

  const k = atrMultiplier(tf);

  if (signal === "LONG") {
    return { entry: price, tp: mid, sl: lo - atr * k };
  }

  if (signal === "SHORT") {
    return { entry: price, tp: mid, sl: up + atr * k };
  }

  return {};
}

/* ================= SIGNAL ================= */

function checkSignalLive(symbol, tf, price) {
  const c = indicatorCache?.[symbol]?.[tf];
  if (!c) return;

  let signal = "WAIT";

  if (price < c.lower && c.rsi < 35) signal = "LONG";
  else if (price > c.upper && c.rsi > 65) signal = "SHORT";

  const trade = calcTrade(price, c.upper, c.lower, c.mid, c.atr, tf, signal);

  signalsCache[symbol][tf] = {
    symbol,
    interval: tf,
    price,
    rsi: Number(c.rsi.toFixed(2)),
    signal,
    ...trade,
    time: Date.now(),
  };
}

/* ================= SCAN ================= */

async function scanNow() {

  /* ===== ALWAYS UPDATE PRICE ===== */
  await loadAllPrices();

  const favs = getFavorites();
  const minute = new Date().getMinutes();

  for (const symbol of favs) {

    if (!signalsCache[symbol]) signalsCache[symbol] = {};

    const price = priceMap[symbol];

    for (const tf of INTERVALS) {

      try {

        /* ===== SCAN SCHEDULER ===== */
        let shouldScan = false;

        if (tf === "15m") shouldScan = minute % 3 === 0;
        if (tf === "1h")  shouldScan = minute % 5 === 0;
        if (tf === "2h")  shouldScan = minute % 10 === 0;
        if (tf === "4h")  shouldScan = minute % 15 === 0;
        if (tf === "1d")  shouldScan = minute % 30 === 0;

        if (shouldScan && hasNewClosedCandle(tf)) {

          await updateIndicators(symbol, tf);

          /* chống block */
          await new Promise(r =>
            setTimeout(r, 150 + Math.random() * 250)
          );
        }

        /* ===== CHECK SIGNAL ===== */
        checkSignalLive(symbol, tf, price);

      } catch (e) {
        console.log("Error", symbol, tf, e.message);
      }
    }
  }

  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
}

async function warmSymbol(symbol) {

  if (!signalsCache[symbol]) signalsCache[symbol] = {};

  await loadAllPrices();

  for (const tf of INTERVALS) {

    try {

      await updateIndicators(symbol, tf);

      const price = priceMap[symbol];
      checkSignalLive(symbol, tf, price);

      await new Promise(r =>
        setTimeout(r, 200 + Math.random() * 200)
      );

    } catch (e) {
      console.log("Warm symbol error", symbol, tf, e.message);
    }
  }

  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
}

module.exports = { scanNow, signalsCache, warmSymbol };

