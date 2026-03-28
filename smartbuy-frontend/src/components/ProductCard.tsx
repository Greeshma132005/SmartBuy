"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatPrice,
  calculateDiscount,
  platformColor,
  platformLabel,
} from "@/lib/utils";
import type { ComparisonResult } from "@/types";

interface ProductCardProps {
  result: ComparisonResult;
}

export default function ProductCard({ result }: ProductCardProps) {
  const { product, prices, lowest_price, savings } = result;

  const discount =
    lowest_price && lowest_price.original_price
      ? calculateDiscount(lowest_price.price, lowest_price.original_price)
      : 0;

  const uniquePlatforms = Array.from(new Set(prices.map((p) => p.platform)));

  return (
    <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      {/* Product Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50 dark:bg-slate-900">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain p-4 transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300 dark:text-slate-600">
            <svg
              className="h-16 w-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Discount Badge */}
        {discount > 0 && (
          <Badge variant="destructive" className="absolute left-2 top-2">
            -{discount}%
          </Badge>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* Category */}
        {product.category && (
          <Badge variant="secondary" className="w-fit text-xs">
            {product.category}
          </Badge>
        )}

        {/* Name */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900 dark:text-slate-50">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mt-auto flex items-baseline gap-2">
          {lowest_price ? (
            <>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatPrice(lowest_price.price, lowest_price.currency)}
              </span>
              {lowest_price.original_price &&
                lowest_price.original_price > lowest_price.price && (
                  <span className="text-sm text-slate-400 line-through">
                    {formatPrice(
                      lowest_price.original_price,
                      lowest_price.currency
                    )}
                  </span>
                )}
            </>
          ) : (
            <span className="text-sm text-slate-500">Price unavailable</span>
          )}
        </div>

        {/* Savings Info */}
        {savings != null && savings > 0 && (
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Save up to {formatPrice(savings)} across platforms
          </p>
        )}

        {/* Platform Badges */}
        <div className="flex flex-wrap gap-1.5">
          {uniquePlatforms.map((platform) => (
            <span
              key={platform}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300"
              style={{
                backgroundColor: platformColor(platform) + "1A",
                borderWidth: 1,
                borderColor: platformColor(platform) + "40",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: platformColor(platform) }}
              />
              {platformLabel(platform)}
            </span>
          ))}
        </div>
      </CardContent>

      <CardFooter className="border-t border-slate-100 p-4 dark:border-slate-800">
        <Link href={`/product/${product.id}`} className="w-full">
          <Button variant="outline" className="w-full gap-2" size="sm">
            <ExternalLink className="h-3.5 w-3.5" />
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
