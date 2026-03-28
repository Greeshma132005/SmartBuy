import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Products ─────────────────────────────────────────────────────────────────

export async function searchProducts(query: string) {
  const { data } = await api.get("/api/products/search", { params: { q: query } });
  return data;
}

export async function getProduct(productId: string) {
  const { data } = await api.get(`/api/products/${productId}`);
  return data;
}

// ── Prices ───────────────────────────────────────────────────────────────────

export async function getPriceHistory(
  productId: string,
  platform?: string,
  days?: number
) {
  const { data } = await api.get(`/api/products/${productId}/prices`, {
    params: { platform, days },
  });
  return data;
}

export async function getPricePrediction(productId: string, platform?: string) {
  const { data } = await api.get(`/api/products/${productId}/prices/predict`, {
    params: { platform },
  });
  return data;
}

export async function getDealVerdict(productId: string) {
  try {
    const { data } = await api.get(`/api/products/${productId}/verdict`);
    return data;
  } catch {
    return null;
  }
}

// ── Coupons ──────────────────────────────────────────────────────────────────

export async function getCoupons(platform?: string, category?: string) {
  const { data } = await api.get("/api/coupons", {
    params: { platform, category },
  });
  return data;
}

export async function getProductCoupons(productId: string) {
  const { data } = await api.get(`/api/products/${productId}/coupons`);
  return data.coupons ?? data;
}

// ── Alerts ───────────────────────────────────────────────────────────────────

export async function createAlert(productId: string, targetPrice: number) {
  const { data } = await api.post("/api/alerts", {
    product_id: productId,
    target_price: targetPrice,
  });
  return data;
}

export async function getAlerts() {
  const { data } = await api.get("/api/alerts");
  return data;
}

export async function deleteAlert(alertId: string) {
  const { data } = await api.delete(`/api/alerts/${alertId}`);
  return data;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardSummary() {
  const { data } = await api.get("/api/alerts/dashboard/summary");
  // Normalize recent_searches field names
  if (data.recent_searches) {
    data.recent_searches = data.recent_searches.map((s: Record<string, unknown>) => ({
      ...s,
      searched_at: s.searched_at ?? s.created_at,
    }));
  }
  return data;
}

export async function getSearchHistory() {
  const { data } = await api.get("/api/alerts/dashboard/history");
  // Backend returns {searches: [...]} — normalize to array
  const searches = data.searches ?? data;
  // Normalize field name: backend uses created_at, frontend expects searched_at
  return searches.map((s: Record<string, unknown>) => ({
    ...s,
    searched_at: s.searched_at ?? s.created_at,
  }));
}

export default api;
