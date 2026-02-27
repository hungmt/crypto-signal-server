const { TwitterApi } = require("twitter-api-v2");

let client = null;
let isConfigured = false;

function initClient() {
  if (!isConfigured) {
    logTwitterStatus();
    isConfigured = true;
  }

  if (!client && process.env.X_API_KEY && process.env.X_API_SECRET && process.env.X_ACCESS_TOKEN && process.env.X_ACCESS_SECRET) {
    try {
      client = new TwitterApi({
        appKey: process.env.X_API_KEY,
        appSecret: process.env.X_API_SECRET,
        accessToken: process.env.X_ACCESS_TOKEN,
        accessSecret: process.env.X_ACCESS_SECRET,
      });
      console.log("✅ [TWITTER] Client initialized successfully");
    } catch (err) {
      console.error("❌ [TWITTER] Client initialization failed:", err.message);
      return null;
    }
  }
  return client;
}

function logTwitterStatus() {
  const hasKey = !!process.env.X_API_KEY;
  const hasSecret = !!process.env.X_API_SECRET;
  const hasToken = !!process.env.X_ACCESS_TOKEN;
  const hasTokenSecret = !!process.env.X_ACCESS_SECRET;
  
  if (!hasKey || !hasSecret || !hasToken || !hasTokenSecret) {
    console.log("⚠️  [TWITTER] Credentials missing:");
    console.log(`   - X_API_KEY: ${hasKey ? "✅" : "❌"}`);
    console.log(`   - X_API_SECRET: ${hasSecret ? "✅" : "❌"}`);
    console.log(`   - X_ACCESS_TOKEN: ${hasToken ? "✅" : "❌"}`);
    console.log(`   - X_ACCESS_SECRET: ${hasTokenSecret ? "✅" : "❌"}`);
    console.log("   [TWITTER] Will skip posting tweets");
  } else {
    console.log("✅ [TWITTER] All credentials configured");
  }
}

/**
 * Format professional Twitter message for a crypto signal
 * @param {Object} data - Signal data {symbol, signal, interval, price, entry, tp, sl, rsi, risk}
 * @returns {string} Formatted tweet
 */
function formatProfessionalTweet(data) {
  const coin = data.symbol.replace("USDT", "");
  const direction = data.signal === "LONG" ? "🟢 LONG" : "🔴 SHORT";
  const action = data.signal === "LONG" ? "BUY" : "SELL";
  const riskEmoji = data.risk === "HIGH" ? "⚠️" : "✅";
  
  // Professional format with proper structure
  const tweet = `${direction} SIGNAL: ${coin}/${data.interval}

🎯 Entry: $${(data.entry || data.price).toFixed(2)}
📈 TP: $${(data.tp || "-").toString().slice(0, 8)}
🛑 SL: $${(data.sl || "-").toString().slice(0, 8)}
📊 RSI: ${(data.rsi || "-").toString().slice(0, 5)}
${riskEmoji} Risk: ${data.risk || "UNKNOWN"}

💰 Trade: binance.com/futures/${data.symbol}
📱 Dashboard: cryptosignal.site

#Crypto #Trading #${coin} #${data.interval}`;

  return tweet;
}

async function postTweet(text) {
  const twitterClient = initClient();
  
  if (!twitterClient) {
    console.log("⚠️  [TWITTER] Not configured - skipping post");
    return false;
  }

  try {
    console.log("🐦 [TWITTER] Attempting to post tweet (~" + text.length + " chars)...");
    
    // Check if text is too long (Twitter limit is 280 chars)
    if (text.length > 280) {
      const truncated = text.substring(0, 270) + "...";
      console.warn("⚠️  [TWITTER] Tweet too long (" + text.length + " chars), truncating...");
      await twitterClient.v2.tweet(truncated);
    } else {
      await twitterClient.v2.tweet(text);
    }
    
    console.log("✅ [TWITTER] Tweet posted successfully!");
    return true;
  } catch (err) {
    console.error("❌ [TWITTER] Post failed:", err.code || err.message);
    
    // Better error logging
    if (err.response?.data?.errors) {
      err.response.data.errors.forEach(e => {
        console.error(`   Error: ${e.message} (${e.code})`);
      });
    }
    if (err.message.includes("401")) {
      console.error("   Fix: Check X_ACCESS_TOKEN and X_ACCESS_SECRET - they may be expired");
    }
    if (err.message.includes("403")) {
      console.error("   Fix: Check account permissions and API access level");
    }
    
    return false;
  }
}

/**
 * Post a signal-specific tweet with professional formatting
 * @param {Object} signalData - Signal object from MongoDB
 */
async function postSignalTweet(signalData) {
  try {
    const formattedTweet = formatProfessionalTweet(signalData);
    console.log(`📢 [TWITTER] Formatting signal tweet for ${signalData.symbol}...`);
    return await postTweet(formattedTweet);
  } catch (err) {
    console.error("❌ [TWITTER] Signal tweet error:", err.message);
    return false;
  }
}

module.exports = { postTweet, postSignalTweet, formatProfessionalTweet };
