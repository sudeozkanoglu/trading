import { NextRequest, NextResponse } from "next/server";
import { clickhouseClient } from "@/lib/clickhouse";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    // bids ve asks verisini oluşturmak için ClickHouse sorgusu
    const query = `
      SELECT 
        symbol,
        price,
        volume AS amount,
        timestamp,
        exchange
      FROM ${config.clickhouse.database}.trading_prices
      WHERE symbol = {symbol:String}
      ORDER BY timestamp DESC
      LIMIT 30
    `;

    const result = await clickhouseClient.query({
      query,
      query_params: { symbol },
      format: "JSONEachRow",
    });

    const rows = await result.json();

    if (!rows.length) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    // Ortalama fiyat ve orderbook hesaplaması
    const latestPrice = rows[0].price;
    const bids = Array.from({ length: 15 }, (_, i) => ({
      price: parseFloat((latestPrice * (1 - i * 0.0005)).toFixed(2)),
      amount: Math.random() * 10,
      total: 0,
    }));

    const asks = Array.from({ length: 15 }, (_, i) => ({
      price: parseFloat((latestPrice * (1 + i * 0.0005)).toFixed(2)),
      amount: Math.random() * 10,
      total: 0,
    }));

    let bidTotal = 0;
    bids.forEach(b => (b.total = (bidTotal += b.amount)));

    let askTotal = 0;
    asks.forEach(a => (a.total = (askTotal += a.amount)));

    const spread = asks[0].price - bids[0].price;
    const spreadPercent = (spread / latestPrice) * 100;

    return NextResponse.json({
      symbol,
      bids,
      asks,
      spread,
      spreadPercent,
      latestPrice,
      timestamp: rows[0].timestamp,
    });
  } catch (error) {
    console.error("Error fetching orderbook:", error);
    return NextResponse.json({ error: "Failed to fetch orderbook" }, { status: 500 });
  }
}