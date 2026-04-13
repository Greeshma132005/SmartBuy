"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  BellRing,
  ShoppingBag,
  Search,
  Trash2,
  Loader2,
  AlertCircle,
  ArrowRight,
  Clock,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import {
  getDashboardSummary,
  getAlerts,
  getSearchHistory,
  deleteAlert,
} from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";
import type {
  DashboardSummary,
  AlertWithProduct,
} from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertWithProduct[]>([]);
  const [searchHistory, setSearchHistory] = useState<
    { query: string; searched_at: string }[]
  >([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  // Fetch dashboard data
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoadingData(true);
      setError(null);
      try {
        const [summaryData, alertsData, historyData] = await Promise.all([
          getDashboardSummary().catch(() => null),
          getAlerts().catch(() => []),
          getSearchHistory().catch(() => []),
        ]);
        setSummary(summaryData);
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
        setSearchHistory(Array.isArray(historyData) ? historyData : []);
      } catch {
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoadingData(false);
      }
    }

    fetchData();
  }, [user]);

  const handleDeleteAlert = async (alertId: string) => {
    setDeletingId(alertId);
    try {
      await deleteAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      if (summary) {
        setSummary({
          ...summary,
          active_alerts: Math.max(0, summary.active_alerts - 1),
        });
      }
    } catch {
      // silent fail
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearchClick = (query: string) => {
    router.push(`/?q=${encodeURIComponent(query)}`);
  };

  const activeAlerts = alerts.filter((a) => a.is_active && !a.triggered_at);
  const triggeredAlerts = alerts.filter((a) => a.triggered_at);

  // Show nothing while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={user} onSignOut={signOut} />

      <main className="flex-1 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 sm:text-3xl">
              Welcome back
              {user.email ? `, ${user.email.split("@")[0]}` : ""}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Track your alerts, view price drops, and manage your watched
              products.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Summary Cards */}
          {loadingData ? (
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="mb-8 grid gap-4 sm:grid-cols-3">
              <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/10">
                    <Bell className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Active Alerts</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                      {summary?.active_alerts ?? activeAlerts.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                    <BellRing className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Triggered Alerts</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                      {summary?.triggered_alerts ?? triggeredAlerts.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                    <ShoppingBag className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Tracked Products</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                      {summary?.tracked_products ?? 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* Main Column */}
            <div className="space-y-8">
              {/* Active Alerts */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Active Alerts
                  </h2>
                  {activeAlerts.length > 0 && (
                    <Badge variant="secondary">{activeAlerts.length}</Badge>
                  )}
                </div>

                {loadingData ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                  </div>
                ) : activeAlerts.length === 0 ? (
                  <Card className="border-dashed border-slate-300 bg-transparent dark:border-slate-700">
                    <CardContent className="flex flex-col items-center py-10 text-center">
                      <Bell className="mb-3 h-8 w-8 text-slate-400 dark:text-slate-600" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        No active price alerts
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                        Search for a product and set a target price to get
                        notified.
                      </p>
                      <Link href="/">
                        <Button variant="outline" size="sm" className="mt-4 gap-1.5">
                          <Search className="h-3.5 w-3.5" />
                          Search Products
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {activeAlerts.map((alert) => (
                      <Card
                        key={alert.id}
                        className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/product/${alert.product_id}`}
                              className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-400 transition-colors"
                            >
                              {alert.product?.name ?? "Unknown Product"}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                              <span>
                                Target:{" "}
                                <span className="font-semibold text-emerald-400">
                                  {formatPrice(alert.target_price)}
                                </span>
                              </span>
                              {alert.current_price !== null && (
                                <span>
                                  Current:{" "}
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {formatPrice(alert.current_price)}
                                  </span>
                                </span>
                              )}
                              {alert.created_at && (
                                <span>
                                  Set on {formatDate(alert.created_at)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAlert(alert.id)}
                            disabled={deletingId === alert.id}
                            className="shrink-0 text-slate-500 dark:text-slate-500 hover:text-red-400"
                          >
                            {deletingId === alert.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              {/* Triggered Alerts */}
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Triggered Alerts
                  </h2>
                  {triggeredAlerts.length > 0 && (
                    <Badge variant="success">{triggeredAlerts.length}</Badge>
                  )}
                </div>

                {loadingData ? (
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                  </div>
                ) : triggeredAlerts.length === 0 ? (
                  <Card className="border-dashed border-slate-300 bg-transparent dark:border-slate-700">
                    <CardContent className="flex flex-col items-center py-10 text-center">
                      <BellRing className="mb-3 h-8 w-8 text-slate-400 dark:text-slate-600" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        No triggered alerts yet
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                        When a product hits your target price, it will appear
                        here.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {triggeredAlerts.map((alert) => (
                      <Card
                        key={alert.id}
                        className="border-emerald-500/20 bg-emerald-500/5 transition-colors hover:border-emerald-500/30"
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                            <BellRing className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/product/${alert.product_id}`}
                              className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-emerald-400 transition-colors"
                            >
                              {alert.product?.name ?? "Unknown Product"}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                              <span>
                                Target:{" "}
                                <span className="font-semibold text-emerald-400">
                                  {formatPrice(alert.target_price)}
                                </span>
                              </span>
                              {alert.triggered_at && (
                                <span>
                                  Triggered on{" "}
                                  {formatDate(alert.triggered_at)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Link href={`/product/${alert.product_id}`}>
                            <Button variant="outline" size="sm" className="gap-1.5">
                              View
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Recent Searches */}
              <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    Recent Searches
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {loadingData ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 rounded" />
                      ))}
                    </div>
                  ) : searchHistory.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-500">
                      No recent searches
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {searchHistory.slice(0, 10).map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSearchClick(item.query)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          <Search className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-500" />
                          <span className="min-w-0 flex-1 truncate">
                            {item.query}
                          </span>
                          {item.searched_at && (
                            <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-600">
                              {formatDate(item.searched_at)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 px-4 pb-4">
                  <Link href="/">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      size="sm"
                    >
                      <Search className="h-4 w-4" />
                      Search Products
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
