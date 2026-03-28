"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn, formatPrice, formatDate, platformColor, platformLabel } from "@/lib/utils";
import type { PriceRecord, PricePrediction } from "@/types";

interface PriceHistoryChartProps {
  history: PriceRecord[];
  predictions?: PricePrediction[];
  onFilterChange?: (days: number) => void;
}

const DATE_FILTERS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: 0 },
] as const;

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  [key: string]: string | number | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
      {payload.map(
        (
          entry: { color: string; name: string; value: number },
          idx: number
        ) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-600 dark:text-slate-300">
              {entry.name}:
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-50">
              {formatPrice(entry.value)}
            </span>
          </div>
        )
      )}
    </div>
  );
}

export default function PriceHistoryChart({
  history,
  predictions,
  onFilterChange,
}: PriceHistoryChartProps) {
  const [activeDays, setActiveDays] = useState(30);

  const platforms = useMemo(
    () => Array.from(new Set(history.map((r) => r.platform))),
    [history]
  );

  const chartData = useMemo(() => {
    // Filter history by date range
    let filtered = [...history];
    if (activeDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - activeDays);
      filtered = filtered.filter(
        (r) => r.scraped_at && new Date(r.scraped_at) >= cutoff
      );
    }

    // Group by date
    const dateMap = new Map<string, ChartDataPoint>();

    filtered.forEach((record) => {
      if (!record.scraped_at) return;
      const dateKey = record.scraped_at.slice(0, 10); // YYYY-MM-DD
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          dateLabel: formatDate(dateKey),
        });
      }
      const point = dateMap.get(dateKey)!;
      point[record.platform] = record.price;
    });

    // Add predictions as separate data keys
    if (predictions && predictions.length > 0) {
      predictions.forEach((pred) => {
        const dateKey = pred.date.slice(0, 10);
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            date: dateKey,
            dateLabel: formatDate(dateKey),
          });
        }
        const point = dateMap.get(dateKey)!;
        point["prediction"] = pred.predicted_price;
      });
    }

    return Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [history, predictions, activeDays]);

  const handleFilterClick = (days: number) => {
    setActiveDays(days);
    onFilterChange?.(days);
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No price history available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Date Range Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Range:
        </span>
        {DATE_FILTERS.map((filter) => (
          <Button
            key={filter.label}
            variant={activeDays === filter.days ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterClick(filter.days)}
            className="h-7 px-2.5 text-xs"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatPrice(v)}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            />

            {/* Platform lines */}
            {platforms.map((platform) => (
              <Line
                key={platform}
                type="monotone"
                dataKey={platform}
                name={platformLabel(platform)}
                stroke={platformColor(platform)}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 2 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}

            {/* Prediction line */}
            {predictions && predictions.length > 0 && (
              <Line
                type="monotone"
                dataKey="prediction"
                name="Predicted"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ r: 3, strokeWidth: 2, fill: "#8b5cf6" }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
