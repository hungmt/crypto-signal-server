const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000
    });
    console.log("✅ MongoDB connected");
    isConnected = true;
  } catch (err) {
    console.error("⚠️  MongoDB connection failed:", err.message);
    console.error("   Continuing without database...");
    isConnected = false;
  }
}

function isDBConnected() {
  return isConnected;
}

module.exports = connectDB;
module.exports.isDBConnected = isDBConnected;
