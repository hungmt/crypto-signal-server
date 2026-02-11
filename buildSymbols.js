// buildSymbols.js
const axios = require("axios");
const fs = require("fs");

async function build() {
  const { data } = await axios.get(
    "https://fapi.binance.com/fapi/v1/exchangeInfo"
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

  fs.writeFileSync("symbols.json", JSON.stringify(symbols, null, 2));

  console.log("Saved", symbols.length, "symbols to symbols.json");
}

build();
