"use client";
import "../chartSetup";

import { useState } from "react";
import StockCard from "../components/StockCard";
import ConnectionStatus from "../components/ConnectionStatus";
import { ChartPoint } from "../components/PriceChart";
import { PAIRS } from "./pairs";
import { useWebSocket } from "../hooks/useWebSocket";

const MAX_POINTS = parseInt(process.env.NEXT_PUBLIC_MAX_POINTS || "50", 10);
const WEBSOCKET_URL =
  process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:8000";

export type PairChartState = {
  points: ChartPoint[];
  price: number;
  hourlyAvg: number;
  lastUpdate: number;
};
export type ChartState = {
  [pair: string]: PairChartState;
};

const defaultPairChartState: PairChartState = {
  points: [],
  price: 0,
  hourlyAvg: 0,
  lastUpdate: 0,
};
const pairChartInitialState: ChartState = PAIRS.reduce((acc, pair) => {
  acc[pair.pair as keyof ChartState] = defaultPairChartState;
  return acc;
}, {} as ChartState);

export default function Dashboard() {
  const [chartData, setChartData] = useState<ChartState>(pairChartInitialState);

  const { status, emit } = useWebSocket<{
    pair: string;
    timestamp: number;
    price: number;
    hourlyAvg: number;
  }>({
    url: WEBSOCKET_URL,
    autoConnect: true,
    onConnect: () =>
      emit("subscribe", { pairs: PAIRS.map((pair) => pair.pair) }),
    onMessage: (event, data) => {
      if (event === "rate_update") {
        const update = data;

        setChartData((prev) => {
          const existing = prev[update.pair] ?? defaultPairChartState;

          const nextPoints: ChartPoint[] = [
            ...existing.points,
            {
              x: update.timestamp,
              y: update.price,
            },
          ];

          if (nextPoints.length > MAX_POINTS) {
            nextPoints.shift();
          }

          return {
            ...prev,
            [update.pair]: {
              points: nextPoints,
              hourlyAvg: update.hourlyAvg,
              lastUpdate: update.timestamp,
              price: update.price,
            },
          };
        });
      }
    },
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-white">Dashboard</h1>
            <ConnectionStatus status={status} />
          </div>
        </header>

        {/* Stock Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PAIRS.map((pair) => (
            <StockCard
              key={pair.pair}
              chartPoints={chartData[pair.pair].points}
              pair={pair.pair}
              price={chartData[pair.pair].price}
              decimals={pair.decimals}
              prefix={pair.prefix}
              hourlyAvg={chartData[pair.pair].hourlyAvg}
              lastUpdate={chartData[pair.pair].lastUpdate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
