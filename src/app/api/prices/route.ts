import { NextRequest, NextResponse } from 'next/server';
import { clickhouseClient } from '@/lib/clickhouse';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const exchange = searchParams.get('exchange');
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

    if (exchange) {
      whereClause += ' AND exchange = {exchange:String}';
      params.push({ name: 'exchange', value: exchange });
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ${config.clickhouse.database}.trading_prices
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
      FROM ${config.clickhouse.database}.trading_prices
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
    console.error(' Error fetching prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
