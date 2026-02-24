const Signal = require("../models/Signal");

async function saveSignal(data) {
  try {
    await Signal.create(data);
     // 🔥 ping Google sau khi có dữ liệu mới
  try {
    await axios.get(
      "https://www.google.com/ping?sitemap=https://yourdomain.com/sitemap.xml"
    );
    console.log("Pinged Google");
  } catch (e) {
    console.log("Ping failed");
  }
  } catch (err) {
    console.log("DB save error:", err.message);
  }
}

module.exports = { saveSignal };
