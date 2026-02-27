const express = require("express");
const router = express.Router();
const Signal = require("../models/Signal");

// Route cho dynamic slug: /signal/:slug
router.get("/signal/:slug", async (req, res) => {
  try {
    console.log(`📄 [SEO] GET /signal/${req.params.slug}`);
    const signal = await Signal.findOne({ slug: req.params.slug });

    if (!signal) {
      console.log(`⚠️  [SEO] Signal not found: ${req.params.slug}`);
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Signal Not Found</title></head>
          <body>
            <h1>Signal Not Found</h1>
            <p>This trading signal is no longer available.</p>
            <a href="https://cryptosignal.site">
              Back to Dashboard
            </a>
          </body>
        </html>
      `);
    }

    const coin = signal.symbol.replace("USDT", "");
    const signalEmoji = signal.signal === "LONG" ? "📈" : "📉";
    const riskColor = signal.risk === "HIGH" ? "#ff6b6b" : "#51cf66";

    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${signal.title || "Crypto Trading Signal"}</title>
          <meta name="description" content="${signal.description || "Auto crypto trading signal"}" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="robots" content="index, follow" />
          <meta property="og:title" content="${signal.title}" />
          <meta property="og:description" content="${signal.description}" />
          <meta property="og:type" content="article" />
          <meta property="og:url" content="https://www.cryptosignal.site/signal/${signal.slug}" />
          <link rel="canonical" href="https://www.cryptosignal.site/signal/${signal.slug}" />

          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background: #f8f9fa;
              color: #333;
              line-height: 1.6;
            }
            .container {
              max-width: 900px;
              margin: 0 auto;
              padding: 20px;
            }
            header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 20px;
              border-radius: 8px;
              margin-bottom: 30px;
              text-align: center;
            }
            h1 {
              font-size: 2.5em;
              margin-bottom: 10px;
            }
            .signal-badge {
              display: inline-block;
              padding: 8px 16px;
              border-radius: 20px;
              background: rgba(255,255,255,0.2);
              font-weight: bold;
              margin: 10px 0;
            }
            .card {
              background: white;
              padding: 30px;
              border-radius: 8px;
              margin-bottom: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin-bottom: 20px;
            }
            .stat {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #667eea;
            }
            .stat-label {
              font-size: 0.9em;
              color: #666;
              margin-bottom: 5px;
            }
            .stat-value {
              font-size: 1.8em;
              font-weight: bold;
              color: #333;
            }
            .risk-high {
              color: #ff6b6b;
              font-weight: bold;
            }
            .risk-low {
              color: #51cf66;
              font-weight: bold;
            }
            .cta-button {
              display: inline-block;
              padding: 12px 24px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              margin-right: 10px;
              margin-top: 10px;
              font-weight: bold;
              transition: background 0.3s;
            }
            .cta-button:hover {
              background: #764ba2;
            }
            .cta-button-secondary {
              background: #6c757d;
            }
            .cta-button-secondary:hover {
              background: #5a6268;
            }
          </style>
        </head>

        <body>
          <div class="container">
            <header>
              <h1>${signalEmoji} ${coin.toUpperCase()} ${signal.interval} Signal</h1>
              <div class="signal-badge">${signal.signal}</div>
            </header>

            <div class="card">
              <h2>Trading Setup</h2>
              <div class="grid">
                <div class="stat">
                  <div class="stat-label">Signal Type</div>
                  <div class="stat-value">${signal.signal}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">Current Price</div>
                  <div class="stat-value">\$${signal.price?.toFixed(2) || "N/A"}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">RSI (14)</div>
                  <div class="stat-value">${signal.rsi?.toFixed(2) || "N/A"}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">Timeframe</div>
                  <div class="stat-value">${signal.interval}</div>
                </div>
              </div>

              <h3>Entry Setup</h3>
              <div class="grid">
                <div class="stat">
                  <div class="stat-label">Entry</div>
                  <div class="stat-value">\$${signal.entry?.toFixed(2) || "Market"}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">Take Profit</div>
                  <div class="stat-value">\$${signal.tp?.toFixed(2) || "N/A"}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">Stop Loss</div>
                  <div class="stat-value">\$${signal.sl?.toFixed(2) || "N/A"}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">Risk Level</div>
                  <div class="stat-value ${signal.risk === "HIGH" ? "risk-high" : "risk-low"}">
                    ${signal.risk || "Unknown"}
                  </div>
                </div>
              </div>

              <h3>How to Trade This</h3>
              <a href="https://www.binance.com/en/futures/${signal.symbol}?ref=83521708" class="cta-button">
                Trade on Binance Futures
              </a>
              <a href="https://cryptosignal.site/#/dashboard?symbol=${signal.symbol}" class="cta-button cta-button-secondary">
                View Live Dashboard
              </a>
            </div>

            <div class="card">
              <h2>⚠️ Risk Warning</h2>
              <p>
                <strong>Crypto futures trading is high-risk.</strong> This signal is generated using technical analysis (RSI and support/resistance). 
                Use proper risk management, always set stop losses, and only trade what you can afford to lose.
              </p>
              <p style="margin-top: 15px; color: #666; font-size: 0.9em;">
                Signal generated: ${new Date(signal.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </body>
      </html>
    `);
    console.log(`✅ [SEO] Signal page served: ${signal.symbol} ${signal.interval} ${signal.signal}`);
  } catch (err) {
    console.error("❌ [SEO] Route error:", err.message, "Slug:", req.params.slug);
    res.status(500).send("Error loading signal");
  }
});

// Route cho pattern cũ: /btc-15m-signal
router.get("/:coin-:tf-signal", async (req, res) => {
  try {
    const { coin, tf } = req.params;
    console.log(`📄 [SEO] GET /${coin}-${tf}-signal (legacy route)`);

    const symbol = coin.toUpperCase() + "USDT";

    const signal = await Signal.findOne({
      symbol,
      interval: tf
    }).sort({ createdAt: -1 });

    if (!signal) {
      console.log(`⚠️  [SEO] No signal found for legacy route: ${symbol} ${tf}`);
      return res.status(404).send("No signal");
    }

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
    console.log(`✅ [SEO] Legacy signal page served: ${symbol} ${tf}`);
  } catch (err) {
    console.error("❌ [SEO] Legacy route error:", err.message);
    res.status(500).send("Error loading signal");
  }
});

module.exports = router;
