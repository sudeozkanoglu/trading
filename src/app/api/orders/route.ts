import { NextRequest, NextResponse } from "next/server";
import { clickhouseClient } from "@/lib/clickhouse";
import { config } from "@/lib/config";
import { verifyAuthToken } from "@/lib/auth";
import { broadcastLatestPrices } from "@/lib/websocket-server.js";

// YENİ EKLENEN
async function getLastPrice(symbol: string): Promise<number> {
  try {
    const result = await clickhouseClient.query({
      query: `
        SELECT price
        FROM ${config.clickhouse.database}.trading_prices
        WHERE symbol = {symbol:String}
        ORDER BY timestamp DESC
        LIMIT 1
      `,
      query_params: { symbol },
      format: "JSONEachRow",
    });
    const data = await result.json();
    return data[0]?.price || 100; // fallback default
  } catch (err) {
    console.error("Error getting last price:", err);
    return 100;
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Yetkilendirme gerekli." },
        { status: 401 }
      );
    }

    const payload = await verifyAuthToken(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: "Geçersiz token." }, { status: 401 });
    }

    const userId = payload.sub;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const symbol = searchParams.get("symbol");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(
        searchParams.get("limit") || config.trading.defaultPageSize.toString()
      ),
      config.trading.maxPageSize
    );
    const offset = (page - 1) * limit;

    let whereClause = "WHERE user_id = {user_id:String}";
    const params: Record<string, any> = { user_id: userId };

    if (status) {
      whereClause += " AND status = {status:String}";
      params.status = status;
    }

    if (symbol) {
      whereClause += " AND symbol = {symbol:String}";
      params.symbol = symbol;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${config.clickhouse.database}.orders
      ${whereClause}
    `;

    const countResult = await clickhouseClient.query({
      query: countQuery,
      query_params: params,
      format: "JSONEachRow",
    });
    const countData = await countResult.json();
    const total = countData[0]?.total || 0;

    // Get paginated data
    const dataQuery = `
      SELECT 
        id,
        user_id,
        symbol,
        side,
        type,
        amount,
        price,
        status,
        created_at,
        updated_at,
        filled_at,
        exchange
      FROM ${config.clickhouse.database}.orders
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    const dataParams = {
      ...params,
      limit,
      offset,
    };

    const dataResult = await clickhouseClient.query({
      query: dataQuery,
      query_params: dataParams,
      format: "JSONEachRow",
    });

    const data = await dataResult.json();

    return NextResponse.json({
      data: data.map((row: any) => ({
        ...row,
        created_at: new Date(row.created_at).toISOString(),
        updated_at: new Date(row.updated_at).toISOString(),
        filled_at: row.filled_at ? new Date(row.filled_at).toISOString() : null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authorization required." },
        { status: 401 }
      );
    }

    const payload = await verifyAuthToken(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }

    const orderData = await request.json();

    // Validate required fields
    const requiredFields = ["symbol", "side", "type", "amount", "exchange"];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate order ID and timestamps
    const now = new Date();
    const orderId = `order_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Fiyat simülasyonu
    const lastPrice = await getLastPrice(orderData.symbol);
    const direction = orderData.side === "buy" ? 1 : -1;
    const randomFactor = 1 + direction * (Math.random() * 0.002); // ±0.2%
    const newPrice = parseFloat((lastPrice * randomFactor).toFixed(2));

    const order = {
      id: orderId,
      user_id: payload.sub,
      symbol: orderData.symbol,
      side: orderData.side,
      type: orderData.type,
      amount: parseFloat(orderData.amount),
      price: orderData.price ? parseFloat(orderData.price) : newPrice,
      exchange: orderData.exchange,
      status: "filled",
      created_at: now.toISOString().replace("T", " ").replace("Z", ""),
      updated_at: now.toISOString().replace("T", " ").replace("Z", ""),
      filled_at: now.toISOString().replace("T", " ").replace("Z", ""),
    };

    await clickhouseClient.insert({
      table: "trading_prices",
      values: [
        {
          symbol: orderData.symbol,
          price: newPrice,
          volume: orderData.amount,
          exchange: orderData.exchange,
          timestamp: now.toISOString().replace("T", " ").replace("Z", ""),
        },
      ],
      format: "JSONEachRow",
    });

    // Store order in database
    await clickhouseClient.insert({
      table: "orders",
      values: [order],
      format: "JSONEachRow",
    });

    // Yeni eklenen - WebSocket ile anlık fiyat güncellemesi
    try {
      await broadcastLatestPrices();
    } catch (wsError) {
      console.warn("⚠️ WebSocket broadcast skipped (server not active)");
    }

    return NextResponse.json({
      success: true,
      message: "Order created successfully",
      order: {
        ...order,
        price: newPrice,
        status: "filled",
      },
    });
  } catch (error) {
    console.error(" Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order", details: "Unknown error" },
      { status: 500 }
    );
  }
}
