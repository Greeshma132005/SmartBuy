export interface Product {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  image_url: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PriceRecord {
  id: string;
  product_id: string;
  platform: string;
  price: number;
  original_price: number | null;
  currency: string;
  product_url: string | null;
  in_stock: boolean;
  scraped_at: string | null;
}

export interface PricePrediction {
  date: string;
  predicted_price: number;
}

export interface PricePredictionResponse {
  product_id: string;
  platform: string;
  predictions: PricePrediction[];
  confidence_score: number;
  model_used: string;
  trend: "drop" | "stable" | "increase";
  summary: string;
}

export interface Coupon {
  id: string;
  platform: string;
  code: string | null;
  description: string;
  discount_type: string | null;
  discount_value: number | null;
  min_order_value: number | null;
  category: string | null;
  valid_from: string | null;
  valid_until: string | null;
  source_url: string | null;
  is_verified: boolean;
  created_at: string | null;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  product_id: string;
  target_price: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string | null;
}

export interface AlertWithProduct extends PriceAlert {
  product: Product | null;
  current_price: number | null;
}

export interface ComparisonResult {
  product: Product;
  prices: PriceRecord[];
  lowest_price: PriceRecord | null;
  highest_price: number | null;
  savings: number | null;
}

export interface SearchResponse {
  results: ComparisonResult[];
  query: string;
}

export interface PriceStats {
  min_price: number;
  max_price: number;
  avg_price: number;
  current_price: number;
  platform: string;
}

export interface DashboardSummary {
  active_alerts: number;
  triggered_alerts: number;
  tracked_products: number;
  recent_searches: { query: string; searched_at: string }[];
}

export interface AuthUser {
  id: string;
  email: string;
  metadata?: Record<string, unknown>;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface DealVerdict {
  verdict: 'GREAT_DEAL' | 'GOOD_PRICE' | 'FAIR_PRICE' | 'WAIT' | 'UNKNOWN';
  title: string;
  description: string;
  current_lowest: number;
  current_platform: string;
  all_time_low: number;
  all_time_low_platform: string;
  all_time_high: number;
  average_30d: number;
  percent_vs_average: number;
  percent_vs_all_time_low: number;
  price_position: number;
  confidence: 'high' | 'medium' | 'low';
  confidence_reason: string;
  data_points: number;
  color: 'green' | 'teal' | 'amber' | 'red' | 'gray';
}
