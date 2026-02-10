const axios = require("axios");
const { RSI, ATR } = require("technicalindicators");
const fs = require("fs");
const { pushSignal } = require("./notifier");

const INTERVALS = ["15m", "1h", "2h", "4h", "1d"];

const signalsCache = {};
const lastPushedSignal = {};
const indicatorCache = {};
const lastIndicatorBucket = {};

let priceMap = {};

// ================= FAVORITES =================
function getFavorites() {
  try {
    const favs = JSON.parse(fs.readFileSync("favorites.json"));
    return favs.length ? favs : ["BTCUSDT", "ETHUSDT"];
  } catch {
    return ["BTCUSDT", "ETHUSDT"];
  }
}

// ================= LOAD ALL PRICES (1 REQUEST) =================
async function loadAllPrices() {
  const { data } = await axios.get(
    "https://api.binance.com/api/v3/ticker/price"
  );
  for (const p of data) {
    priceMap[p.symbol] = Number(p.price);
  }
}

// ================= CHECK NEW CLOSED CANDLE (PER TF) =================
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

// ================= KLINES =================
async function getKlines(symbol, interval, limit = 300) {
  const { data } = await axios.get(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );

  return data.map(k => ({
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
  }));
}

// ================= ATR =================
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

// ================= NW ENVELOPE =================
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

// ================= UPDATE INDICATORS (ONLY WHEN NEW CANDLE) =================
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

// ================= CALC TRADE =================
function calcTrade(price, up, lo, mid, atr, tf, signal) {
  if (!atr) return {};

  const k = atrMultiplier(tf);

  if (signal === "LONG") {
    return {
      entry: price,
      tp: mid,
      sl: lo - atr * k,
    };
  }

  if (signal === "SHORT") {
    return {
      entry: price,
      tp: mid,
      sl: up + atr * k,
    };
  }

  return {};
}

// ================= CHECK SIGNAL REALTIME =================
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

// ================= SCAN NOW (CRON EACH MINUTE) =================
async function scanNow() {
  await loadAllPrices(); // 1 request

  const favs = getFavorites();

  for (const tf of INTERVALS) {
    const needUpdate = hasNewClosedCandle(tf);

    for (const symbol of favs) {
      try {
        if (!signalsCache[symbol]) signalsCache[symbol] = {};

        if (needUpdate) {
          await updateIndicators(symbol, tf);
        }

        const price = priceMap[symbol];
        checkSignalLive(symbol, tf, price);

        // ===== PUSH ONLY WHEN STATE CHANGES =====
        const key = `${symbol}_${tf}`;
        const curr = signalsCache[symbol][tf]?.signal || "WAIT";
        const prev = lastPushedSignal[key] || "WAIT";

        if (curr !== prev) {
          lastPushedSignal[key] = curr;

          if (curr !== "WAIT") {
            await pushSignal(signalsCache[symbol][tf]);
            console.log("🚨 PUSH", symbol, tf, curr);
          }
        }
      } catch (e) {
        console.log("Error", symbol, tf, e.message);
      }
    }
  }

  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
}

module.exports = { scanNow, signalsCache };
