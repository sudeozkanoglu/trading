import { WebSocketServer } from "ws";
import { createClient } from "@clickhouse/client";

const clickhouseClient = createClient({
  url: `http://localhost:8123`,
  username: "default",
  password: "123456",
  database: "trading_db",
});

export class TradingWebSocketServer {
  constructor(port = 3001) {
    this.wss = new WebSocketServer({ port });
    this.clients = new Set();

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);
      ws.symbol = null; 
      console.log("New WebSocket client connected");

      // Client’tan mesaj gelirse dinle (subscribe işlemi için)
      ws.on("message", (msg) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.type === "subscribe" && data.symbol) {
            ws.symbol = data.symbol;
            console.log(`Client subscribed to ${data.symbol}`);
          }
        } catch (err) {
          console.warn("Invalid WS message:", msg.toString());
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        console.log("WebSocket client disconnected");
      });
    });

    setInterval(() => this.broadcastLatestPrices(), 2000);
    setInterval(() => this.broadcastSystemMetrics(), 5000);
  }

  async broadcastLatestPrices() {
    try {
      const result = await clickhouseClient.query({
        query: `
    SELECT
      symbol,
      price,
      volume,
      timestamp,
      exchange,
      bid,
      ask,
      high_24h,
      low_24h,
      change_24h,
      change_percent_24h
    FROM trading_db.trading_prices
    ORDER BY timestamp DESC
    LIMIT 100
  `,
        format: "JSONEachRow",
      });
      const allData = await result.json();

      for (const client of this.clients) {
        if (client.readyState !== 1) continue;

        const filteredData = client.symbol
          ? allData.filter((r) => r.symbol === client.symbol)
          : allData;

        const payload = JSON.stringify({ type: "prices", data: filteredData });
        client.send(payload);

        const orderBookData = filteredData.map((item) => {
          const base = item.price;
          const bids = Array.from({ length: 10 }, (_, i) => ({
            price: parseFloat((base * (1 - i * 0.0005)).toFixed(2)),
            amount: Math.random() * 5,
          }));
          const asks = Array.from({ length: 10 }, (_, i) => ({
            price: parseFloat((base * (1 + i * 0.0005)).toFixed(2)),
            amount: Math.random() * 5,
          }));
          const spread = asks[0].price - bids[0].price;
          const spreadPercent = (spread / base) * 100;
          let bidTotal = 0;
          bids.forEach((b) => {
            bidTotal += b.amount;
            b.total = bidTotal;
          });
          let askTotal = 0;
          asks.forEach((a) => {
            askTotal += a.amount;
            a.total = askTotal;
          });

          return {
            symbol: item.symbol,
            bids,
            asks,
            spread,
            spreadPercent,
            timestamp: item.timestamp,
          };
        });

        const payloadOrderBook = JSON.stringify({
          type: "orderbook_update",
          data: orderBookData,
        });
        client.send(payloadOrderBook);
      }
    } catch (err) {
      console.error("Error broadcasting prices:", err);
    }
  }

  async broadcastSystemMetrics() {
    try {
      const result = await clickhouseClient.query({
        query: `
    SELECT
      metric_name,
      metric_value,
      timestamp,
      component,
      severity
    FROM trading_db.system_metrics
    ORDER BY timestamp DESC
    LIMIT 100
  `,
        format: "JSONEachRow",
      });
      const metrics = await result.json();
      const payload = JSON.stringify({ type: "metrics", data: metrics });
      for (const client of this.clients) {
        if (client.readyState === 1) client.send(payload);
      }
    } catch (err) {
      console.error("Error broadcasting system metrics:", err);
    }
  }
}

let websocketInstance = null;

export function getWebSocketServer() {
  if (!websocketInstance) {
    websocketInstance = new TradingWebSocketServer(3001);
    console.log("WebSocket server initialized on port 3001");
  }
  return websocketInstance;
}

export async function broadcastLatestPrices() {
  try {
    const server = getWebSocketServer();
    await server.broadcastLatestPrices();
  } catch (error) {
    console.error("Error broadcasting latest prices:", error);
  }
}
