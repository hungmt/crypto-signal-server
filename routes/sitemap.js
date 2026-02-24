const express = require("express");
const router = express.Router();
const Signal = require("./models/signal");

router.get("/sitemap.xml", async (req, res) => {
  const signals = await Signal.find()
    .sort({ createdAt: -1 })
    .limit(5000);

  const urls = signals.map(s => `
    <url>
      <loc>https://www.cryptosignal.site/h/${s.slug}</loc>
      <lastmod>${new Date(s.createdAt).toISOString()}</lastmod>
      <changefreq>hourly</changefreq>
      <priority>0.9</priority>
    </url>
  `).join("");

  res.header("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>
  `);
});

module.exports = router;
