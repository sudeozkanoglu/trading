import { NextRequest, NextResponse } from 'next/server';
import { clickhouseClient } from '@/lib/clickhouse';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const userId = searchParams.get('user_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || config.trading.defaultPageSize.toString()),
      config.trading.maxPageSize
    );
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (symbol) {
      whereClause += ' AND symbol = {symbol:String}';
      params.push({ name: 'symbol', value: symbol });
    }

    if (userId) {
      whereClause += ' AND user_id = {user_id:String}';
      params.push({ name: 'user_id', value: userId });
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM trades
      ${whereClause}
    `;

    const countResult = await clickhouseClient.query({
      query: countQuery,
      query_params: params.reduce((acc, param) => {
        acc[param.name] = param.value;
        return acc;
      }, {} as any),
      format: 'JSONEachRow',
    });

    const countData = await countResult.json();
    const total = countData[0]?.total || 0;

    // Get paginated data
    const dataQuery = `
      SELECT 
        id,
        symbol,
        side,
        amount,
        price,
        timestamp,
        exchange,
        user_id,
        order_id
      FROM trades
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    const dataParams = {
      ...params.reduce((acc, param) => {
        acc[param.name] = param.value;
        return acc;
      }, {} as any),
      limit,
      offset,
    };

    const dataResult = await clickhouseClient.query({
      query: dataQuery,
      query_params: dataParams,
      format: 'JSONEachRow',
    });

    const data = await dataResult.json();

    return NextResponse.json({
      data: data.map((row: any) => ({
        ...row,
        timestamp: new Date(row.timestamp).toISOString(),
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
    console.error(' Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tradeData = await request.json();
    
    // Validate required fields
    const requiredFields = ['symbol', 'side', 'amount', 'price', 'exchange', 'user_id'];
    for (const field of requiredFields) {
      if (!tradeData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate trade ID and timestamp
    const trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...tradeData,
      timestamp: new Date().toISOString().replace('T', ' ').replace('Z', ''),
    };

    // Store trade in database
    await clickhouseClient.insert({
      table: 'trades',
      values: [trade],
      format: 'JSONEachRow',
    });

    return NextResponse.json({
      success: true,
      trade: {
        ...trade,
        timestamp: trade.timestamp,
      },
    });
  } catch (error) {
    console.error(' Error creating trade:', error);
    return NextResponse.json(
      { error: 'Failed to create trade', details: 'Unknown error' },
      { status: 500 }
    );
  }
}
