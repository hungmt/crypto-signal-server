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
  price: Number,
  // SEO fields
  slug: {
    type: String,
    index: true,
    unique: true,
    sparse: true
  },
  title: String,
  description: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model("Signal", SignalSchema);
