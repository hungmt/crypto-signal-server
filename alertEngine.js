const axios = require("axios");
const { RSI, ATR } = require("technicalindicators");
const fs = require("fs");
const { pushSignal } = require("./notifier");

const signalsCache = {};
const INTERVALS = ["15m", "1h", "2h", "4h", "1d"];

function getFavorites() {
  try {
    const favs = JSON.parse(fs.readFileSync("favorites.json"));
    return favs.length ? favs : ["BTCUSDT", "ETHUSDT"];
  } catch {
    return ["BTCUSDT", "ETHUSDT"];
  }
}

// ====== FETCH KLINES ĐÚNG CẤU TRÚC ======
async function getKlines(symbol, interval, limit = 300) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const { data } = await axios.get(url);
  return data; // giữ nguyên structure Binance
}

// ====== ATR ======
function calcATR(klines) {
  const highs = klines.map(k => Number(k[2]));
  const lows = klines.map(k => Number(k[3]));
  const closes = klines.map(k => Number(k[4]));

  const arr = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });

  return arr.length ? arr.at(-1) : 0;
}

function atrMultiplier(tf) {
  if (tf === "15m") return 1.2;
  if (tf === "1h") return 1.5;
  if (tf === "2h") return 1.8;
  if (tf === "4h") return 2.2;
  if (tf === "1d") return 3.0;
  return 1.5;
}

// ====== NW ENVELOPE ======
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

function envelope(nw, values, mult = 2) {
  const dev = values.map((v, i) => Math.abs(v - nw[i]));
  const avg = dev.reduce((a, b) => a + b, 0) / dev.length;

  return {
    upper: nw.map(v => v + avg * mult),
    lower: nw.map(v => v - avg * mult),
  };
}

// ====== TRADE ======
function calcTrade(price, up, lo, mid, atr, tf, signal) {
  const k = atrMultiplier(tf);

  if (!atr || !up || !lo || !mid) {
    return { entry: null, tp: null, sl: null, rr: null };
  }

  if (signal === "LONG") {
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

// ====== PRICE ======
async function getLivePrice(symbol) {
  const { data } = await axios.get(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
  );
  return Number(data.price);
}

// ====== CORE ======
async function processSymbol(symbol) {
  if (!signalsCache[symbol]) signalsCache[symbol] = {};

  const livePrice = await getLivePrice(symbol);

  for (const tf of INTERVALS) {
    try {
      const klines = await getKlines(symbol, tf);

      const closes = klines.map(k => Number(k[4])).slice(0, -1);
      const lastClosedTime = klines[klines.length - 2][0];

      if (
        signalsCache[symbol][tf] &&
        signalsCache[symbol][tf].lastClosedTime === lastClosedTime
      ) {
        signalsCache[symbol][tf].price = livePrice;
        continue;
      }

      const rsi = RSI.calculate({
        values: closes,
        period: 14,
      }).at(-1);

      const nwLine = nw(closes);
      const { upper, lower } = envelope(nwLine, closes);

      const idx = closes.length - 1;
      const up = upper[idx];
      const lo = lower[idx];
      const mid = nwLine[idx];

      let signal = "WAIT";
      if (livePrice < lo && rsi < 35) signal = "LONG";
      else if (livePrice > up && rsi > 65) signal = "SHORT";

      const atr = calcATR(klines);
      const trade = calcTrade(livePrice, up, lo, mid, atr, tf, signal);

      const prev = signalsCache[symbol][tf]?.signal || "WAIT";

      signalsCache[symbol][tf] = {
        symbol,
        interval: tf,
        price: livePrice,
        rsi: Number(rsi.toFixed(2)),
        upper: up,
        lower: lo,
        signal,
        ...trade,
        lastClosedTime,
        time: Date.now(),
      };

      if (signal !== "WAIT" && signal !== prev) {
        await pushSignal(signalsCache[symbol][tf]);
        console.log("🚨", symbol, tf, signal);
      }
    } catch (e) {
      console.log("Error", symbol, tf, e.message);
    }
  }
}

// ====== LOOP ======
async function loop() {
  const favs = getFavorites();

  for (const s of favs) {
    await processSymbol(s);
  }

  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
  setTimeout(loop, 60 * 1000);
}

// ====== SCAN NOW ======
async function scanNow(symbol) {
  if (!signalsCache[symbol]) signalsCache[symbol] = {};
  await processSymbol(symbol);
  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
}

loop();

module.exports = { signalsCache, scanNow };
