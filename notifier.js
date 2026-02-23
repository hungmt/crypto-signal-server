const axios = require("axios");
const fs = require("fs");
const { sendTelegram } = require("./telegram");
const { postTweet } = require("./twitter");

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

const PUSH_LOG_FILE = "pushlog.json";

// ===============================
// LOAD PUSH HISTORY
// ===============================
let pushLog = {};
if (fs.existsSync(PUSH_LOG_FILE)) {
  pushLog = JSON.parse(fs.readFileSync(PUSH_LOG_FILE));
}

function shouldPush(key) {
  const now = Date.now();
  const COOLDOWN = 30 * 60 * 1000; // 30 phút

  if (!pushLog[key]) return true;
  return now - pushLog[key] > COOLDOWN;
}

function markPushed(key) {
  pushLog[key] = Date.now();
  fs.writeFileSync(PUSH_LOG_FILE, JSON.stringify(pushLog));
}

// ===============================
// BUILD MESSAGE (SEO + VIRAL)
// ===============================
function buildMessage(data) {
  const emoji = data.signal === "BUY" ? "🚀" : "🔻";

  return `${emoji} ${data.symbol} ${data.signal}

Price: ${data.price}
RSI: ${data.rsi}
Trend: ${data.trend}
Strength: ${data.strength}

${data.volumeSpike ? "Volume spike detected" : ""}

Trade Futures:
Binance: https://www.binance.com/en/futures/${data.symbol}?ref=83521708
MEXC: https://futures.mexc.com/exchange/${data.symbol.replace(
    "USDT",
    "_USDT"
  )}?inviteCode=5ivHrwsQ

#crypto #trading #${data.symbol.replace("USDT", "")}`;
}

// ===============================
// PUSH SIGNAL
// ===============================
async function pushSignal(data) {
  try {
    const key = `${data.symbol}_${data.interval}_${data.signal}`;

    if (!shouldPush(key)) {
      console.log("⏭ Skip duplicate push:", key);
      return;
    }

    const msg = buildMessage(data);

    // ===============================
    // ONESIGNAL PUSH
    // ===============================
    await axios.post(
      "https://onesignal.com/api/v1/notifications",
      {
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["All"],

        headings: {
          en: `${data.symbol} ${data.interval} ${data.signal}`,
        },

        contents: {
          en: msg,
        },

        url: `https://cryptosignal.site/?tf=${data.interval}`,

        chrome_web_icon: "https://cryptosignal.site/icons/Icon-192.png",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${ONESIGNAL_API_KEY}`,
        },
      }
    );

    markPushed(key);

    console.log("✅ PUSH SENT:", key);

    // ===============================
    // TELEGRAM
    // ===============================
    await sendTelegram(msg);

    // ===============================
    // TWITTER (X)
    // ===============================
    await postTweet(msg);

    console.log("📣 Social posted:", data.symbol);
  } catch (e) {
    console.log("❌ Push error:", e.response?.data || e.message);
  }
}

module.exports = { pushSignal };
