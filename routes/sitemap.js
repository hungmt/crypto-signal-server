const express = require("express");
const router = express.Router();
const Signal = require("../models/Signal");

router.get("/sitemap.xml", async (req, res) => {
  try {
    console.log("🗺️  [SITEMAP] Generating sitemap.xml...");
    
    const signals = await Signal.find()
      .where("slug").exists(true)
      .sort({ createdAt: -1 })
      .limit(50000);

    console.log(`📊 [SITEMAP] Found ${signals.length} signals with slugs`);

    const urls = signals.map(s => `
    <url>
      <loc>https://www.cryptosignal.site/signal/${s.slug}</loc>
      <lastmod>${new Date(s.createdAt).toISOString()}</lastmod>
      <changefreq>hourly</changefreq>
      <priority>${s.signal === "LONG" ? "0.9" : "0.8"}</priority>
    </url>
  `).join("");

    res.header("Content-Type", "application/xml; charset=utf-8");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>
  `);
    
    console.log(`✅ [SITEMAP] Sitemap sent (${signals.length} URLs)`);
  } catch (err) {
    console.error("❌ [SITEMAP] Generation error:", err.message);
    res.status(500).send("Error generating sitemap");
  }
});

module.exports = router;
