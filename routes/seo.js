const express = require("express");
const router = express.Router();
const Signal = require("./models/signal");

// URL dạng: /btc-15m-signal
router.get("/:coin-:tf-signal", async (req, res) => {
  const { coin, tf } = req.params;

  const symbol = coin.toUpperCase() + "USDT";

  const signal = await Signal.findOne({
    symbol,
    interval: tf
  }).sort({ createdAt: -1 });

  if (!signal) return res.status(404).send("No signal");

  const title = `${coin.toUpperCase()} ${tf} Signal | RSI & Support Resistance`;
  const description = `Latest ${coin.toUpperCase()} ${tf} trading signal, RSI ${signal.rsi}, price ${signal.price}. Auto updated crypto signals.`;

res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <link rel="canonical" href="https://www.cryptosignal.site/${coin}-${tf}-signal" />

  <style>
    body { font-family: Arial; max-width: 800px; margin: auto; padding: 30px; line-height: 1.6;}
    h1 { color:#111 }
    .card { background:#f5f5f5; padding:20px; border-radius:12px; margin:20px 0 }
    .long { color:green; font-weight:bold }
    .short { color:red; font-weight:bold }
  </style>
</head>

<body>

<h1>${coin.toUpperCase()} ${tf} Trading Signal</h1>

<p>
Latest <strong>${coin.toUpperCase()}</strong> ${tf} crypto trading signal
based on RSI and dynamic support & resistance levels.
</p>

<div class="card">
  <p><strong>Price:</strong> ${signal.price}</p>
  <p><strong>RSI:</strong> ${signal.rsi}</p>
  <p><strong>Signal:</strong> 
    <span class="${signal.signal === "LONG" ? "long" : "short"}">
      ${signal.signal}
    </span>
  </p>
  <p><strong>Updated:</strong> ${new Date(signal.createdAt).toLocaleString()}</p>
</div>

<h2>📊 How this signal works</h2>
<p>
This signal is generated using RSI momentum and support/resistance zones.
Oversold RSI combined with support bounce suggests LONG opportunities,
while overbought RSI near resistance suggests SHORT setups.
</p>

<h2>⚠ Risk Notice</h2>
<p>
Crypto futures trading involves high risk. Always use stop loss and proper risk management.
</p>

<h2>🚀 Trade ${coin.toUpperCase()}</h2>
<p>
<a href="https://www.binance.com/en/futures/${symbol}?ref=83521708">
Trade ${coin.toUpperCase()} on Binance Futures
</a>
</p>

<p>
<a href="https://cryptosignal.site/#/dashboard?symbol=${symbol}">
View Live Signals Dashboard
</a>
</p>

</body>
</html>
`);

});

module.exports = router;
