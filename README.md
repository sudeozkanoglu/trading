# Real-Time Trading Dashboard

A comprehensive real-time trading dashboard built with Next.js, TypeScript, ClickHouse, and WebSockets for high-frequency trading (HFT) companies using FPGA-based technology.

## Features

### Real-Time Market Data Display

- Live price updates with WebSocket connections
- Real-time volume, bid/ask spreads, and 24h changes
- Multi-exchange support (Binance, Coinbase, Kraken, Bitfinex)
- Responsive price tables with pagination

### Trade Execution Interface

- Swift buy/sell order execution
- Multiple order types: Market, Limit, Stop
- Real-time order book visualization
- Immediate order status feedback

### System Performance Monitoring

- Real-time system metrics (latency, throughput, error rates)
- Component-wise performance tracking
- Critical alert mechanisms
- Interactive charts and visualizations

### Historical Data Access

- ClickHouse database integration for fast queries
- Historical trading data visualization
- Advanced filtering and pagination
- Time-range based data retrieval

### Responsive Design

- Mobile-first responsive design
- Dark/light theme support
- Optimal UX across all devices
- Modern, professional interface

## Technology Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **Lucide React** - Modern icons
- **Socket.IO Client** - Real-time communication

### Backend

- **Next.js API Routes** - Serverless API endpoints
- **ClickHouse** - High-performance analytical database
- **Socket.IO** - WebSocket server for real-time data
- **Node.js** - Runtime environment

### Database Schema

- **users** - Users data
- **trading_prices** - Real-time market data
- **trades** - Trade execution history
- **orders** - Order management
- **system_metrics** - Performance monitoring data

## Quick Start

### Prerequisites

- Node.js 18+
- ClickHouse server
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd trading_dash
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up ClickHouse**

   ```bash
   # Start ClickHouse server (using Docker)
   docker run -d \
   --name clickhouse \
   -p 8123:8123 \
   -p 9000:9000 \
   -e CLICKHOUSE_USER=default \
   -e CLICKHOUSE_PASSWORD=123456 \
   -e CLICKHOUSE_DB=trading_db \
   clickhouse/clickhouse-server
   ```

4. **Set up the database**

   ```bash
   npm run init-db
   ```

5. **Start the development server**

   ```bash
   node server.js
   ```

6. **Access the application**
   - Main Dashboard: http://localhost:3000
   - WebSocket Server: ws://localhost:3001

## Project Structure

```
trading_dash/
├── scripts/                   # Setup scripts
│   └── init-db.js             # Database initialization
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # 
│   │   │         ├── logout/  # Logout endpoint
│   │   |         └── me/      #  
│   │   │   ├── metrics/       # System metrics endpoints
│   │   │   ├── orderbook/     # 
│   │   │   ├── orders/        # Order management endpoints
│   │   │   ├── prices/        # Market data endpoints
│   │   │   ├── trades/        # Trade history endpoints
│   │   │   └── users/         # Users endpoints
│   │   ├── home/              # API routes
|   |   |     └── page.tsx     # 
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Main dashboard page
│   ├── components/            # React components
│   │   ├── OrderBook.tsx
│   │   ├── OrderHistory.tsx
│   │   ├── PriceTable.tsx
│   │   ├── SystemMetrics.tsx
│   │   ├── TradeExecution.tsx
│   │   ├── TradeHistory.tsx
│   │   ├── TradingDashboard.tsx
│   │   └── UserAuthForm.tsx
│   └── hooks/                 # Custom React hooks
│       └── useWebSocket.ts    # WebSocket integration
|   |── lib/                       # Utility libraries
│   |    ├── auth.ts                # 
│   |    ├── clickhouse.ts          # Database client
│   |    ├── config.ts              # Configuration
│   |    ├── utils.ts               # 
│   |    ├── websocket-server.ts    # WebSocket server
│   |    └── WebSocketProvider.tsx  # Configuration
└── server.js                  # Custom server setup
```

## API Endpoints

### Market Data

- `GET /api/prices` - Get paginated price data
- `GET /api/prices?symbol=BTC/USD` - Filter by symbol
- `GET /api/prices?exchange=binance` - Filter by exchange

### Trading

- `GET /api/trades` - Get trade history
- `POST /api/trades` - Execute a trade
- `GET /api/orders` - Get order history
- `POST /api/orders` - Place an order

### System Metrics

- `GET /api/metrics` - Get system metrics
- `POST /api/metrics` - Get aggregated metrics

## WebSocket Events

### Client → Server

- `subscribe_symbols` - Subscribe to price updates
- `subscribe_metrics` - Subscribe to system metrics
- `execute_trade` - Execute a trade
- `place_order` - Place an order

### Server → Client

- `price_update` - Real-time price updates
- `metrics_update` - System metrics updates
- `trade_executed` - Trade execution notifications
- `order_placed` - Order placement notifications

## Configuration

Create a `.env.local` file in the root directory:

```env
# ClickHouse Configuration
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=trading_db

# WebSocket Configuration
WEBSOCKET_PORT=3001

# Trading Configuration
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:setup` - Initialize database

### Key Features Implementation

#### Real-Time Data Flow

1. ClickHouse stores historical and real-time data
2. WebSocket server pushes updates to connected clients
3. React components subscribe to relevant data streams
4. UI updates automatically with new data

#### Performance Optimization

- ClickHouse partitioning for fast queries
- WebSocket connection pooling
- React component memoization
- Efficient pagination with database-level limits

#### Security Considerations

- Input validation on all API endpoints
- Rate limiting for trade execution
- WebSocket connection authentication
- SQL injection prevention with parameterized queries

## Deployment

### Production Build

```bash
npm run build
npm run start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t trading-dashboard .

# Run with ClickHouse
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
