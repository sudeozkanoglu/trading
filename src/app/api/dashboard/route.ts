import { clickhouseClient } from "@/lib/clickhouse";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // total volume
    const totalVolumeRes = await clickhouseClient.query({
      query: `
        SELECT SUM(volume * price) AS total_volume
        FROM trading_db.trading_prices
      `,
      format: "JSONEachRow",
    });
    const totalVolumeData = (await totalVolumeRes.json()) as any[];
    const total_volume = Number(totalVolumeData[0]?.total_volume ?? 0);

    // active trades
    const activeTradesRes = await clickhouseClient.query({
      query: `
    SELECT COUNT(*) AS active_trades
    FROM trading_db.orders
    WHERE status = 'filled'
  `,
      format: "JSONEachRow",
    });
    const activeTradesData = (await activeTradesRes.json()) as any[];
    console.log("Active Trades Data:", activeTradesData);
    const active_trades = activeTradesData[0]?.active_trades ?? 0;

    // latency
    const latencyRes = await clickhouseClient.query({
      query: `
        SELECT avg(metric_value) AS avg_latency
        FROM trading_db.system_metrics
        WHERE metric_name = 'latency_ms'
          AND timestamp > now() - INTERVAL 5 MINUTE
      `,
      format: "JSONEachRow",
    });
    const latencyData = (await latencyRes.json()) as any[];
    const avg_latency = latencyData[0]?.avg_latency ?? 0;

    // error rate
    const errorRateRes = await clickhouseClient.query({
      query: `
        SELECT
          countIf(severity IN ('error', 'critical')) / count() AS error_rate
        FROM trading_db.system_metrics
        WHERE timestamp > now() - INTERVAL 5 MINUTE
      `,
      format: "JSONEachRow",
    });
    const errorRateData = (await errorRateRes.json()) as any[];
    const error_rate = errorRateData[0]?.error_rate ?? 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalVolume: total_volume,
        activeTrades: active_trades,
        systemLatency: Number(avg_latency?.toFixed(2)) ?? 0,
        errorRate: Number(error_rate?.toFixed(4)) ?? 0,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
