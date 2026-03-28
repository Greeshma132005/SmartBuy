"use client";

import React from "react";
import {
  ExternalLink,
  CheckCircle,
  XCircle,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cn,
  formatPrice,
  calculateDiscount,
  platformColor,
  platformLabel,
} from "@/lib/utils";
import type { PriceRecord } from "@/types";

interface PriceComparisonTableProps {
  prices: PriceRecord[];
}

export default function PriceComparisonTable({
  prices,
}: PriceComparisonTableProps) {
  if (!prices || prices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No price data available for comparison.
        </p>
      </div>
    );
  }

  const lowestPrice = Math.min(...prices.map((p) => p.price));
  const highestPrice = Math.max(...prices.map((p) => p.price));
  const maxSavings = highestPrice - lowestPrice;

  return (
    <div className="w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">
                Platform
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                Current Price
              </th>
              <th className="hidden px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400 sm:table-cell">
                Original Price
              </th>
              <th className="hidden px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400 md:table-cell">
                Discount
              </th>
              <th className="px-4 py-3 text-center font-medium text-slate-600 dark:text-slate-400">
                Stock
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {prices.map((record) => {
              const isLowest = record.price === lowestPrice;
              const discount = record.original_price
                ? calculateDiscount(record.price, record.original_price)
                : 0;

              return (
                <tr
                  key={record.id}
                  className={cn(
                    "border-b border-slate-100 transition-colors last:border-b-0 dark:border-slate-800",
                    isLowest
                      ? "bg-emerald-50/60 dark:bg-emerald-950/20"
                      : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  )}
                >
                  {/* Platform */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: platformColor(record.platform) }}
                      />
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {platformLabel(record.platform)}
                      </span>
                      {isLowest && (
                        <Badge variant="success" className="text-[10px] px-1.5 py-0">
                          Lowest
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Current Price */}
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "font-semibold",
                        isLowest
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-900 dark:text-slate-50"
                      )}
                    >
                      {formatPrice(record.price, record.currency)}
                    </span>
                  </td>

                  {/* Original Price */}
                  <td className="hidden px-4 py-3 text-right sm:table-cell">
                    {record.original_price &&
                    record.original_price > record.price ? (
                      <span className="text-slate-400 line-through">
                        {formatPrice(record.original_price, record.currency)}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">
                        --
                      </span>
                    )}
                  </td>

                  {/* Discount */}
                  <td className="hidden px-4 py-3 text-center md:table-cell">
                    {discount > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        -{discount}%
                      </Badge>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">
                        --
                      </span>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3 text-center">
                    {record.in_stock ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="hidden text-xs sm:inline">In Stock</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400">
                        <XCircle className="h-4 w-4" />
                        <span className="hidden text-xs sm:inline">
                          Out of Stock
                        </span>
                      </span>
                    )}
                  </td>

                  {/* Buy Link */}
                  <td className="px-4 py-3 text-right">
                    {record.product_url ? (
                      <a
                        href={record.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant={isLowest ? "default" : "outline"} className="gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Buy Now</span>
                        </Button>
                      </a>
                    ) : (
                      <Button size="sm" variant="outline" disabled className="gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Unavailable</span>
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Savings Summary */}
      {maxSavings > 0 && (
        <div className="flex items-center gap-2 border-t border-slate-200 bg-emerald-50/50 px-4 py-3 dark:border-slate-800 dark:bg-emerald-950/10">
          <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            You save up to{" "}
            <span className="font-bold">{formatPrice(maxSavings)}</span> by
            choosing the lowest-priced platform.
          </p>
        </div>
      )}
    </div>
  );
}
