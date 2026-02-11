// binanceSocket.js
const WebSocket = require("ws");

let priceMap = {};

function startPriceStream() {
  const ws = new WebSocket("wss://fstream.binance.com/ws/!markPrice@arr");

  ws.on("open", () => console.log("✅ MarkPrice WS connected"));

  ws.on("message", (msg) => {
    const arr = JSON.parse(msg);
    arr.forEach(p => {
      priceMap[p.s] = parseFloat(p.p);
    });
  });

  ws.on("close", () => {
    console.log("⚠️ MarkPrice WS reconnect...");
    setTimeout(startPriceStream, 2000);
  });
}

function subscribeKline(symbol, interval, onClose) {
  const stream = `${symbol.toLowerCase()}@kline_${interval}`;
  const ws = new WebSocket(`wss://fstream.binance.com/ws/${stream}`);

  ws.on("open", () =>
    console.log(`📡 Kline WS ${symbol} ${interval}`)
  );

  ws.on("message", (msg) => {
    const k = JSON.parse(msg).k;
    if (k.x) onClose(); // nến đóng
  });

  ws.on("close", () =>
    setTimeout(() => subscribeKline(symbol, interval, onClose), 2000)
  );
}

module.exports = {
  startPriceStream,
  subscribeKline,
  priceMap,
};
