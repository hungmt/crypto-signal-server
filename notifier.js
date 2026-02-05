const axios = require("axios");

const ONE_SIGNAL_APP_ID = "75d863af-e24a-4852-bf25-92fa3fc8ae94";
const ONE_SIGNAL_API_KEY = "os_v2_app_oxmghl7cjjeffpzfsl5d7sfosrhle6v7l4gubpmv7uul72indjrrxfsmhaj2dc57r2nxkflltzmmzwvslhbrzx6cng2lkmfrzfwbwfy";

async function pushSignal(data) {
  try {
    await axios.post(
      "https://api.onesignal.com/notifications",
      {
        app_id: ONE_SIGNAL_APP_ID,
        target_channel: "push",

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
          Authorization: `Key ${ONE_SIGNAL_API_KEY}`, // ⚠️ Key chứ không phải Basic nữa
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Pushed:", data.symbol, data.interval);
  } catch (e) {
    console.log("Push error:", e.response?.data || e.message);
  }
}


module.exports = { pushSignal };
