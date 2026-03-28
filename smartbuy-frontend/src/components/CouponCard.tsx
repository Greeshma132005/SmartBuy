"use client";

import React, { useState } from "react";
import { Copy, Check, Tag, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, platformColor, platformLabel, formatDate } from "@/lib/utils";
import type { Coupon } from "@/types";

interface CouponCardProps {
  coupon: Coupon;
}

export default function CouponCard({ coupon }: CouponCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!coupon.code) return;
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = coupon.code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const discountText =
    coupon.discount_type === "percentage" && coupon.discount_value
      ? `${coupon.discount_value}% OFF`
      : coupon.discount_type === "flat" && coupon.discount_value
        ? `Flat ₹${coupon.discount_value} OFF`
        : null;

  return (
    <Card className="border-2 border-dashed border-slate-300 transition-colors hover:border-indigo-300 dark:border-slate-600 dark:hover:border-indigo-700">
      <CardContent className="flex flex-col gap-3 p-4">
        {/* Top Row: Platform + Verified */}
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: platformColor(coupon.platform) + "1A",
              color: platformColor(coupon.platform),
            }}
          >
            <Tag className="h-3 w-3" />
            {platformLabel(coupon.platform)}
          </span>
          <div className="flex items-center gap-2">
            {coupon.is_verified && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified
              </span>
            )}
            {discountText && (
              <Badge variant="destructive" className="text-xs">
                {discountText}
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {coupon.description}
        </p>

        {/* Coupon Code Box */}
        {coupon.code ? (
          <div className="flex items-stretch overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            <div className="flex flex-1 items-center bg-slate-50 px-4 py-2 dark:bg-slate-900">
              <code className="select-all text-sm font-bold tracking-wider text-slate-900 dark:text-slate-50">
                {coupon.code}
              </code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className={cn(
                "h-auto rounded-none border-l border-slate-200 px-3 dark:border-slate-700",
                copied && "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="ml-1 text-xs">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span className="ml-1 text-xs">Copy</span>
                </>
              )}
            </Button>
          </div>
        ) : (
          <p className="text-xs italic text-slate-400 dark:text-slate-500">
            No code needed -- discount applied automatically.
          </p>
        )}

        {/* Footer: Min order + Validity */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {coupon.min_order_value && (
            <span>Min. order: ₹{coupon.min_order_value}</span>
          )}
          {coupon.category && <span>Category: {coupon.category}</span>}
          {coupon.valid_until && (
            <span>Valid until: {formatDate(coupon.valid_until)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
