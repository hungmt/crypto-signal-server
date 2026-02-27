# ⚡ QUICK START - LOCAL SEO TESTING

**Thay vì đọc tất cả documentation, làm theo 5 bước này:**

---

## 🚀 QUICK SETUP (5 minutes)

### 1️⃣ Install Dependencies
```bash
cd d:\cryptotool\crypto_signal_web2
npm install
```

### 2️⃣ Setup MongoDB
**Chọn 1 trong 2 option:**

**Option A: MongoDB Atlas (Cloud) - Recommended**
- Signup: https://www.mongodb.com/cloud/atlas
- Create project & cluster (free)
- Copy connection string: `mongodb+srv://user:pass@cluster.xxxxx...`

**Option B: Local MongoDB**
```bash
# Windows: Download & install from https://www.mongodb.com/try/download/community
# Then start: mongod --dbpath C:\data\db
```

### 3️⃣ Create .env File
```bash
# Copy template:
copy .env.example .env

# Edit .env and add:
MONGO_URI=mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/crypto_signal?retryWrites=true&w=majority
PORT=3001
ONESIGNAL_APP_ID=dummy
ONESIGNAL_API_KEY=dummy
```

### 4️⃣ Generate Test Signals
```bash
node testSignal.js 5
```

**Lưu lại slug từ output:**
```
Slug: btc-1h-long-signal-1709001234567
URL: http://localhost:3001/signal/btc-1h-long-signal-1709001234567
```

### 5️⃣ Test Everything
```bash
# Terminal 1: Start server
npm start

# Terminal 2: Test routes
node testRoutes.js
```

---

## 📱 MANUAL TEST IN BROWSER

1. **Sitemap**: http://localhost:3001/sitemap.xml
   - Phải thấy XML list URLs
   
2. **Signal Page**: http://localhost:3001/signal/[YOUR-SLUG-HERE]
   - Replace [YOUR-SLUG-HERE] with actual slug from step 4
   - Phải thấy HTML page đẹp
   
3. **Check Meta Tags**: Press F12 → View Source
   - Tìm: `<title>`, `<meta name="description">`, `<meta property="og:title">`

---

## 💾 SAVE SETUP INFO

Tạo file `SETUP_INFO_MY_CONFIG.json` (copy từ `SETUP_INFO.json`) và fill vào:

```json
{
  "test_completed_date": "2026-02-27",
  
  "database_config": {
    "connection_string": "[YOUR MONGO_URI]",
    "database_name": "crypto_signal"
  },
  
  "test_results": {
    "test_signals_created": 5,
    "sitemap_urls": 5,
    "meta_tags_validated": true
  },
  
  "test_signal_slug": "btc-1h-long-signal-1709001234567",
  "test_signal_url": "http://localhost:3001/signal/btc-1h-long-signal-1709001234567"
}
```

---

## ✅ WHEN ALL TESTS PASS

```bash
# Commit code
git add .
git commit -m "feat: SEO system - local testing passed"
git push

# Next: Deploy to Render
# Render sẽ auto-redeploy when you push
```

---

## 📚 FULL DOCS

If you need details:
- **Full Setup Guide**: [LOCAL_TEST_SETUP.md](LOCAL_TEST_SETUP.md)
- **Code Review**: [CODE_REVIEW.md](CODE_REVIEW.md)
- **Vietnamese Summary**: [REVIEW_VI.md](REVIEW_VI.md)

---

## 🆘 QUICK HELP

| Problem | Fix |
|---------|-----|
| MongoDB won't connect | Check .env MONGO_URI, start mongod |
| Sitemap empty | Run: `node testSignal.js 5` |
| Signal page 404 | Check slug exists: `mongo test --eval "db.signals.findOne()"` |
| Port 3001 in use | Kill process: `netstat -ano | findstr :3001` |
| npm modules error | Delete node_modules, run: `npm install` |

---

**That's it! 🎉**

Next step: Deploy to production and submit sitemap to Google.

