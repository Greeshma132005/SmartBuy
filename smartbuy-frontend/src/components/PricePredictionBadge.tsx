"use client";

import React from "react";
import { TrendingDown, TrendingUp, Minus, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice, formatDate, platformLabel } from "@/lib/utils";
import type { PricePredictionResponse } from "@/types";

interface PricePredictionBadgeProps {
  prediction: PricePredictionResponse | null;
}

const trendConfig = {
  drop: {
    icon: TrendingDown,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    badgeVariant: "success" as const,
    label: "Price Drop Expected",
  },
  stable: {
    icon: Minus,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900",
    border: "border-slate-200 dark:border-slate-800",
    badgeVariant: "secondary" as const,
    label: "Price Stable",
  },
  increase: {
    icon: TrendingUp,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    badgeVariant: "destructive" as const,
    label: "Price Increase Expected",
  },
};

export default function PricePredictionBadge({
  prediction,
}: PricePredictionBadgeProps) {
  if (!prediction) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 p-4">
          <Brain className="h-5 w-5 text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Price Prediction
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Not enough data to generate a prediction.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = trendConfig[prediction.trend];
  const TrendIcon = config.icon;
  const confidencePercent = Math.round(prediction.confidence_score * 100);

  // Get the most relevant prediction (the latest one)
  const latestPrediction =
    prediction.predictions.length > 0
      ? prediction.predictions[prediction.predictions.length - 1]
      : null;

  // Calculate the drop/increase amount from first to last prediction
  const priceDelta =
    prediction.predictions.length >= 2
      ? Math.abs(
          prediction.predictions[prediction.predictions.length - 1]
            .predicted_price - prediction.predictions[0].predicted_price
        )
      : null;

  return (
    <Card className={cn("border", config.border, config.bg)}>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Trend Info */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              config.bg
            )}
          >
            <TrendIcon className={cn("h-5 w-5", config.color)} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant={config.badgeVariant}>{config.label}</Badge>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                on {platformLabel(prediction.platform)}
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {prediction.trend === "drop" && priceDelta && (
                <>
                  Price likely to drop by ~
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatPrice(priceDelta)}
                  </span>
                </>
              )}
              {prediction.trend === "increase" && priceDelta && (
                <>
                  Price may increase by ~
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {formatPrice(priceDelta)}
                  </span>
                </>
              )}
              {prediction.trend === "stable" &&
                "Price is expected to remain stable."}
              {!priceDelta &&
                prediction.trend !== "stable" &&
                prediction.summary}
            </p>
            {latestPrediction && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Predicted price:{" "}
                <span className="font-medium">
                  {formatPrice(latestPrediction.predicted_price)}
                </span>{" "}
                by {formatDate(latestPrediction.date)}
              </p>
            )}
          </div>
        </div>

        {/* Right: Confidence */}
        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Confidence
            </p>
            <p
              className={cn(
                "text-lg font-bold",
                confidencePercent >= 70
                  ? "text-emerald-600 dark:text-emerald-400"
                  : confidencePercent >= 40
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-500 dark:text-red-400"
              )}
            >
              {confidencePercent}%
            </p>
          </div>
          {/* Confidence bar */}
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                confidencePercent >= 70
                  ? "bg-emerald-500"
                  : confidencePercent >= 40
                    ? "bg-amber-500"
                    : "bg-red-500"
              )}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
