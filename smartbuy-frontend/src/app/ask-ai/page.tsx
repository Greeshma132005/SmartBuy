"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bot, Send, Plus, Trash2, Menu, X, Sparkles, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { formatPrice } from "@/lib/utils";
import {
  createChatSession,
  getChatSessions,
  getChatMessages,
  deleteChatSession,
  sendSessionMessage,
} from "@/lib/api";
import type { ChatSession, ChatMessageDB, ChatProductResult } from "@/types";

// ── Constants ────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE =
  "Hi! 👋 I'm your SmartBuy AI shopping assistant. I can help you:\n\n• Find the best deals on any product\n• Compare prices across platforms\n• Advise whether to buy now or wait\n• Explain product features\n\nWhat are you looking for today?";

const QUICK_CHIPS = [
  "Best phone under ₹20K",
  "Compare iPhone 15 vs Galaxy S24",
  "Should I buy a laptop now?",
  "Find deals on headphones",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupLabel(dateStr: string | null): string {
  if (!dateStr) return "Older";
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d >= today) return "Today";
  if (d >= yesterday) return "Yesterday";
  return "Older";
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AskAIPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDB[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  // Load sessions on mount
  useEffect(() => {
    if (!user || initialized) return;
    setInitialized(true);
    getChatSessions("askai").then(async (data: ChatSession[]) => {
      if (data.length > 0) {
        const sorted = [...data].sort(
          (a, b) => new Date(b.updated_at ?? "").getTime() - new Date(a.updated_at ?? "").getTime()
        );
        setSessions(sorted);
        setActiveSessionId(sorted[0].id);
        const msgs = await getChatMessages(sorted[0].id);
        setMessages(msgs);
      } else {
        const s = await createChatSession("askai");
        setSessions([s]);
        setActiveSessionId(s.id);
        setMessages([]);
      }
    });
  }, [user, initialized]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Session management ─────────────────────────────────────────────────────

  const handleNewChat = async () => {
    const s = await createChatSession("askai");
    setSessions((prev) => [s, ...prev]);
    setActiveSessionId(s.id);
    setMessages([]);
    setSidebarOpen(false);
  };

  const handleSwitchChat = async (id: string) => {
    setActiveSessionId(id);
    setSidebarOpen(false);
    const msgs = await getChatMessages(id);
    setMessages(msgs);
  };

  const handleDeleteChat = async (id: string) => {
    await deleteChatSession(id);
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        createChatSession("askai").then((s) => {
          setSessions([s]);
          setActiveSessionId(s.id);
          setMessages([]);
        });
        return [];
      }
      if (id === activeSessionId) {
        const next = filtered[0];
        setActiveSessionId(next.id);
        getChatMessages(next.id).then(setMessages);
      }
      return filtered;
    });
  };

  // ── Send message ───────────────────────────────────────────────────────────

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !activeSessionId) return;

    // Add user message locally
    const userMsg: ChatMessageDB = {
      id: `temp-${Date.now()}`,
      session_id: activeSessionId,
      role: "user",
      content: msg,
      products: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Update session title if first message
    if (messages.length === 0) {
      const title = msg.slice(0, 40) + (msg.length > 40 ? "..." : "");
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, title, updated_at: new Date().toISOString() } : s))
      );
    }

    try {
      const res = await sendSessionMessage(activeSessionId, msg, msg);
      const aiMsg: ChatMessageDB = {
        id: res.id ?? `temp-ai-${Date.now()}`,
        session_id: activeSessionId,
        role: "assistant",
        content: res.reply,
        products: res.products?.length ? res.products : null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Update session timestamp
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, updated_at: new Date().toISOString() } : s))
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          session_id: activeSessionId,
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again.",
          products: null,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Auth loading / redirect guard ──────────────────────────────────────────

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2 text-slate-500">
          <Bot className="h-5 w-5 animate-pulse" />
          Loading...
        </div>
      </div>
    );
  }

  // ── Group sessions by date ─────────────────────────────────────────────────

  const grouped: Record<string, ChatSession[]> = {};
  for (const s of sessions) {
    const label = groupLabel(s.updated_at);
    (grouped[label] ??= []).push(s);
  }
  const groupOrder = ["Today", "Yesterday", "Older"];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar user={user} onSignOut={signOut} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar overlay on mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-slate-200 bg-white pt-16 transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:z-auto lg:translate-x-0 lg:pt-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* New Chat button */}
          <div className="p-3">
            <button
              onClick={handleNewChat}
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-indigo-300 px-4 py-2.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
            {groupOrder.map((label) => {
              const items = grouped[label];
              if (!items || items.length === 0) return null;
              return (
                <div key={label}>
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {label}
                  </p>
                  <div className="space-y-1">
                    {items.map((session) => (
                      <div
                        key={session.id}
                        className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                          session.id === activeSessionId
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                        onClick={() => handleSwitchChat(session.id)}
                      >
                        <Sparkles className="h-4 w-4 shrink-0 opacity-60" />
                        <span className="min-w-0 flex-1 truncate">{session.title}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(session.id);
                          }}
                          className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
                          aria-label="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Chat area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <button
              className="rounded p-1 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              SmartBuy AI
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl space-y-4">
              {/* Welcome message if no messages */}
              {messages.length === 0 && (
                <div className="flex justify-start">
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                    {WELCOME_MESSAGE}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                        <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "rounded-br-md bg-indigo-600 text-white"
                          : "rounded-bl-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>

                  {/* Product cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="ml-9 mt-2 space-y-2">
                      {msg.products.map((p: ChatProductResult) => (
                        <Link
                          key={p.product_id}
                          href={`/product/${p.product_id}`}
                          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/50"
                        >
                          {p.image_url ? (
                            <Image
                              src={p.image_url}
                              alt={p.name}
                              width={48}
                              height={48}
                              className="h-12 w-12 rounded object-contain"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                              <Bot className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                              {p.name}
                            </p>
                            <div className="flex items-center gap-2">
                              {p.lowest_price && (
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatPrice(p.lowest_price)}
                                </span>
                              )}
                              {p.lowest_platform && (
                                <span className="text-xs text-slate-500">on {p.lowest_platform}</span>
                              )}
                              <span className="text-xs text-slate-400">· {p.num_platforms} stores</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                            View <ExternalLink className="h-3.5 w-3.5" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Quick chips */}
              {messages.length === 0 && !loading && (
                <div className="flex flex-wrap gap-2 pl-9">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleSend(chip)}
                      className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* Typing indicator */}
              {loading && (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                    <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 dark:bg-slate-800">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input bar */}
          <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any product..."
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
