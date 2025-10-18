# Real-Time Trading Dashboard

A comprehensive real-time trading dashboard built with Next.js, TypeScript, ClickHouse, and WebSockets for high-frequency trading (HFT) companies using FPGA-based technology.

## Features

### Real-Time Market Data Display

- Live price updates with WebSocket connections
- Real-time volume, bid/ask spreads, and 24h changes
- Responsive price tables with pagination

### Trade Execution Interface

- Swift buy/sell order execution
- Order types: Market
- Real-time order book visualization
- Immediate order status feedback

### System Performance Monitoring

- Real-time system metrics (latency, throughput, error rates)
- Component-wise performance tracking
- Alert mechanisms
- Interactive charts and visualizations

### Historical Data Access

- ClickHouse database integration for fast queries
- Historical trading data visualization
- Advanced filtering and pagination
- Time-range based data retrieval

### Responsive Design

- Mobile-first responsive design
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

7. **Update user role from user to admin**
   - ```docker exec -it clickhouse clickhouse-client -u default --password 123456 -q "
     ALTER TABLE trading_db.users
     UPDATE user_role = 'admin'
     WHERE email = 'user@email.com';
     "
     ```

## Project Structure

```
trading_dash/
├── scripts/                           
│   └── init-db.js                     
├── src/
│   ├── app/                           
│   │   ├── admin/                     
│   │   │   ├── settings/              
│   │   │         ├── page.tsx/        
│   │   ├── api/                        
│   │   │   ├── admin/                 
│   │   │         ├── users/           
│   │   │   ├── auth/                  
│   │   │         ├── logout/           
│   │   |         └── me/              
│   │   │   ├── metrics/                
│   │   │   ├── orderbook/             
│   │   │   ├── orders/                 
│   │   │   ├── prices/                 
│   │   │   ├── trades/                 
│   │   │   └── users/                  
│   │   ├── home/                       
|   |   |     └── page.tsx             
│   │   ├── unauthorized/              
|   |   |     └── page.tsx             
│   │   ├── globals.css                 
│   │   ├── layout.tsx                  
│   │   └── page.tsx                    
│   ├── components/                     
│   │   ├── OrderBook.tsx
│   │   ├── OrderHistory.tsx
│   │   ├── PriceTable.tsx
│   │   ├── SystemMetrics.tsx
│   │   ├── TradeExecution.tsx
│   │   ├── TradeHistory.tsx
│   │   ├── TradingDashboard.tsx
│   │   └── UserAuthForm.tsx
│   └── hooks/                          
│       └── useWebSocket.ts             
|   |── lib/                            
│   |    ├── auth.ts                   
│   |    ├── clickhouse.ts              
│   |    ├── config.ts                  
│   |    ├── utils.ts                  
│   |    ├── websocket-server.ts        
│   |    └── WebSocketProvider.tsx      
└── server.js                           
```