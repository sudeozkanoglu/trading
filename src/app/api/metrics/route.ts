import { NextRequest, NextResponse } from 'next/server';
import { clickhouseClient } from '@/lib/clickhouse';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const component = searchParams.get('component');
    const severity = searchParams.get('severity');
    const metricName = searchParams.get('metric_name');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || config.trading.defaultPageSize.toString()),
      config.trading.maxPageSize
    );
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (component) {
      whereClause += ' AND component = {component:String}';
      params.push({ name: 'component', value: component });
    }

    if (severity) {
      whereClause += ' AND severity = {severity:String}';
      params.push({ name: 'severity', value: severity });
    }

    if (metricName) {
      whereClause += ' AND metric_name = {metric_name:String}';
      params.push({ name: 'metric_name', value: metricName });
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM system_metrics
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
        metric_name,
        metric_value,
        timestamp,
        component,
        severity
      FROM system_metrics
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
    console.error(' Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

// Get aggregated metrics for dashboard
export async function POST(request: NextRequest) {
  try {
    const { timeRange = '1h', components = [] } = await request.json();

    const interval =
      timeRange === '24h' ? '24 HOUR' : timeRange === '7d' ? '7 DAY' : '1 HOUR';

    const componentFilter =
      components.length > 0
        ? `AND component IN (${components.map((c: string) => `'${c}'`).join(', ')})`
        : '';

    // Get aggregated metrics
    const aggregatedQuery = `
      SELECT 
        component,
        metric_name,
        AVG(metric_value) as avg_value,
        MAX(metric_value) as max_value,
        MIN(metric_value) as min_value,
        COUNT(*) as data_points,
        argMax(severity, timestamp) AS max_severity
      FROM system_metrics
      WHERE timestamp > now() - INTERVAL ${interval} 
      ${componentFilter}
      GROUP BY component, metric_name
      ORDER BY component, metric_name
    `;

    const result = await clickhouseClient.query({
      query: aggregatedQuery,
      format: 'JSONEachRow',
    });

    const data = await result.json();

    // Get critical alerts
    const alertsQuery = `
      SELECT 
        component,
        metric_name,
        metric_value,
        timestamp,
        severity
      FROM system_metrics
     WHERE timestamp > now() - INTERVAL ${interval}
        ${componentFilter}
        AND severity IN ('error', 'critical')
      ORDER BY timestamp DESC
      LIMIT 10
    `;

    const alertsResult = await clickhouseClient.query({
      query: alertsQuery,
      format: 'JSONEachRow',
    });

    const alerts = await alertsResult.json();

    return NextResponse.json({
      aggregated: data,
      alerts: alerts.map((alert: any) => ({
        ...alert,
        timestamp: new Date(alert.timestamp).toISOString(),
      })),
    });
  } catch (error) {
    console.error(' Error fetching aggregated metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aggregated metrics' },
      { status: 500 }
    );
  }
}
