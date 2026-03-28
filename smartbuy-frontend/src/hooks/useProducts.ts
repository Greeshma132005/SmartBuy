"use client";

import { useState, useCallback } from "react";
import {
  searchProducts,
  getProduct,
  getPriceHistory,
  getPricePrediction,
  getProductCoupons,
} from "@/lib/api";
import type {
  SearchResponse,
  Product,
  PriceRecord,
  PriceStats,
  PricePredictionResponse,
  Coupon,
} from "@/types";

export function useProductSearch() {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchProducts(query);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

export function useProductDetail(productId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [prices, setPrices] = useState<PriceRecord[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [priceStats, setPriceStats] = useState<PriceStats | null>(null);
  const [prediction, setPrediction] = useState<PricePredictionResponse | null>(
    null
  );
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const productData = await getProduct(productId);
      setProduct(productData.product);
      setPrices(productData.prices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const fetchPriceHistory = useCallback(
    async (platform?: string, days?: number) => {
      try {
        const data = await getPriceHistory(productId, platform, days);
        setPriceHistory(data.history || []);
        setPriceStats(data.stats || null);
      } catch {
        // silent fail for supplementary data
      }
    },
    [productId]
  );

  const fetchPrediction = useCallback(
    async (platform?: string) => {
      try {
        const data = await getPricePrediction(productId, platform);
        setPrediction(data);
      } catch {
        // prediction may not be available
      }
    },
    [productId]
  );

  const fetchCoupons = useCallback(async () => {
    try {
      const data = await getProductCoupons(productId);
      setCoupons(data);
    } catch {
      // coupons may not be available
    }
  }, [productId]);

  return {
    product,
    prices,
    priceHistory,
    priceStats,
    prediction,
    coupons,
    loading,
    error,
    fetchProduct,
    fetchPriceHistory,
    fetchPrediction,
    fetchCoupons,
  };
}
