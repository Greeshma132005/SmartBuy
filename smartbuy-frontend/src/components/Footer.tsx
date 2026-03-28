"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

const FOOTER_LINKS = {
  "Core Features": [
    { label: "Price Comparison", href: "/blog/how-smartbuy-compares-prices" },
    { label: "Price History", href: "/blog/understanding-price-history-charts" },
    { label: "AI Predictions", href: "/blog/ai-price-predictions" },
    { label: "Price Alerts", href: "/blog/smart-price-alerts-guide" },
    { label: "Coupon Codes", href: "/blog/how-coupon-codes-work" },
  ],
  Blog: [
    { label: "All Articles", href: "/blog" },
    { label: "Shopping Tips", href: "/blog/tips-save-money-online-shopping-india" },
    { label: "Best Time to Buy", href: "/blog/best-time-buy-smartphone-india" },
    { label: "Platform Comparison", href: "/blog/amazon-vs-flipkart-vs-croma-electronics" },
    { label: "How It Works", href: "/blog/technology-behind-smartbuy" },
  ],
  Company: [
    { label: "About Us", href: "/faq" },
    { label: "FAQ", href: "/faq" },
    { label: "Privacy Policy", href: "/faq" },
    { label: "Terms of Service", href: "/faq" },
    { label: "Contact Us", href: "mailto:support@smartbuy.com" },
  ],
  Resources: [
    { label: "Getting Started", href: "/auth/signup" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "SmartBuy vs Manual", href: "/blog/smartbuy-vs-manual-price-checking" },
    { label: "Supported Platforms", href: "/faq" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Top section */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <ShoppingBag className="h-6 w-6 text-indigo-400" />
              <span className="text-xl font-bold text-slate-50">SmartBuy</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Your all-in-one price comparison platform. Compare prices across
              Amazon, Flipkart, Croma, and more. Track price history, get AI
              predictions, and never overpay again.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                {title}
              </h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 transition-colors hover:text-slate-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-slate-800 pt-8 text-center">
          <p className="text-sm text-slate-500">
            Copyright &copy; {new Date().getFullYear()} SmartBuy &mdash; All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
