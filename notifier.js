const axios = require("axios");

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

async function pushSignal(data) {
  try {
    await axios.post(
      "https://onesignal.com/api/v1/notifications",
      {
        app_id: ONESIGNAL_APP_ID,
        included_segments: ["All"],

        headings: {
          en: `${data.symbol} ${data.interval} ${data.signal}`,
        },

        contents: {
          en: `Entry: ${data.entry}\nTP: ${data.tp}\nSL: ${data.sl}`,
        },

        url: `https://cryptosignal.site/?tf=${data.interval}`,

        buttons: [
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

    console.log("✅ PUSH SENT:", data.symbol, data.interval);
  } catch (e) {
    console.log("❌ Push error:", e.response?.data || e.message);
  }
}

module.exports = { pushSignal };
