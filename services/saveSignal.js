const Signal = require("../models/Signal");

async function saveSignal(data) {
  try {
    await Signal.create(data);
  } catch (err) {
    console.log("DB save error:", err.message);
  }
}

module.exports = { saveSignal };
