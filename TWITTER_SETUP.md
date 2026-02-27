# 🐦 Twitter/X API Setup for Render

## Environment Variables Needed

To enable Twitter posting, add these 4 variables to Render Dashboard > Environment Variables:

| Variable Name | Value | Where to Get |
|---|---|---|
| `X_API_KEY` | Your Consumer Key | X Developer Portal |
| `X_API_SECRET` | Your Consumer Secret | X Developer Portal |
| `X_ACCESS_TOKEN` | Your Access Token | X Developer Portal |
| `X_ACCESS_SECRET` | Your Access Token Secret | X Developer Portal |

---

## Getting Your X/Twitter API Credentials

### Step 1: Create X Developer Account
1. Go to https://developer.twitter.com/en/dashboard
2. Create a developer account (if you don't have one)
3. Verify email and phone number

### Step 2: Create an App
1. Go to **Projects & Apps**
2. Click **Create an App**
3. Choose a name (e.g., "Crypto Signal Bot")
4. Select **Automation**

### Step 3: Generate Credentials
1. Go to your app **Settings** → **Keys and Tokens**
2. Scroll down to **Authentication Tokens**
3. Click **Generate** next to **Access Token & Secret**
4. You'll see 4 keys:
   - `API Key` (Consumer Key) → Use as `X_API_KEY`
   - `API Key Secret` (Consumer Secret) → Use as `X_API_SECRET`
   - `Access Token` → Use as `X_ACCESS_TOKEN`
   - `Access Token Secret` → Use as `X_ACCESS_SECRET`

### Step 4: Set Permissions
1. Go app **Settings** → **User authentication settings**
2. Make sure **Read and Write** permission is enabled
3. This allows the bot to post tweets

### Step 5: Add to Render
1. Go to Render Dashboard > Your Service > Environment
2. Add the 4 variables:
   ```
   X_API_KEY=your_consumer_key
   X_API_SECRET=your_consumer_secret
   X_ACCESS_TOKEN=your_access_token
   X_ACCESS_SECRET=your_access_token_secret
   ```
3. Save & Deploy

---

## Testing Twitter Integration

After adding credentials to Render:

### Check Logs
1. Go to Render Dashboard > Logs
2. Find these messages:

**Success**:
```
✅ [TWITTER] All credentials configured
✅ [TWITTER] Client initialized successfully
```

**Missing Credentials**:
```
⚠️  [TWITTER] Credentials missing:
   - X_API_KEY: ✅
   - X_API_SECRET: ✅  
   - X_ACCESS_TOKEN: ❌
   - X_ACCESS_SECRET: ❌
```

If any show ❌, check Render env variables again.

### Monitor First Tweet
When a signal is generated:
```
📢 [TWITTER] Formatting signal tweet for BTCUSDT...
🐦 [TWITTER] Attempting to post tweet (~185 chars)...
✅ [TWITTER] Tweet posted successfully!
```

If you see ❌ instead of ✅, check error message for the issue.

---

## Common Issues & Fixes

### ❌ "Credentials missing"
**Problem**: Environment variables not set in Render  
**Fix**: 
1. Go to Render Dashboard
2. Select your service
3. Go to **Environment**
4. Add all 4 variables with correct values from X Developer Portal
5. Redeploy

### ❌ "401 Unauthorized"
**Problem**: Wrong or expired tokens  
**Fix**:
1. Check X Developer Portal
2. Regenerate tokens in **Keys and Tokens**
3. Update all 4 variables in Render
4. Redeploy

### ❌ "403 Forbidden - You cannot post tweets"
**Problem**: App doesn't have Write permission  
**Fix**:
1. Go to X Developer Portal
2. App **Settings** → **User authentication settings**
3. Make sure **Read and Write** is selected
4. Click the permissions box in **Authentication settings**
5. Update to "Read and Write"
6. Wait 15 minutes for API to refresh

### ❌ "Tweet too long"
**Problem**: Message exceeds 280 characters  
**Fix**: Automatic - will truncate to 270 chars with "..."

### ❌ "Rate limited"
**Problem**: Too many tweets posted too fast  
**Fix**: Twitter has rate limits (~300 requests/15 min)
- Don't generate too many signals quickly
- Space them out over time

---

## Tweet Preview

Here's what your tweets will look like:

```
🟢 LONG SIGNAL: BTC/15m

🎯 Entry: $42500.35
📈 TP: $43250
🛑 SL: $42000
📊 RSI: 32.45
✅ Risk: SAFE

🔗 Trade:
• Binance: binance.com/futures/BTCUSDT
• MEXC: futures.mexc.com/exchange/BTC_USDT

📊 Dashboard: cryptosignal.site
#Crypto #Trading #BTC
```

**Features**:
- ✅ Professional formatting
- ✅ All trading info visible
- ✅ Direct trade links
- ✅ Hashtags for trending
- ✅ Within 280 char limit

---

## Optional: How to Post Better Tweets

If you want to customize the tweet format, edit `twitter.js`:

```javascript
function formatProfessionalTweet(data) {
  // Edit this function to change tweet format
  // Change emojis, text, order, etc.
}
```

Current format uses:
- 🟢/🔴 for direction (LONG/SHORT)
- 📈 for TP target
- 🛑 for SL stop
- ✅/⚠️ for risk level
- #Hashtags for trending

---

## Troubleshooting Commands

Monitor Twitter posts in Render logs:

```
📢 [TWITTER] Formatting signal tweet
🐦 [TWITTER] Attempting to post tweet
✅ [TWITTER] Tweet posted successfully
❌ [TWITTER] Post failed
```

Search logs for `[TWITTER]` to see all X/Twitter activity.

---

## Still Having Issues?

1. **Check logs on Render** - The error message will tell you exactly what's wrong
2. **Verify credentials** - Copy-paste from X Developer Portal (no extra spaces)
3. **Check permissions** - Make sure app has "Read and Write"
4. **Wait for refresh** - Some changes take 15 minutes to apply
5. **Test manually** - Use `curl` or Postman to test your X API credentials

Good luck! Your signals will soon be trending on Twitter! 🚀
