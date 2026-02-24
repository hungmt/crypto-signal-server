const mongoose = require("mongoose");

const SignalSchema = new mongoose.Schema({
  symbol: String,
  interval: String,
  signal: String,
  entry: Number,
  tp: Number,
  sl: Number,
  rsi: Number,
  strength: Number,
  risk: String,
  mode: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model("Signal", SignalSchema);
