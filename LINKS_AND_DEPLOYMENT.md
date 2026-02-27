## 🔗 Critical Links & Files for Deployment

### 📊 Complete Setup Documentation

| Document | Purpose | Read This First |
|----------|---------|-----------------|
| **DEPLOY_TO_RENDER.md** | Step-by-step deployment guide | ✅ START HERE |
| **PRODUCTION_SETUP.json** | All configuration details | ✅ Reference guide |
| **CODE_REVIEW.md** | Technical overview of all systems | For understanding the code |
| **QUICK_START.md** | Quick reference for key commands | Quick lookup |

### 🚀 Deploy Checklist

- [ ] Read `DEPLOY_TO_RENDER.md`
- [ ] Push code to GitHub: `git push origin main`
- [ ] Go to Render Dashboard
- [ ] Add all environment variables from `PRODUCTION_SETUP.json`
- [ ] Verify server starts (check Logs)
- [ ] Test sitemap: `https://your-app.onrender.com/sitemap.xml`
- [ ] Submit sitemap to Google Search Console

### 📁 Key Production Files

**Entry Point**:
- `server.js` - Main Express server (connects everything)

**Signal System**:
- `alertEngine.js` - Calculates trading signals from Binance
- `models/Signal.js` - MongoDB schema (database structure)
- `services/saveSignal.js` - Saves signals with auto-generated SEO metadata

**SEO/Frontend**:
- `routes/seo.js` - Serves signal pages with meta tags (Google indexing)
- `routes/sitemap.js` - Generates XML sitemap for search engines

**Notifications**:
- `telegram.js` - Sends signals to Telegram
- `twitter.js` - Posts signals to Twitter/X (optional)
- `notifier.js` - OneSignal web/mobile push notifications

**Real-time Data**:
- `binanceSocket.js` - Connects to Binance WebSocket (price updates)

**Database**:
- `db.js` - MongoDB connection handler (with graceful fallback if offline)

### ⚙️ Environment Variables Needed

Copy these to Render Dashboard > Environment:

```
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname
PORT=3000
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
ONESIGNAL_APP_ID=your_app_id
ONESIGNAL_API_KEY=your_api_key
X_API_KEY=twitter_key (optional)
X_API_SECRET=twitter_secret (optional)
NODE_ENV=production
```

### 🔍 Testing URLs After Deploy

Once deployed to Render, test these:

```
GET https://your-app.onrender.com/health
Response: {"status":"OK"}

GET https://your-app.onrender.com/sitemap.xml
Response: XML file with <url> tags

GET https://your-app.onrender.com/signal/btc-15m-long-signal-xxxxx
Response: HTML page with <title>, <meta> tags
```

### 📍 Google Search Console Setup

1. Add domain: `https://your-app-name.onrender.com`
2. Verify ownership (add DNS record or HTML file)
3. Go to "Sitemaps" - Add new sitemap
4. Sitemap URL: `https://your-app-name.onrender.com/sitemap.xml`
5. Submit and wait (2-4 weeks for indexing)

### 🐛 Troubleshooting

| Problem | Check | File |
|---------|-------|------|
| Server won't start | MONGO_URI in Render env | `db.js` |
| No Telegram messages | TELEGRAM_BOT_TOKEN & CHAT_ID correct | `telegram.js` |
| Sitemap empty | Check MongoDB has signals | `routes/sitemap.js` |
| No tweets posted | X_API_KEY (optional, can skip) | `twitter.js` |
| Pages not indexing | Sitemap submitted to GSC | `routes/seo.js` |

### 📞 Contact/Monitoring

**Telegram**: Bot will send signals automatically (configured in env)  
**Twitter**: Will auto-post if X_API credentials provided  
**OneSignal**: Will send web/mobile push notifications  
**Render Logs**: Watch real-time output for signal generation

### ✅ Final Verification Checklist

After 10 minutes of running:

```
Server running on port 3000 ✅
Connected to MongoDB ✅
Listening to Binance streams ✅
Telegram connected ✅
Ready to send signals ✅
```

---

**Save these links for future reference!** You'll need the Sitemap URL for Google Search Console. 🎯
