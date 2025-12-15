## Coding Assignment

This repository contains a real‑time cryptocurrency dashboard:

- **backend/** – NestJS backend that connects to Finnhub, calculates hourly averages, and persists them to MongoDB.
- **frontend/** – Next.js frontend that connects to the backend WebSocket and visualizes live prices.

---

## Prerequisites

- **Node.js**: v20+ recommended  
- **Package manager**: `npm` (comes with Node)
- **MongoDB**: local instance or Docker
- **Finnhub API key**: free tier is sufficient for development

All commands below are run from the repo root unless otherwise noted.

---

## Backend (NestJS)

**Location**: `backend/`

The backend:

- Connects to **Finnhub** via WebSocket for real‑time crypto rates.
- Subscribes to pairs like **ETH/USDC**, **ETH/USDT**, **ETH/BTC**.
- Computes **hourly averages** and stores them in **MongoDB**.
- Streams data to the frontend using **Socket.IO**.

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Environment variables

Create a `.env` file in `backend/` (there is an `.env.example` you can copy):

```bash
cd backend
cp .env.example .env
```

At minimum, set:

```bash
FINNHUB_API_KEY=your_finnhub_api_key_here
MONGODB_URI=mongodb://localhost:27017/trading_db

# Optional (defaults to 8000 if omitted)
PORT=8000
```

- **Finnhub API key**: create a free account at `https://finnhub.io`, then copy your key into `FINNHUB_API_KEY`.
- **MongoDB URI**: update `MONGODB_URI` if you are not using the default local instance.

For tests that mock Mongo (e.g. some WebSocket e2e tests), `MONGODB_URI` may not be required, but it is needed for running the full app.

### 3. Start MongoDB

- **Option A – Docker (recommended from the backend README):**

  ```bash
  cd backend
  docker-compose up -d
  ```

- **Option B – Local MongoDB installation:**

  Make sure your local MongoDB server is running and that `MONGODB_URI` points to it.

### 4. Run the backend in development

```bash
cd backend
npm run start:dev
```

The server will start on `http://localhost:8000` (or your configured `PORT`).

### 5. Backend tests

- **Unit tests**:

  ```bash
  cd backend
  npm run test
  ```

- **Watch mode**:

  ```bash
  cd backend
  npm run test:watch
  ```

- **End‑to‑end (e2e) tests**:

  ```bash
  cd backend
  npm run test:e2e
  ```

- **Coverage**:

  ```bash
  cd backend
  npm run test:cov
  ```

### 6. Backend linting and formatting

```bash
cd backend
npm run lint
npm run format
```

### 7. Build and run backend for production

```bash
cd backend
npm run build
npm run start:prod
```

---

## Frontend (Next.js)

**Location**: `frontend/`

The frontend is a **Next.js App Router** app bootstrapped with `create-next-app`. It connects to the backend WebSocket and renders a dashboard of live crypto prices and hourly averages.

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Run the frontend in development

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:3000`.

> **Note:** Make sure the backend is running so the dashboard can connect to the WebSocket stream.

### 3. Frontend tests

```bash
cd frontend
npm test
```

### 4. Frontend linting

```bash
cd frontend
npm run lint
```

### 5. Build and run frontend for production

```bash
cd frontend
npm run build
npm start
```

---

## Typical local development workflow

1. **Start MongoDB** (Docker or local).
2. **Start the backend**:
   - `cd backend && npm install` (first time only)
   - `npm run start:dev`
3. **Start the frontend**:
   - `cd frontend && npm install` (first time only)
   - `npm run dev`
4. Open `http://localhost:3000` to view the dashboard (backend WebSocket at `http://localhost:8000` by default).
