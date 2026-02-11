const fs = require("fs");
const path = require("path");

function seoRoute(app) {
  app.get("/:slug", (req, res) => {
    const slug = "/" + req.params.slug;

    let history = [];
    try {
      history = JSON.parse(
        fs.readFileSync(path.join(__dirname, "history.json"))
      );
    } catch { }

    const record = history.find(h =>
      h.urls.some(u => u.url === slug)
    );

    if (!record) return res.status(404).send("Not found");

    const seo = record.urls.find(u => u.url === slug);

    const html = `
    <html>
    <head>
      <title>${seo.title}</title>
      <meta name="description" content="${seo.desc}" />
    </head>
    <body style="font-family:Arial;padding:40px">
      <h1>${seo.title}</h1>
      <p>${seo.desc}</p>

      <h2>Signal Details</h2>
      <ul>
        <li>Symbol: ${record.symbol}</li>
        <li>Timeframe: ${record.interval}</li>
        <li>Signal: ${record.signal}</li>
        <li>Entry: ${record.entry}</li>
        <li>Take Profit: ${record.tp}</li>
        <li>Stop Loss: ${record.sl}</li>
        <li>RSI: ${record.rsi}</li>
      </ul>

      <a href="https://www.binance.com/en/futures/${record.symbol}?ref=83521708">
        Trade this signal on Binance
      </a>
      <a href="https://cryptosignal.site/#/dashboard?symbol=${symbol}">
  🚀 Open Live Signals
</a>

<br/><br/>

<button onclick="OneSignal.showSlidedownPrompt()">
  🔔 Enable Notifications
</button>
    </body>
    </html>
    `;

    res.send(html);
  });
}

module.exports = seoRoute;
