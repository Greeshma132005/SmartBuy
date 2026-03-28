"use client";

import React, { useState } from "react";
import { Bell, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

interface AlertFormProps {
  productId: string;
  currentPrice: number;
  onSubmit: (targetPrice: number) => void;
  onClose: () => void;
  open?: boolean;
}

export default function AlertForm({
  productId,
  currentPrice,
  onSubmit,
  onClose,
  open = true,
}: AlertFormProps) {
  const [targetPrice, setTargetPrice] = useState(
    Math.floor(currentPrice * 0.9).toString()
  );
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(targetPrice);
    if (isNaN(value) || value <= 0) {
      setError("Please enter a valid price.");
      return;
    }
    if (value >= currentPrice) {
      setError("Target price should be lower than the current price.");
      return;
    }
    setError("");
    onSubmit(value);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTargetPrice(e.target.value);
    if (error) setError("");
  };

  const suggestedPrices = [
    { label: "10% less", price: Math.floor(currentPrice * 0.9) },
    { label: "20% less", price: Math.floor(currentPrice * 0.8) },
    { label: "30% less", price: Math.floor(currentPrice * 0.7) },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Set Price Alert
          </DialogTitle>
          <DialogDescription>
            We&apos;ll notify you when the price drops to your target.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Price Display */}
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Current Price
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-50">
                {formatPrice(currentPrice)}
              </span>
            </div>
          </div>

          {/* Target Price Input */}
          <div className="space-y-2">
            <label
              htmlFor="target-price"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              <Target className="h-4 w-4" />
              Target Price
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                ₹
              </span>
              <Input
                id="target-price"
                type="number"
                min="1"
                step="1"
                value={targetPrice}
                onChange={handlePriceChange}
                placeholder="Enter your target price"
                className="pl-7"
              />
            </div>
            {error && (
              <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
            )}
          </div>

          {/* Quick Suggestions */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Quick set:
            </span>
            <div className="flex flex-wrap gap-2">
              {suggestedPrices.map((suggestion) => (
                <Button
                  key={suggestion.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTargetPrice(suggestion.price.toString())}
                >
                  {suggestion.label} ({formatPrice(suggestion.price)})
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="gap-1.5">
              <Bell className="h-4 w-4" />
              Set Alert
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
