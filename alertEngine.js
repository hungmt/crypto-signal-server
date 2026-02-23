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

function calcATR(arr) {
  return arr.slice(-15).reduce((a,b,i,ar)=>
    i===0?0:a+Math.abs(b-ar[i-1]),0)/14;
}

function checkSignal(symbol, tf) {
  const state = signalsCache?.[symbol]?.[tf];
  const price = priceMap[symbol];

  if (!state || !price || !state.upper) return;

  let signal = "WAIT";
  let strength = 0;

  const nearLower = price <= state.lower * 1.002;
  const nearUpper = price >= state.upper * 0.998;

  if (nearLower && state.rsi < 35) {
    strength += 2;
    if (state.rsi < 25) strength += 2;
    signal = "LONG";
  }

  if (nearUpper && state.rsi > 65) {
    strength += 2;
    if (state.rsi > 75) strength += 2;
    signal = "SHORT";
  }

  const isNew = signal !== "WAIT" && signal !== state.lastSignal;

  if (isNew) {
    pushSignal({
      symbol,
      interval: tf,
      signal,
      strength,
      price,
      rsi: state.rsi.toFixed(2)
    });

    saveHistory({
      symbol,
      interval: tf,
      signal,
      strength,
      price,
      rsi: state.rsi
    });
  }

  signalsCache[symbol][tf] = {
    ...state,
    price,
    signal,
    strength,
    lastSignal: signal,
    time: Date.now()
  };

  fs.writeFileSync("signals.json", JSON.stringify(signalsCache));
}

function subscribeKline(symbol, tf) {
  const ws = new WebSocket(
    `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${tf}`
  );

  if (!klineCache[symbol]) klineCache[symbol] = {};
  klineCache[symbol][tf] = [];

  ws.on("message", msg => {
    const k = JSON.parse(msg).k;
    if (!k.x) return; // chỉ lấy nến đóng

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

async function initSymbol(symbol) {
  if (!signalsCache[symbol]) signalsCache[symbol] = {};

  for (const tf of INTERVALS) {
    if (!signalsCache[symbol][tf]) {
      signalsCache[symbol][tf] = {
        symbol,
        interval: tf,
        signal: "WAIT",
        lastSignal: "WAIT"
      };
    }

    subscribeKline(symbol, tf);
  }

  console.log("✅ Running:", symbol);
}

setInterval(() => {
  for (const s in signalsCache)
    for (const tf of INTERVALS)
      checkSignal(s, tf);
}, 1500);

startPriceStream();

module.exports = { initSymbol, signalsCache };
