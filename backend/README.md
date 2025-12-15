# Real-time Cryptocurrency Exchange Rates Backend

A NestJS backend application that connects to Finnhub's WebSocket API to stream real-time cryptocurrency exchange rates, calculate hourly averages, and persist them to MongoDB.

## Features

- 🔌 Real-time WebSocket connection to Finnhub API
- 📊 Subscribes to three cryptocurrency pairs: ETH/USDC, ETH/USDT, ETH/BTC
- 📈 Calculates and persists hourly averages
- 🌐 Streams data to frontend clients via Socket.IO
- 🔄 Automatic reconnection with exponential backoff
- 💾 MongoDB persistence for hourly averages
- 📝 Comprehensive error handling and logging

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local instance or Docker)
- Finnhub API key (free tier available)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Finnhub API Key (required)
FINNHUB_API_KEY=your_finnhub_api_key_here

# MongoDB Connection (required)
MONGODB_URI=mongodb://localhost:27017/trading_db

# Server Port (optional, defaults to 8000)
PORT=8000
```

### 3. Get a Finnhub API Key

1. Visit [Finnhub](https://finnhub.io/)
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key
5. Add it to your `.env` file as `FINNHUB_API_KEY`

**Note:** The free tier provides sufficient rate limits for development and testing.

### 4. Set Up MongoDB

#### Option A: Using Docker (Recommended)

```bash
docker-compose up -d
```

This will start MongoDB on port 27017 with default credentials.

#### Option B: Local MongoDB Installation

If you have MongoDB installed locally, ensure it's running and update `MONGODB_URI` accordingly.

### 5. Run the Application

#### Development Mode

```bash
npm run start:dev
```

The server will start on `http://localhost:8000` (or your configured PORT).

#### Production Mode

```bash
npm run build
npm run start:prod
```

## API Endpoints

The backend exposes a WebSocket gateway for real-time data streaming:

- **WebSocket URL:** `ws://localhost:8000` (or your configured PORT)

### WebSocket Events

#### Client → Server

- `subscribe`: Subscribe to specific trading pairs
  ```json
  {
    "pairs": ["ETH/USDC", "ETH/USDT", "ETH/BTC"]
  }
  ```

#### Server → Client

- `rate_update`: Real-time rate update
  ```json
  {
    "pair": "ETH/USDC",
    "price": 2500.50,
    "hourlyAvg": 2501.20,
    "timestamp": 1234567890
  }
  ```

## Project Structure

```
src/
├── app.module.ts              # Root application module
├── main.ts                    # Application entry point
└── realtime/
    ├── finnhub/               # Finnhub WebSocket integration
    │   ├── finnhub.client.ts  # WebSocket client with reconnection logic
    │   ├── finnhub.service.ts # Service for handling Finnhub messages
    │   └── finnhub.types.ts   # TypeScript types
    ├── rates/                 # Rate processing and aggregation
    │   ├── rates.service.ts   # Main rate processing service
    │   ├── hourly-aggregator.service.ts  # Hourly average calculation
    │   ├── hourly-average.repository.ts # MongoDB repository
    │   └── hourly-average.schema.ts     # Mongoose schema
    └── stream/                # WebSocket streaming to clients
        ├── stream.gateway.ts  # Socket.IO gateway
        └── stream.service.ts  # Client management service
```

## Testing

### Run Unit Tests

```bash
npm run test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run E2E Tests

```bash
npm run test:e2e
```

### Generate Test Coverage

```bash
npm run test:cov
```

## Architecture

### Connection Management

The `FinnhubClient` implements robust connection management:

- **Automatic Reconnection**: Exponential backoff (1s → 60s max)
- **Heartbeat Monitoring**: Detects stale connections (60s timeout)
- **Re-subscription**: Automatically re-subscribes to symbols after reconnection
- **Error Handling**: Comprehensive error logging and recovery

### Data Flow

1. **FinnhubClient** connects to Finnhub WebSocket API
2. **FinnhubService** subscribes to trading pairs and processes messages
3. **RatesService** processes each tick and calculates running averages
4. **HourlyAggregatorService** aggregates ticks and persists hourly averages
5. **StreamService** broadcasts updates to connected frontend clients

### Persistence

Hourly averages are stored in MongoDB with the following schema:

- `pair`: Trading pair (e.g., "ETH/USDC")
- `hour`: Hour timestamp (Date)
- `average`: Calculated average price
- `count`: Number of ticks in the hour

## Troubleshooting

### Connection Issues

- Verify your `FINNHUB_API_KEY` is correct and active
- Check network connectivity
- Review logs for connection errors

### MongoDB Connection Issues

- Ensure MongoDB is running (`docker-compose up -d` or local instance)
- Verify `MONGODB_URI` is correct
- Check MongoDB logs for authentication errors

### No Data Received

- Verify the trading pairs are correctly subscribed
- Check Finnhub API status
- Review application logs for subscription errors

## Development

### Code Formatting

```bash
npm run format
```

### Linting

```bash
npm run lint
```

## License

UNLICENSED
