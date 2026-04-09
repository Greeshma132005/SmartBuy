"use client";

import React, { useState, useRef, useEffect } from "react";
import { Share2, Check, Link, Send, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareButtonProps {
  productId: string;
  productName: string;
  bestPrice: number;
  bestPlatform: string;
  platformCount: number;
}

export default function ShareButton({
  productId,
  productName,
  bestPrice,
  bestPlatform,
  platformCount,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/product/${productId}`
      : `/product/${productId}`;

  const formattedPrice = bestPrice.toLocaleString("en-IN");

  const fullMessage = `🏷️ ${productName}\n\nBest price: ₹${formattedPrice} on ${bestPlatform}\nCompared across ${platformCount} platforms\n\nCheck it out on SmartBuy:\n${shareUrl}`;

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, "_blank");
    setOpen(false);
  };

  const handleTelegram = () => {
    const text = `🏷️ ${productName}\nBest price: ₹${formattedPrice} on ${bestPlatform}\nCompared across ${platformCount} platforms`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
    setOpen(false);
  };

  const handleTwitter = () => {
    const tweet = `🏷️ ${productName} — Best price ₹${formattedPrice} on ${bestPlatform}. Compared across ${platformCount} platforms on SmartBuy!`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
    setOpen(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 2000);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `${productName} — Best Price Comparison`,
        text: `Best price: ₹${formattedPrice} on ${bestPlatform}. Compared across ${platformCount} platforms.`,
        url: shareUrl,
      });
    } catch {
      // User cancelled or API unavailable
    }
    setOpen(false);
  };

  const items = [
    {
      label: "WhatsApp",
      icon: <MessageCircle className="h-4 w-4" />,
      onClick: handleWhatsApp,
      color: "text-[#25D366]",
    },
    {
      label: "Telegram",
      icon: <Send className="h-4 w-4" />,
      onClick: handleTelegram,
      color: "text-[#0088cc]",
    },
    {
      label: "X (Twitter)",
      icon: <span className="text-sm font-bold leading-none">𝕏</span>,
      onClick: handleTwitter,
      color: "text-slate-300",
    },
    {
      label: copied ? "Copied!" : "Copy Link",
      icon: copied ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <Link className="h-4 w-4" />
      ),
      onClick: handleCopy,
      color: copied ? "text-emerald-400" : "text-slate-300",
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className="gap-2"
        aria-label="Share this deal"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-xl transition-all duration-200"
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              onClick={item.onClick}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-800"
            >
              <span className={item.color}>{item.icon}</span>
              <span className={item.color === "text-emerald-400" ? "font-medium text-emerald-400" : "text-slate-300"}>
                {item.label}
              </span>
            </button>
          ))}

          {canNativeShare && (
            <>
              <div className="border-t border-slate-800" />
              <button
                role="menuitem"
                onClick={handleNativeShare}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800"
              >
                <Share2 className="h-4 w-4 text-slate-400" />
                More...
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
