const axios = require("axios");
const { RSI, ATR } = require("technicalindicators");
const fs = require("fs");
const { pushSignal } = require("./notifier");

const signalsCache = {};
const INTERVALS = ["15m", "1h", "2h", "4h", "1d"];

// ================= FAVORITES =================
function getFavorites() {
  try {
    const favs = JSON.parse(fs.readFileSync("favorites.json"));
    return favs.length ? favs : ["BTCUSDT", "ETHUSDT"];
  } catch {
    return ["BTCUSDT", "ETHUSDT"];
  }
}

// ================= KLINES =================
async function getKlines(symbol, interval, limit = 300) {
  const { data } = await axios.get(
    `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );

  return data.map(k => ({
    time: k[0],
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
  }));
}

// ================= ATR =================
function calcATR(klines) {
  const highs = klines.map(k => k.high);
  const lows = klines.map(k => k.low);
  const closes = klines.map(k => k.close);

  const arr = ATR.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
  });

  return arr.length ? arr.at(-1) : 0;
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

// ================= TRADE =================
function calcTrade(price, up, lo, mid, atr, tf, signal) {
  if (!atr || !up || !lo || !mid) {
    return { entry: null, tp: null, sl: null, rr: null };
  }

  const k = atrMultiplier(tf);

  if (signal === "LONG") {
    const sl = lo - atr * k;
    const tp = mid;
    const rr = (tp - price) / (price - sl);

    return { entry: price, tp, sl, rr: Number(rr.toFixed(2)) };
  }

  if (signal === "SHORT") {
    const sl = up + atr * k;
    const tp = mid;
    const rr = (price - tp) / (sl - price);

    return { entry: price, tp, sl, rr: Number(rr.toFixed(2)) };
  }

  return { entry: null, tp: null, sl: null, rr: null };
}

// ================= PRICE =================
async function getLivePrice(symbol) {
  const { data } = await axios.get(
    `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
  );
  return Number(data.price);
}

// ================= CORE =================
async function processSymbol(symbol) {
  if (!signalsCache[symbol]) signalsCache[symbol] = {};

  const livePrice = await getLivePrice(symbol);

  for (const tf of INTERVALS) {
    try {
      const klines = await getKlines(symbol, tf);

      // bỏ nến đang chạy
      const closed = klines.slice(0, -1);
      const closes = closed.map(k => k.close);
      const lastClosedTime = closed.at(-1).time;

      // nếu nến chưa đổi → chỉ update giá
      if (
        signalsCache[symbol][tf] &&
        signalsCache[symbol][tf].lastClosedTime === lastClosedTime
      ) {
        signalsCache[symbol][tf].price = livePrice;
        continue;
      }

      const rsi = RSI.calculate({ values: closes, period: 14 }).at(-1);

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
      }else{
         await pushSignal(signalsCache[symbol][tf]);
        console.log("No change test push:", symbol, tf, signal, prev);
      }
    } catch (e) {
      console.log("Error", symbol, tf, e.message);
    }
  }
}

// ================= LOOP =================
async function loop() {
  const favs = getFavorites();

  for (const s of favs) {
    await processSymbol(s);
  }

  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
  setTimeout(loop, 60 * 1000);
}

// ================= SCAN NOW =================
async function scanNow(symbol) {
  await processSymbol(symbol);
  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
}

module.exports = { signalsCache, scanNow };
