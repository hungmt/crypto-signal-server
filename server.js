const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { signalsCache, scanNow } = require("./alertEngine");
const axios = require("axios");
const app = express();
app.use(cors());
app.use(express.json());
let SYMBOL_CACHE = [];

function getFavorites() {
  try {
    return JSON.parse(fs.readFileSync("favorites.json"));
  } catch {
    return ["BTCUSDT", "ETHUSDT"];
  }
}
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

    console.log("Loaded FUTURES symbols:", SYMBOL_CACHE.length);
  } catch (e) {
    console.error("Load symbols error:", e.message);
  }
}

app.get("/symbols", (req, res) => {
  const search = (req.query.search || "").toUpperCase();

  // Khi chưa gõ gì → trả 50 coin đầu để Flutter có data
  if (!search) {
    return res.json(SYMBOL_CACHE.slice(0, 50));
  }

  const result = SYMBOL_CACHE
    .filter(s => s.includes(search))
    .slice(0, 20);

  res.json(result);
});


function getSignals() {
  try {
    return JSON.parse(fs.readFileSync("signals.json"));
  } catch {
    return {};
  }
}

app.get("/signals", (req, res) => {
  const { interval } = req.query;
  const cache = getSignals();

  const out = {};
  for (const symbol in cache) {
    const data = cache[symbol][interval];
    if (data) out[symbol] = data;
  }

  res.json(out);
});


app.get("/favorites", (req, res) => {
  res.json(getFavorites());
});

app.post("/favorites", async (req, res) => {
  const { symbol } = req.body;
  const favs = getFavorites();
  if (!favs.includes(symbol) && favs.length < 10) {
    favs.push(symbol);
    fs.writeFileSync("favorites.json", JSON.stringify(favs));
    // 🔥 QUAN TRỌNG: scan ngay
    await scanNow(symbol);
  }
  res.json(favs);
});

app.delete("/favorites/:symbol", (req, res) => {
  const favs = getFavorites().filter(s => s !== req.params.symbol);
  fs.writeFileSync("favorites.json", JSON.stringify(favs));
  res.json(favs);
});
loadSymbols();
// 👇 CRON sẽ gọi API này
app.get("/scan", async (req, res) => {
  console.log("⏰ CRON SCAN START");

  try {
    const favs = JSON.parse(fs.readFileSync("favorites.json"));

    for (const s of favs) {
      await scanNow(s);
    }

    fs.writeFileSync("signals.json", JSON.stringify(signalsCache));

    console.log("✅ SCAN DONE");
    res.send("OK");
  } catch (e) {
    console.log(e.message);
    res.status(500).send("Error");
  }
});
//app.listen(3000, () => console.log("API running 3000"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("API running on", PORT));
