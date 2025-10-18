import { createClient } from '@clickhouse/client';
import { config } from './config';

export const clickhouseClient = createClient({
  host: `http://${config.clickhouse.host}:${config.clickhouse.port}`,
  username: config.clickhouse.username,
  password: config.clickhouse.password,
  database: config.clickhouse.database,
});