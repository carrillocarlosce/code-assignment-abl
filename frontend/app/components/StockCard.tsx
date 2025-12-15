import { useMemo } from "react";
import { PriceChart, type ChartPoint } from "./PriceChart";

interface StockCardProps {
  chartPoints: ChartPoint[];
  pair: string;
  price: number;
  decimals?: number;
  prefix?: string;
  hourlyAvg?: number;
  lastUpdate?: number;
}

export default function StockCard({
  chartPoints,
  pair,
  price,
  decimals,
  prefix,
  hourlyAvg,
  lastUpdate,
}: StockCardProps) {
  // Use provided chartPoints or fallback to sample data
  const displayChartPoints: ChartPoint[] = useMemo(() => {
    if (chartPoints && chartPoints.length > 0) {
      return chartPoints;
    }
    return [];
  }, [chartPoints]);

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
      {/* Header Section */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-white text-2xl font-semibold">{pair}</h1>
          <span className="text-white text-4xl font-bold">${price}</span>
        </div>
      </div>

      {/* Graph Section */}
      <div className=" bg-slate-900/50">
        <div className="relative ">
          <PriceChart
            points={displayChartPoints}
            decimals={decimals}
            prefix={prefix}
          />
        </div>
      </div>

      {/* Footer Section - Key Metrics */}
      <div className="p-6 border-t border-slate-700/50">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">1h Avg:</span>
            <span className="text-white font-semibold">
              {hourlyAvg ? `${prefix} ${hourlyAvg.toFixed(decimals)}` : "N/A"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Last update:</span>
            <span className="text-white font-semibold">
              {lastUpdate !== undefined
                ? new Date(lastUpdate).toLocaleString()
                : "N/A"}
            </span>
          </div>
          {/* <div className="flex items-center gap-2">
            <span className="text-slate-400">Close</span>
            <span className="text-white font-semibold">136.96</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Market Cap</span>
            <span className="text-white font-semibold">157 Trillion</span>
          </div> */}
        </div>
      </div>
    </div>
  );
}
