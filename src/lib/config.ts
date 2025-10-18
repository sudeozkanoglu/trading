export const config = {
    clickhouse: {
      host: process.env.CLICKHOUSE_HOST || 'localhost',
      port: parseInt(process.env.CLICKHOUSE_PORT || '8123'),
      username: process.env.CLICKHOUSE_USERNAME || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '123456',
      database: process.env.CLICKHOUSE_DATABASE || 'trading_db',
    },
    websocket: {
      port: parseInt(process.env.WEBSOCKET_PORT || '3001'),
    },
    trading: {
      defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20'),
      maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100'),
    },
  } as const;