import { createClient } from "@clickhouse/client";
import os from "os";
import ping from "ping";
import { performance } from "perf_hooks";

const config = {
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || "localhost",
    port: parseInt(process.env.CLICKHOUSE_PORT || "8123"),
    username: process.env.CLICKHOUSE_USERNAME || "default",
    password: process.env.CLICKHOUSE_PASSWORD || "123456",
    database: process.env.CLICKHOUSE_DATABASE || "trading_db",
  },
};

const clickhouseClient = createClient({
  url: `http://${config.clickhouse.host}:${config.clickhouse.port}`,
  username: config.clickhouse.username,
  password: config.clickhouse.password,
  database: config.clickhouse.database,
  session_id: "init_session",
});

async function initializeDatabase() {
  try {
    console.log(" Initializing ClickHouse database...");

    // Create database
    await clickhouseClient.exec({
      query: "CREATE DATABASE IF NOT EXISTS trading_db",
    });

    // Use the database
    await clickhouseClient.exec({
      query: "USE trading_db",
    });

    // Create user table
    await clickhouseClient.exec({
      query: `
        CREATE TABLE IF NOT EXISTS ${config.clickhouse.database}.users (
          id String,
          username String,
          email String,
          password_hash String,
          created_at DateTime64(3),
          updated_at DateTime64(3),
          status Enum8('active' = 1, 'inactive' = 0),
          country Nullable(String),
          balance Float64
        )
        ENGINE = MergeTree()
        ORDER BY (id)
        PARTITION BY toYYYYMM(created_at)
      `,
    });

    // Create trading_prices table
    await clickhouseClient.exec({
      query: `
        CREATE TABLE IF NOT EXISTS trading_prices (
          symbol String,
          price Float64,
          volume UInt64,
          timestamp DateTime64(3),
          exchange String,
          bid Float64,
          ask Float64,
          high_24h Float64,
          low_24h Float64,
          change_24h Float64,
          change_percent_24h Float64
        ) ENGINE = MergeTree()
        ORDER BY (symbol, timestamp)
        PARTITION BY toYYYYMM(timestamp)
      `,
    });

    // Create trades table
    await clickhouseClient.exec({
      query: `
        CREATE TABLE IF NOT EXISTS trades (
          id String,
          symbol String,
          side Enum8('buy' = 1, 'sell' = 2),
          amount Float64,
          price Float64,
          timestamp DateTime64(3),
          exchange String,
          user_id String,
          order_id String
        ) ENGINE = MergeTree()
        ORDER BY (symbol, timestamp)
        PARTITION BY toYYYYMM(timestamp)
      `,
    });

    // Create orders table
    await clickhouseClient.exec({
      query: `
        CREATE TABLE IF NOT EXISTS orders (
          id String,
          user_id String,
          symbol String,
          side Enum8('buy' = 1, 'sell' = 2),
          type Enum8('market' = 1, 'limit' = 2, 'stop' = 3),
          amount Float64,
          price Float64,
          status Enum8('pending' = 1, 'filled' = 2, 'cancelled' = 3, 'rejected' = 4),
          created_at DateTime64(3),
          updated_at DateTime64(3),
          filled_at Nullable(DateTime64(3)),
          exchange String
        ) ENGINE = MergeTree()
        ORDER BY (user_id, created_at)
        PARTITION BY toYYYYMM(created_at)
      `,
    });

    // create system_metrics table
    await clickhouseClient.exec({
      query: `
    CREATE TABLE IF NOT EXISTS system_metrics (
      metric_name String,
      metric_value Float64,
      timestamp DateTime64(3),
      component String,
      severity String
    )
    ENGINE = MergeTree()
    ORDER BY (timestamp, component)
    PARTITION BY toYYYYMM(timestamp)
  `,
    });

    console.log("Database tables created successfully");

    // Insert sample data
    await insertSampleData();

    console.log("Database initialization completed successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}

async function startPriceStream() {
  const symbols = ["BTC/USD", "ETH/USD", "ADA/USD", "SOL/USD", "DOT/USD"];
  const exchanges = ["binance", "coinbase", "kraken"];

  setInterval(async () => {
    try {
      const priceRows = symbols.map((symbol) => {
        const exchange =
          exchanges[Math.floor(Math.random() * exchanges.length)];
        const basePrice =
          symbol === "BTC/USD" ? 45000 : symbol === "ETH/USD" ? 3000 : 1;
        const price = basePrice + (Math.random() - 0.5) * basePrice * 0.02;

        return {
          symbol,
          price: Math.round(price * 100) / 100,
          volume: Math.floor(Math.random() * 1000000),
          timestamp: new Date()
            .toISOString()
            .replace("T", " ")
            .replace("Z", ""),
          exchange,
          bid: Math.round((price - 0.01) * 100) / 100,
          ask: Math.round((price + 0.01) * 100) / 100,
          high_24h: Math.round(price * 1.05 * 100) / 100,
          low_24h: Math.round(price * 0.95 * 100) / 100,
          change_24h:
            Math.round((Math.random() - 0.5) * price * 0.1 * 100) / 100,
          change_percent_24h:
            Math.round((Math.random() - 0.5) * 10 * 100) / 100,
        };
      });

      await clickhouseClient.insert({
        table: "trading_prices",
        values: priceRows,
        format: "JSONEachRow",
      });
      console.log(`Inserted ${priceRows.length} new price records`);

      // metrics
      // CPU Usage (1-min avg)
      const cpuLoad = os.loadavg()[0];

      // Memory Usage (%)
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memUsagePercent = ((totalMem - freeMem) / totalMem) * 100;

      // Network latency (ping to Google)
      const pingResult = await ping.promise.probe("8.8.8.8");
      const networkLatency = pingResult.time; // in ms

      // Throughput simulation (ops per second)
      const throughputOps = Math.round(Math.random() * 1500 + 200);

      // Error rate — simulate with probability
      const errorRate = Math.random() < 0.05 ? 1 : 0; // %5 chance of error

      // Latency measurement (simulated API response time)
      const t0 = performance.now();
      await new Promise((res) => setTimeout(res, Math.random() * 100 + 20));
      const latencyMs = performance.now() - t0;
        

      const metrics = [
        {
          metric_name: "cpu_load",
          metric_value: cpuLoad,
          timestamp: new Date().toISOString().slice(0, 23).replace("T", " "),
          component: "system",
          severity: cpuLoad > 3 ? "warning" : "info",
        },
        {
          metric_name: "memory_usage_percent",
          metric_value: memUsagePercent,
          timestamp: new Date().toISOString().slice(0, 23).replace("T", " "),
          component: "system",
          severity: memUsagePercent > 85 ? "error" : "info",
        },
        {
          metric_name: "network_latency_ms",
          metric_value: networkLatency,
          timestamp: new Date().toISOString().slice(0, 23).replace("T", " "),
          component: "network",
          severity: networkLatency > 300 ? "warning" : "info",
        },
        {
          metric_name: "throughput_ops",
          metric_value: throughputOps,
          timestamp: new Date().toISOString().slice(0, 23).replace("T", " "),
          component: "order_engine",
          severity: throughputOps < 300 ? "warning" : "info",
        },
        {
          metric_name: "latency_ms",
          metric_value: latencyMs,
          timestamp: new Date().toISOString().slice(0, 23).replace("T", " "),
          component: "api",
          severity:
            latencyMs > 400
              ? "critical"
              : latencyMs > 300
              ? "error"
              : latencyMs > 200
              ? "warning"
              : "info",
        },
        {
          metric_name: "error_rate",
          metric_value: errorRate,
          timestamp: new Date().toISOString().slice(0, 23).replace("T", " "),
          component: "order_engine",
          severity: errorRate > 0 ? "error" : "info",
        },
      ];

      await clickhouseClient.insert({
        table: "system_metrics",
        values: metrics,
        format: "JSONEachRow",
      });
      console.log("Inserted live system metrics.");
    } catch (err) {
      console.error("Error inserting live prices:", err);
    }
  }, 15000); // Every 15 seconds
}

async function insertSampleData() {
  try {
    const symbols = ["BTC/USD", "ETH/USD", "ADA/USD", "SOL/USD", "DOT/USD"];
    const exchanges = ["binance", "coinbase", "kraken"];

    // Insert sample price data
    const priceData = [];
    for (let i = 0; i < 1000; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];
      const basePrice =
        symbol === "BTC/USD" ? 45000 : symbol === "ETH/USD" ? 3000 : 1;
      const price = basePrice + (Math.random() - 0.5) * basePrice * 0.1;

      priceData.push({
        symbol,
        price: Math.round(price * 100) / 100,
        volume: Math.floor(Math.random() * 1000000),
        timestamp: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .replace("T", " ")
          .replace("Z", ""),
        exchange,
        bid: Math.round((price - 0.01) * 100) / 100,
        ask: Math.round((price + 0.01) * 100) / 100,
        high_24h: Math.round(price * 1.05 * 100) / 100,
        low_24h: Math.round(price * 0.95 * 100) / 100,
        change_24h: Math.round((Math.random() - 0.5) * price * 0.1 * 100) / 100,
        change_percent_24h: Math.round((Math.random() - 0.5) * 10 * 100) / 100,
      });
    }

    await clickhouseClient.insert({
      table: "trading_prices",
      values: priceData,
      format: "JSONEachRow",
    });

    console.log("Sample data inserted successfully");
  } catch (error) {
    console.error("Error inserting sample data:", error);
    throw error;
  }
}

initializeDatabase().then(startPriceStream);
