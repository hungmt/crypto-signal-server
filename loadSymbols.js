// loadSymbols.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "symbols.json");

async function loadSymbols() {
  try {
    console.log("Loading symbols from Binance...");

    const { data } = await axios.get(
      "https://fapi.binance.com/fapi/v1/exchangeInfo",
      { timeout: 8000 }
    );

    const symbols = data.symbols
      .filter(
        s =>
          s.status === "TRADING" &&
          s.contractType === "PERPETUAL" &&
          s.quoteAsset === "USDT"
      )
      .map(s => s.symbol)
      .sort();

    // ✅ ghi đè file để lần sau khỏi cần gọi nữa
    fs.writeFileSync(FILE, JSON.stringify(symbols, null, 2));

    console.log("✅ Loaded from Binance:", symbols.length);
    return symbols;

  } catch (e) {
    console.log("⚠️ Binance blocked, loading from file...");

    try {
      const symbols = JSON.parse(fs.readFileSync(FILE));
      console.log("✅ Loaded from symbols.json:", symbols.length);
      return symbols;
    } catch {
      console.log("❌ symbols.json not found!");
      return ["BTCUSDT", "ETHUSDT"];
    }
  }
}

module.exports = loadSymbols;
