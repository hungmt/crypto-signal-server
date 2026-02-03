
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { RSI, EMA } = require("technicalindicators");

const app = express();
app.use(cors());


// ===== Nadaraya-Watson =====
function nadarayaWatson(prices, bandwidth = 8) {
  const n = prices.length;
  const result = [];

  for (let i = 0; i < n; i++) {
    let num = 0;
    let den = 0;

    for (let j = 0; j < n; j++) {
      const w = Math.exp(-Math.pow(i - j, 2) / (2 * bandwidth * bandwidth));
      num += w * prices[j];
      den += w;
    }

    result.push(num / den);
  }

  return result;
}

// ===== Lấy data từ Binance =====
async function getKlines(symbol, interval = "15m", limit = 120) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  const { data } = await axios.get(url);

  return data.map(k => ({
    time: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}


function gaussian(x, h) {
  return Math.exp(-(x * x) / (2 * h * h));
}

function nadarayaWatson(values, h = 8, window = 60) {
  const result = [];

  for (let i = 0; i < values.length; i++) {
    let num = 0;
    let den = 0;

    const start = Math.max(0, i - window);

    for (let j = start; j <= i; j++) {
      const w = Math.exp(-((i - j) ** 2) / (2 * h * h));
      num += values[j] * w;
      den += w;
    }

    result.push(num / den);
  }

  return result;
}

function envelope(nw, values, mult = 2) {
  const dev = [];

  for (let i = 0; i < values.length; i++) {
    dev.push(Math.abs(values[i] - nw[i]));
  }

  const avgDev = dev.reduce((a, b) => a + b, 0) / dev.length;

  return {
    upper: nw.map(v => v + avgDev * mult),
    lower: nw.map(v => v - avgDev * mult),
  };
}


app.get("/symbols", async (req, res) => {
  const { data } = await axios.get(
    "https://api.binance.com/api/v3/exchangeInfo"
  );

  const symbols = data.symbols
    .filter(
      s =>
        s.status === "TRADING" &&
        s.quoteAsset === "USDT" &&
        s.symbol.endsWith("USDT")
    )
    .map(s => s.symbol);

  res.json(symbols);
});
app.get("/signal", async (req, res) => {
  try {
    const { symbol, interval } = req.query;

    const klines = await getKlines(symbol, interval, 300);
    const closes = klines.map(k => k.close);

    // RSI
    const rsi = RSI.calculate({ values: closes, period: 14 }).slice(-1)[0];

    // NWE
    const nw = nadarayaWatson(closes, 8);
    const { upper, lower } = envelope(nw, closes, 2);

    const lastClose = closes[closes.length - 1];
    const lastUpper = upper[upper.length - 1];
    const lastLower = lower[lower.length - 1];

    let signal = "WAIT";

    // Logic giống LuxAlgo
    if (lastClose < lastLower && rsi < 35) signal = "LONG";
    else if (lastClose > lastUpper && rsi > 65) signal = "SHORT";

    res.json({
      symbol,
      interval: interval || "15m",
      rsi: rsi.toFixed(2),
      price: lastClose,
      upper: lastUpper,
      lower: lastLower,
      signal,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on " + PORT));

//app.listen(3000, () => console.log("Signal server running on 3000"));
