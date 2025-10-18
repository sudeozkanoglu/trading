import { createServer } from 'http';
import next from 'next';
import { TradingWebSocketServer } from './src/lib/websocket-server.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const wsPort = 3001;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => handle(req, res));
new TradingWebSocketServer(wsPort);
server.listen(port, () => {
  console.log(`Next.js running on http://${hostname}:${port}`);
});