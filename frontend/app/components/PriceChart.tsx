import { Line } from "react-chartjs-2";
import type { ChartOptions, ScriptableContext } from "chart.js";

export type ChartPoint = {
  x: number; // timestamp
  y: number; // price
};

export function PriceChart({
  points,
  decimals = 2,
  prefix = "$",
}: {
  points: ChartPoint[];
  decimals?: number;
  prefix?: string;
}) {
  // Create gradient for fill
  const getGradient = (ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.3)");
    gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.1)");
    gradient.addColorStop(1, "rgba(59, 130, 246, 0)");
    return gradient;
  };

  const data = {
    datasets: [
      {
        label: "Price",
        data: points,
        borderColor: "#3b82f6",
        backgroundColor: (context: ScriptableContext<"line">) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return undefined;
          return getGradient(ctx);
        },
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#60a5fa",
        pointHoverBorderColor: "#3b82f6",
        pointHoverBorderWidth: 2,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(30, 41, 59, 0.95)",
        titleColor: "#94a3b8",
        bodyColor: "#60a5fa",
        borderColor: "rgba(59, 130, 246, 0.5)",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        titleFont: {
          size: 12,
          weight: "normal",
        },
        bodyFont: {
          size: 14,
          weight: "bold",
        },
        callbacks: {
          title: (context) => {
            const xValue = context[0].parsed.x;
            if (xValue === null || xValue === undefined) return "";
            const date = new Date(xValue);
            return date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
          },
          label: (context) => {
            const yValue = context.parsed.y;
            if (yValue === null || yValue === undefined) return "";
            return `${prefix} ${yValue.toFixed(decimals)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "time",
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          display: false,
        },
      },
      y: {
        beginAtZero: false,
        grid: {
          color: "rgba(148, 163, 184, 0.1)",
          lineWidth: 1,
        },
        border: {
          display: false,
        },
        ticks: {
          color: "rgba(148, 163, 184, 0.7)",
          font: {
            size: 11,
          },
          callback: function (value) {
            return `${prefix} ${Number(value).toFixed(decimals)}`;
          },
          padding: 8,
        },
      },
    },
  };

  return (
    <div className="h-48 w-full p-4">
      <Line data={data} options={options} />
    </div>
  );
}
