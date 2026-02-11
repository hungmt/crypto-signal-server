const axios = require("axios");

const BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(msg) {
  await axios.post(`https://api.telegram.org/bot${BOT}/sendMessage`, {
    chat_id: CHAT_ID,
    text: msg,
    parse_mode: "HTML",
  });
}

module.exports = { sendTelegram };
