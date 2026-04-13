"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Search, ShoppingBag, Zap } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useProductSearch } from "@/hooks/useProducts";

const TRENDING_SEARCHES = [
  "iPhone 15",
  "Samsung Galaxy S24",
  "Sony WH-1000XM5",
  "MacBook Air M2",
  "iPad Air",
  "OnePlus 12",
];

export default function HomePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { results, loading, error, search } = useProductSearch();
  const [hasSearched, setHasSearched] = React.useState(false);

  const handleSearch = (query: string) => {
    if (!user) {
      router.push("/auth/login?redirect=/&reason=search");
      return;
    }
    setHasSearched(true);
    search(query);
  };

  const handleTrendingClick = (term: string) => {
    if (!user) {
      router.push("/auth/login?redirect=/&reason=search");
      return;
    }
    setHasSearched(true);
    search(term);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={user} onSignOut={signOut} />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-slate-950 to-emerald-950/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8">
          {/* Heading */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300">
              <Zap className="h-3.5 w-3.5" />
              AI-Powered Price Intelligence
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl lg:text-6xl">
              Compare Prices.{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                Track Drops.
              </span>{" "}
              Save Money.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 dark:text-slate-400 sm:text-lg">
              Search across Amazon, Flipkart, Croma and more. Get real-time
              price comparisons, AI predictions, coupon codes, and smart alerts
              -- all in one place.
            </p>
          </div>

          {/* Search Bar */}
          <SearchBar onSearch={handleSearch} loading={loading} />

          {/* Trending Searches */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-500">
              <TrendingUp className="h-3 w-3" />
              Trending:
            </span>
            {TRENDING_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => handleTrendingClick(term)}
                className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="flex-1 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {/* Error State */}
          {error && (
            <div className="mx-auto max-w-md rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center">
              <p className="text-sm font-medium text-red-400">{error}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                Please try again or use a different search term.
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div>
              <div className="mb-6 flex items-center gap-2">
                <Search className="h-4 w-4 animate-pulse text-indigo-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Searching across platforms...
                </span>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <Skeleton className="aspect-square w-full" />
                    <div className="space-y-3 p-4">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-6 w-24" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && !error && results && results.results.length > 0 && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {results.results.length} result
                    {results.results.length !== 1 ? "s" : ""} for{" "}
                    <span className="text-slate-900 dark:text-slate-50">
                      &ldquo;{results.query}&rdquo;
                    </span>
                  </h2>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.results.map((result) => (
                  <ProductCard key={result.product.id} result={result} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading &&
            !error &&
            hasSearched &&
            results &&
            results.results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <Search className="h-7 w-7 text-slate-500 dark:text-slate-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                  No products found
                </h3>
                <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-500">
                  We couldn&apos;t find any results for &ldquo;{results.query}
                  &rdquo;. Try a different search term or check the trending
                  searches above.
                </p>
              </div>
            )}

          {/* Initial State (no search yet) */}
          {!loading && !error && !hasSearched && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Search className="h-7 w-7 text-slate-500 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                Search to compare prices
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-500">
                Enter a product name above to compare prices across Amazon,
                Flipkart, Croma and more.
              </p>

              {/* Feature highlights */}
              <div className="mt-12 grid max-w-3xl gap-6 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
                    <Search className="h-5 w-5 text-indigo-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Compare Prices
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    See prices from multiple platforms side by side
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Track Price History
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    View historical price trends and AI predictions
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                    <Zap className="h-5 w-5 text-amber-400" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Smart Alerts
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    Get notified when prices drop to your target
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
