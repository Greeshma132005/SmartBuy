"use client";

import { TrendingDown, ThumbsUp, Minus, Clock, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import type { DealVerdict } from "@/types";

interface DealVerdictCardProps {
  verdict: DealVerdict | null;
  loading?: boolean;
}

const VERDICT_STYLES = {
  green: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500",
    text: "text-emerald-400",
  },
  teal: {
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    badge: "bg-teal-500",
    text: "text-teal-400",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badge: "bg-amber-500",
    text: "text-amber-400",
  },
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    badge: "bg-red-500",
    text: "text-red-400",
  },
  gray: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    badge: "bg-slate-500",
    text: "text-slate-400",
  },
};

const VERDICT_ICONS = {
  GREAT_DEAL: TrendingDown,
  GOOD_PRICE: ThumbsUp,
  FAIR_PRICE: Minus,
  WAIT: Clock,
  UNKNOWN: HelpCircle,
};

function ConfidenceBars({
  level,
  colorClass,
}: {
  level: "high" | "medium" | "low";
  colorClass: string;
}) {
  const filled = level === "high" ? 3 : level === "medium" ? 2 : 1;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-5 h-1.5 rounded ${
            i <= filled ? colorClass : "bg-slate-300 dark:bg-slate-700"
          }`}
        />
      ))}
    </div>
  );
}

export default function DealVerdictCard({
  verdict,
  loading,
}: DealVerdictCardProps) {
  if (loading) {
    return <Skeleton className="h-40 rounded-lg" />;
  }

  if (!verdict) {
    return null;
  }

  const style = VERDICT_STYLES[verdict.color];
  const Icon = VERDICT_ICONS[verdict.verdict];

  // Compact card for UNKNOWN verdict with insufficient data
  if (verdict.verdict === "UNKNOWN" && verdict.data_points < 2) {
    return (
      <div
        className={`rounded-lg border border-slate-200 dark:border-slate-800 ${VERDICT_STYLES.gray.bg} p-4`}
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {verdict.title}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{verdict.description}</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-slate-200 dark:border-slate-800 ${style.bg} ${style.border} p-4 space-y-3`}
    >
      {/* Top row: badge + confidence */}
      <div className="flex items-center justify-between">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white ${style.badge}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {verdict.title}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-500 capitalize">
            {verdict.confidence}
          </span>
          <ConfidenceBars level={verdict.confidence} colorClass={style.badge} />
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-700 dark:text-slate-300">{verdict.description}</p>

      {/* Price range bar */}
      <div className="space-y-1.5">
        <div className="relative h-2 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "linear-gradient(to right, #10b981, #eab308, #ef4444)",
            }}
          />
          {/* Marker */}
          <div
            className="absolute top-1/2"
            style={{
              left: `${verdict.price_position * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border-2 border-white ${style.badge}`}
            />
          </div>
        </div>

        {/* Labels below bar */}
        <div className="flex items-start justify-between text-xs">
          <div className="text-left">
            <div className="text-emerald-400 font-medium">
              {formatPrice(verdict.all_time_low)}
            </div>
            <div className="text-slate-500 dark:text-slate-500">All-time low</div>
          </div>
          <div className="text-center">
            <div className="text-slate-900 dark:text-white font-medium">
              {formatPrice(verdict.current_lowest)}
            </div>
            <div className="text-slate-500 dark:text-slate-500">{verdict.current_platform}</div>
          </div>
          <div className="text-right">
            <div className="text-red-400 font-medium">
              {formatPrice(verdict.all_time_high)}
            </div>
            <div className="text-slate-500 dark:text-slate-500">All-time high</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="text-xs text-slate-500 dark:text-slate-500">
        30-day avg: {formatPrice(verdict.average_30d)} &middot;{" "}
        {verdict.data_points} price records
      </div>

      {/* Confidence reason */}
      <p className="text-xs text-slate-400 dark:text-slate-600">{verdict.confidence_reason}</p>
    </div>
  );
}
