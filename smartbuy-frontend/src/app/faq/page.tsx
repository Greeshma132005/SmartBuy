"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, HelpCircle, Mail } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    question: "What is SmartBuy?",
    answer:
      "SmartBuy is a web-based price comparison platform that helps you find the best deals across major Indian e-commerce platforms like Amazon, Flipkart, Croma, and more.",
    category: "Getting Started",
  },
  {
    question: "Is SmartBuy free to use?",
    answer:
      "Yes, SmartBuy is completely free. Simply create an account to start comparing prices and tracking deals.",
    category: "Getting Started",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "Yes, you need to sign up with your email or Google account to use the search and comparison features. This helps us save your price alerts and search history.",
    category: "Getting Started",
  },
  {
    question: "Which e-commerce platforms does SmartBuy support?",
    answer:
      "We compare prices from Amazon India, Flipkart, Croma, Reliance Digital, TataCliq, Vijay Sales, and several other Indian online stores.",
    category: "Getting Started",
  },
  // Price Comparison
  {
    question: "How does price comparison work?",
    answer:
      "When you search for a product, SmartBuy fetches real-time prices from multiple e-commerce platforms and displays them side-by-side so you can easily see which store offers the best deal.",
    category: "Price Comparison",
  },
  {
    question: "Are the prices shown in real-time?",
    answer:
      "Yes, prices are fetched in real-time from Google Shopping data. However, prices can change at any time on the source platforms, so we recommend checking the store page before purchasing.",
    category: "Price Comparison",
  },
  {
    question: "Can I buy products directly from SmartBuy?",
    answer:
      "No, SmartBuy is a price comparison tool. We redirect you to the respective e-commerce platform where you can complete your purchase.",
    category: "Price Comparison",
  },
  // Price History & Predictions
  {
    question: "What is the Price History feature?",
    answer:
      "Price History shows you how a product's price has changed over time across different platforms. This helps you understand if the current price is a good deal or if you should wait.",
    category: "Price History & Predictions",
  },
  {
    question: "How accurate are the AI price predictions?",
    answer:
      "Our AI model provides predictions with a confidence score. Predictions with confidence above 80% are generally reliable. However, they are estimates based on historical patterns and should be used as guidance, not guarantees.",
    category: "Price History & Predictions",
  },
  {
    question: "How far back does price history go?",
    answer:
      "Price history is available from the time we first tracked the product. For seed data products, we have up to 60 days of historical data.",
    category: "Price History & Predictions",
  },
  // Price Alerts
  {
    question: "How do price alerts work?",
    answer:
      "Set a target price for any product. When our system detects the price has dropped to or below your target during scheduled checks, the alert is triggered and visible on your dashboard.",
    category: "Price Alerts",
  },
  {
    question: "How often are prices checked for alerts?",
    answer:
      "Prices are automatically checked every 6 hours for products with active alerts.",
    category: "Price Alerts",
  },
  {
    question: "Can I set multiple alerts?",
    answer:
      "Yes, you can set alerts for as many products as you want, each with a different target price.",
    category: "Price Alerts",
  },
  // Coupons & Deals
  {
    question: "Where do the coupon codes come from?",
    answer:
      "Coupon codes are aggregated from publicly available coupon sites and verified where possible. We match coupons to products by platform and category.",
    category: "Coupons & Deals",
  },
  {
    question: "Are all coupon codes guaranteed to work?",
    answer:
      "While we try to show verified coupons, some codes may expire or have restrictions. Always check the terms on the respective e-commerce site.",
    category: "Coupons & Deals",
  },
  // Technical
  {
    question: "Is my data safe with SmartBuy?",
    answer:
      "Yes. We use Supabase with Row Level Security for authentication and data storage. Your personal data is encrypted and only accessible to you.",
    category: "Technical",
  },
  {
    question: "Does SmartBuy work on mobile?",
    answer:
      "Yes, SmartBuy is fully responsive and works on all modern mobile browsers.",
    category: "Technical",
  },
];

// Derive unique categories in order
const categories = Array.from(
  new Map(faqData.map((item) => [item.category, true])).keys()
);

export default function FAQPage() {
  const { user, signOut } = useAuth();
  const [openIndex, setOpenIndex] = useState<number>(-1);

  const handleToggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? -1 : index));
  };

  // Track a global index across categories
  let globalIndex = 0;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Navbar user={user} onSignOut={signOut} />

      {/* Header */}
      <section className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-16 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-indigo-500/10 p-3">
            <HelpCircle className="h-8 w-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">
            Everything you need to know about SmartBuy
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          {categories.map((category) => {
            const categoryItems = faqData.filter(
              (item) => item.category === category
            );

            return (
              <div key={category} className="mb-10">
                <h2 className="mb-3 text-lg font-semibold text-indigo-400">
                  {category}
                </h2>
                <div className="space-y-2">
                  {categoryItems.map((item) => {
                    const currentIndex = globalIndex++;
                    const isOpen = openIndex === currentIndex;

                    return (
                      <div
                        key={currentIndex}
                        className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
                      >
                        <button
                          onClick={() => handleToggle(currentIndex)}
                          className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        >
                          <span className="pr-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                            {item.question}
                          </span>
                          <ChevronDown
                            className={`h-5 w-5 flex-shrink-0 text-slate-500 dark:text-slate-500 transition-transform duration-200 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        <div
                          className={`transition-all duration-200 ease-in-out ${
                            isOpen
                              ? "max-h-96 opacity-100"
                              : "max-h-0 opacity-0"
                          } overflow-hidden`}
                        >
                          <div className="border-t border-slate-200 px-5 pb-4 pt-3 dark:border-slate-800">
                            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                              {item.answer}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <Separator className="my-8" />

          {/* Still Have Questions Card */}
          <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="flex flex-col items-center p-8 text-center">
              <div className="mb-4 inline-flex items-center justify-center rounded-full bg-indigo-500/10 p-3">
                <Mail className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                Still have questions?
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
                We&apos;re here to help. Reach out to us and we&apos;ll get back
                to you as soon as possible.
              </p>
              <Link
                href="mailto:support@smartbuy.com"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                <Mail className="h-4 w-4" />
                Email Support
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
