import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency: string = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function calculateDiscount(
  price: number,
  originalPrice: number
): number {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function platformColor(platform: string): string {
  const colors: Record<string, string> = {
    amazon: "#FF9900",
    flipkart: "#2874F0",
    croma: "#0F7C40",
    myntra: "#FF3F6C",
  };
  return colors[platform.toLowerCase()] || "#6366F1";
}

export function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    amazon: "Amazon",
    flipkart: "Flipkart",
    croma: "Croma",
    myntra: "Myntra",
  };
  return labels[platform.toLowerCase()] || platform;
}
