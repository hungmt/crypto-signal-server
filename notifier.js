const axios = require("axios");
const fs = require("fs");
const { sendTelegram } = require("./telegram");
const { postTweet } = require("./twitter");
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

const PUSH_LOG_FILE = "pushlog.json";

// lưu lịch sử push để chống trùng
let pushLog = {};
if (fs.existsSync(PUSH_LOG_FILE)) {
  pushLog = JSON.parse(fs.readFileSync(PUSH_LOG_FILE));
}

function shouldPush(key) {
  const now = Date.now();

  // cooldown 30 phút cho cùng 1 signal
  const COOLDOWN = 30 * 60 * 1000;

  if (!pushLog[key]) return true;

  return now - pushLog[key] > COOLDOWN;
}
function formatSocialMessage(data) {
  const riskIcon = data.risk === "HIGH" ? "⚠️ HIGH RISK" : "🟢 SAFE";
  const entry = data.entry ?? data.price ?? "-";
  const tp = data.tp ?? "-";
  const sl = data.sl ?? "-";

  return `🔻 ${data.symbol} ${data.signal}

Price: ${data.price}
RSI: ${data.rsi ?? "-"}
TF: ${data.interval}

🎯 Entry: ${entry}
🎯 TP: ${tp}
🛑 SL: ${sl}

${riskIcon}

Trade Futures:
Binance:
https://www.binance.com/en/futures/${data.symbol}?ref=83521708

MEXC:
https://futures.mexc.com/exchange/${data.symbol.replace(
    "USDT",
    "_USDT"
  )}?inviteCode=5ivHrwsQ`;
}

function markPushed(key) {
  pushLog[key] = Date.now();
  fs.writeFileSync(PUSH_LOG_FILE, JSON.stringify(pushLog));
}

async function pushSignal(data) {
  try {
    // KEY DUY NHẤT CHO MỖI TÍN HIỆU
    const key = `${data.symbol}_${data.interval}_${data.signal}`;

    if (!shouldPush(key)) {
      console.log("⏭ Skip duplicate push:", key);
      return;
    }

    await axios.post(
      "https://onesignal.com/api/v1/notifications",
      {
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["All"],

        headings: {
          en: `${data.symbol} ${data.interval} ${data.signal}`,
        },

        contents: {
          en: `Entry: ${data.entry ?? data.price}
TP: ${data.tp ?? "-"}
SL: ${data.sl ?? "-"}`,
        },

        url: `https://cryptosignal.site/?tf=${data.interval}`,

        chrome_web_icon: "https://cryptosignal.site/icons/Icon-192.png",

        web_buttons: [
          {
            id: "binance",
            text: "Trade Binance",
            url: `https://www.binance.com/en/futures/${data.symbol}?ref=83521708`,
          },
          {
            id: "mexc",
            text: "Trade MEXC",
            url: `https://futures.mexc.com/exchange/${data.symbol.replace(
              "USDT",
              "_USDT"
            )}?inviteCode=5ivHrwsQ`,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${ONESIGNAL_API_KEY}`,
        },
      }
    );

    markPushed(key);


    const msg = formatSocialMessage(data);
    console.log("✅ PUSH SENT:", key);
    await sendTelegram(msg);
    await postTweet(msg);

    console.log("📣 Social posted:", data.symbol);


    console.log("📣 Social posted:", data.symbol);
  } catch (e) {
    console.log("❌ Push error:", e.response?.data || e.message);
  }
}

module.exports = { pushSignal };
