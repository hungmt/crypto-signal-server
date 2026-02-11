// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const { signalsCache, initSymbol } = require("./alertEngine");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= KEEP RENDER AWAKE ================= */

const SELF_URL = "http://localhost:3000/health";

app.get("/health", (req, res) => res.send("OK"));

setInterval(() => {
  axios.get(SELF_URL).catch(() => {});
}, 5 * 60 * 1000);

/* ================= SYMBOL CACHE FUTURES ================= */

let SYMBOL_CACHE = [];

async function loadSymbols() {
  try {
    const { data } = await axios.get(
      "https://fapi.binance.com/fapi/v1/exchangeInfo"
    );

    SYMBOL_CACHE = data.symbols
      .filter(
        s =>
          s.status === "TRADING" &&
          s.contractType === "PERPETUAL" &&
          s.quoteAsset === "USDT"
      )
      .map(s => s.symbol);

    console.log("Loaded futures symbols:", SYMBOL_CACHE.length);
  } catch (e) {
    console.log("Load symbols error:", e.message);
  }
}

/* ================= FAVORITES ================= */

function getFavorites() {
  try {
    return JSON.parse(fs.readFileSync("favorites.json"));
  } catch {
    return ["BTCUSDT", "ETHUSDT"];
  }
}

/* ================= ROUTES ================= */

// 🔹 symbols search
app.get("/symbols", (req, res) => {
  const search = (req.query.search || "").toUpperCase();

  if (!search) {
    return res.json(SYMBOL_CACHE.slice(0, 50));
  }

  const result = SYMBOL_CACHE
    .filter(s => s.includes(search))
    .slice(0, 20);

  res.json(result);
});

// 🔹 get favorites
app.get("/favorites", (req, res) => {
  res.json(getFavorites());
});

// 🔹 add favorite
app.post("/favorites", async (req, res) => {
  const { symbol } = req.body;
  const favs = getFavorites();

  if (!favs.includes(symbol) && favs.length < 20) {
    favs.push(symbol);
    fs.writeFileSync("favorites.json", JSON.stringify(favs));
    await initSymbol(symbol);
  }

  res.json(favs);
});

// 🔹 remove favorite
app.delete("/favorites/:symbol", (req, res) => {
  const symbol = req.params.symbol;
  const favs = getFavorites().filter(s => s !== symbol);
  fs.writeFileSync("favorites.json", JSON.stringify(favs));

  delete signalsCache[symbol];

  res.json(favs);
});

// 🔹 get signals theo timeframe
app.get("/signals", (req, res) => {
  const { interval } = req.query;
  const out = {};

  for (const s in signalsCache) {
    if (signalsCache[s][interval]) {
      out[s] = signalsCache[s][interval];
    }
  }

  res.json(out);
});

/* ================= START ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on", PORT);

  // chạy nền, không await
  bootstrap();
});

async function bootstrap() {
  try {
    console.log("Bootstrapping...");

    await loadSymbols();

    const favs = getFavorites();

    for (const s of favs) {
      initSymbol(s); // KHÔNG await
    }

    console.log("Bootstrap done");
  } catch (e) {
    console.error("Bootstrap error", e);
  }
}

