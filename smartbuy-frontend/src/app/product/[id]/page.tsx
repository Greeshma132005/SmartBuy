"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Bell,
  Tag,
  BarChart3,
  Brain,
  Ticket,
  Loader2,
  AlertCircle,
  Share2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ShareButton from "@/components/ShareButton";
import DealVerdictCard from "@/components/DealVerdictCard";
import PriceComparisonTable from "@/components/PriceComparisonTable";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import PricePredictionBadge from "@/components/PricePredictionBadge";
import CouponCard from "@/components/CouponCard";
import AlertForm from "@/components/AlertForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useProductDetail } from "@/hooks/useProducts";
import { createAlert } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const { user, signOut } = useAuth();
  const {
    product,
    prices,
    priceHistory,
    prediction,
    coupons,
    verdict,
    verdictLoading,
    loading,
    error,
    fetchProduct,
    fetchPriceHistory,
    fetchPrediction,
    fetchCoupons,
    fetchVerdict,
  } = useProductDetail(productId);

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    if (productId) {
      fetchProduct();
      fetchPriceHistory();
      fetchPrediction();
      fetchCoupons();
      fetchVerdict();
    }
  }, [productId, fetchProduct, fetchPriceHistory, fetchPrediction, fetchCoupons, fetchVerdict]);

  const handleDateRangeChange = (days: number) => {
    fetchPriceHistory(undefined, days || undefined);
  };

  const handleAlertSubmit = async (targetPrice: number) => {
    try {
      await createAlert(productId, targetPrice);
      setAlertOpen(false);
      setAlertSuccess(true);
      setTimeout(() => setAlertSuccess(false), 4000);
    } catch {
      // Error handling is done in the AlertForm
    }
  };

  const lowestPrice = prices.length > 0
    ? Math.min(...prices.map((p) => p.price))
    : null;

  const lowestPricePlatform = prices.length > 0
    ? prices.reduce((min, p) => (p.price < min.price ? p : min), prices[0]).platform
    : "";

  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const handleNativeShare = async () => {
    if (!product) return;
    try {
      await navigator.share({
        title: `${product.name} — Best Price Comparison`,
        text: `Best price: ₹${lowestPrice?.toLocaleString("en-IN")} on ${lowestPricePlatform}. Compared across ${prices.length} platforms.`,
        url: window.location.href,
      });
    } catch {
      // User cancelled
    }
  };

  // ── Loading State ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar user={user} onSignOut={signOut} />
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="mb-6 h-8 w-24" />
          <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
          <div className="mt-10 space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-[350px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar user={user} onSignOut={signOut} />
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            Failed to load product
          </h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-500">
            {error || "The product could not be found. It may have been removed or the link is invalid."}
          </p>
          <Button
            variant="outline"
            className="mt-6 gap-2"
            onClick={() => router.push("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  // ── Main Content ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={user} onSignOut={signOut} />

      <main className="flex-1 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => router.push("/")}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </button>

          {/* Product Header */}
          <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
            {/* Image */}
            <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              {product.image_url ? (
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-contain p-6"
                  sizes="(max-width: 1024px) 100vw, 360px"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 dark:text-slate-600">
                  <svg
                    className="h-20 w-20"
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
            </div>

            {/* Info */}
            <div className="flex flex-col gap-4">
              {product.category && (
                <Badge variant="secondary" className="w-fit">
                  {product.category}
                </Badge>
              )}

              <h1 className="text-2xl font-bold leading-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                {product.name}
              </h1>

              {product.description && (
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {product.description}
                </p>
              )}

              {/* Quick Price Summary */}
              {lowestPrice !== null && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                    Best Price
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-400">
                    {formatPrice(lowestPrice)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-500">
                    Compared across {prices.length} platform
                    {prices.length !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-auto flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    if (!user) {
                      router.push("/auth/login");
                      return;
                    }
                    setAlertOpen(true);
                  }}
                  className="gap-2"
                >
                  <Bell className="h-4 w-4" />
                  Set Price Alert
                </Button>
                {lowestPrice !== null && (
                  <ShareButton
                    productId={productId}
                    productName={product.name}
                    bestPrice={lowestPrice}
                    bestPlatform={lowestPricePlatform}
                    platformCount={prices.length}
                  />
                )}
              </div>

              {/* Alert success toast */}
              {alertSuccess && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-400">
                  Price alert created successfully! We&apos;ll notify you when
                  the price drops.
                </div>
              )}
            </div>
          </div>

          <Separator className="my-10" />

          {/* Deal Verdict */}
          <DealVerdictCard verdict={verdict} loading={verdictLoading} />

          <Separator className="my-10" />

          {/* Price Comparison Table */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Price Comparison
              </h2>
            </div>
            <PriceComparisonTable prices={prices} />
          </section>

          <Separator className="my-10" />

          {/* Price History Chart */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Price History
              </h2>
            </div>
            <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <CardContent className="p-4 sm:p-6">
                <PriceHistoryChart
                  history={priceHistory}
                  predictions={prediction?.predictions}
                  onFilterChange={handleDateRangeChange}
                />
              </CardContent>
            </Card>
          </section>

          <Separator className="my-10" />

          {/* AI Price Prediction */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                AI Price Prediction
              </h2>
            </div>
            <PricePredictionBadge prediction={prediction} />
          </section>

          {/* Coupons */}
          {coupons.length > 0 && (
            <>
              <Separator className="my-10" />
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Available Coupons
                  </h2>
                  <Badge variant="secondary" className="ml-1">
                    {coupons.length}
                  </Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {coupons.map((coupon) => (
                    <CouponCard key={coupon.id} coupon={coupon} />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* Alert Form Dialog */}
      {alertOpen && lowestPrice !== null && (
        <AlertForm
          productId={productId}
          currentPrice={lowestPrice}
          onSubmit={handleAlertSubmit}
          onClose={() => setAlertOpen(false)}
          open={alertOpen}
        />
      )}

      {/* Mobile floating share button */}
      {canNativeShare && lowestPrice !== null && (
        <div className="fixed bottom-6 right-6 z-50 md:hidden">
          <button
            onClick={handleNativeShare}
            aria-label="Share this deal"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition-colors hover:bg-emerald-700"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
