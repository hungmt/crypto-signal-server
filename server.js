// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const { signalsCache, initSymbol } = require("./alertEngine");
const loadSymbols = require("./loadSymbols");
const seoRoutes = require("./routes/seo");
const sitemap = require("./routes/sitemap");
const seoSymbols = require("./seoSymbols.json");
const app = express();
app.use(cors());
app.use(express.json());

/* ================= KEEP RENDER AWAKE ================= */
// const seoRoute = require("./seoRoute");

// ket noi DB
const connectDB = require("./db");

connectDB();
const Signal = require("./models/Signal");

app.get("/history", async (req, res) => {
  const signals = await Signal.find()
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(signals);
});
const SELF_URL = "https://crypto-signal-server.onrender.com/health";

app.get("/health", (req, res) => res.send("OK"));

setInterval(() => {
  axios.get(SELF_URL).catch(() => {});
}, 5 * 60 * 1000);

/* ================= SYMBOL CACHE FUTURES ================= */



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
app.post("/favorites", (req, res) => {
  const { symbol } = req.body;
  const favs = getFavorites();

  if (!favs.includes(symbol) && favs.length < 20) {
    favs.push(symbol);
    fs.writeFileSync("favorites.json", JSON.stringify(favs));
    initSymbol(symbol); // không await
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
  const favs = getFavorites();
  const out = {};

  for (const s of favs) {
    if (signalsCache[s]) out[s] = signalsCache[s];
  }

  res.json(out);
});
/* ================= START ================= */

const PORT = process.env.PORT || 3000;
let SYMBOL_CACHE = [];
app.listen(PORT, () => {
  console.log("Server running on", PORT);

  // chạy nền, không await
  bootstrap();
});

async function bootstrap() {
  try {
    console.log("Bootstrapping...");

     SYMBOL_CACHE = await loadSymbols();

   const favs = getFavorites();

for (const s of favs) {
  await initSymbol(s, true); // preload
}

for (const s of seoSymbols) {
  if (!favs.includes(s)) {
    initSymbol(s, false); // KHÔNG preload
  }
}
    console.log("Bootstrap done");
  } catch (e) {
    console.error("Bootstrap error", e);
  }
}
app.use("/", seoRoutes);
app.use("/", sitemap);

