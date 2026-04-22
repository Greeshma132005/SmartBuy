"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle, X, Minus, Send, Bot, ExternalLink,
  Plus, List, Trash2, ArrowLeft, Clock,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import {
  createChatSession,
  getChatSessions,
  getChatMessages,
  deleteChatSession,
  sendSessionMessage,
} from "@/lib/api";
import type { ChatSession, ChatMessageDB, ChatMessage, ChatProductResult } from "@/types";
import { formatPrice } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatEntry {
  message: ChatMessage;
  products?: ChatProductResult[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const WELCOME_ENTRY: ChatEntry = {
  message: {
    role: "assistant",
    content:
      "Hi! 👋 I'm your SmartBuy AI shopping assistant. I can help you:\n\n• Find the best deals on any product\n• Compare prices across platforms\n• Advise whether to buy now or wait\n• Explain product features\n\nWhat are you looking for today?",
  },
};

const QUICK_CHIPS = [
  "Best phone under ₹20K",
  "Compare iPhone 15 vs Galaxy S24",
  "Should I buy a laptop now?",
  "Find deals on headphones",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function dbMsgToEntry(m: ChatMessageDB): ChatEntry {
  return {
    message: { role: m.role, content: m.content },
    products: m.products ?? undefined,
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AIChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showList, setShowList] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChatEntry[]>([WELCOME_ENTRY]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions from DB when widget opens and user is authenticated
  useEffect(() => {
    if (!isOpen || !user || sessionsLoaded) return;
    setSessionsLoaded(true);
    getChatSessions("widget").then(async (data: ChatSession[]) => {
      if (data.length > 0) {
        const sorted = [...data].sort(
          (a, b) => new Date(b.updated_at ?? "").getTime() - new Date(a.updated_at ?? "").getTime()
        );
        setSessions(sorted);
        setActiveId(sorted[0].id);
        try {
          const msgs = await getChatMessages(sorted[0].id);
          if (msgs.length > 0) {
            setEntries(msgs.map(dbMsgToEntry));
          } else {
            setEntries([WELCOME_ENTRY]);
          }
        } catch {
          setEntries([WELCOME_ENTRY]);
        }
      } else {
        try {
          const s = await createChatSession("widget");
          setSessions([s]);
          setActiveId(s.id);
        } catch {
          /* user may not be fully authed yet */
        }
        setEntries([WELCOME_ENTRY]);
      }
    }).catch(() => {
      setEntries([WELCOME_ENTRY]);
    });
  }, [isOpen, user, sessionsLoaded]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries, loading]);

  // ── Session management ─────────────────────────────────────

  const handleNewChat = async () => {
    try {
      const s = await createChatSession("widget");
      setSessions((prev) => [s, ...prev]);
      setActiveId(s.id);
      setEntries([WELCOME_ENTRY]);
    } catch {
      /* ignore */
    }
    setShowList(false);
  };

  const handleSwitchChat = async (id: string) => {
    setActiveId(id);
    setShowList(false);
    try {
      const msgs = await getChatMessages(id);
      if (msgs.length > 0) {
        setEntries(msgs.map(dbMsgToEntry));
      } else {
        setEntries([WELCOME_ENTRY]);
      }
    } catch {
      setEntries([WELCOME_ENTRY]);
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      await deleteChatSession(id);
    } catch {
      /* ignore */
    }
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        createChatSession("widget").then((s) => {
          setSessions([s]);
          setActiveId(s.id);
          setEntries([WELCOME_ENTRY]);
        }).catch(() => {});
        return [];
      }
      if (id === activeId) {
        const next = filtered[0];
        setActiveId(next.id);
        getChatMessages(next.id).then((msgs) => {
          if (msgs.length > 0) {
            setEntries(msgs.map(dbMsgToEntry));
          } else {
            setEntries([WELCOME_ENTRY]);
          }
        }).catch(() => setEntries([WELCOME_ENTRY]));
      }
      return filtered;
    });
  };

  // ── Send message ───────────────────────────────────────────

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;

    if (!user) {
      setEntries((prev) => [
        ...prev,
        { message: { role: "user", content: msg } },
        { message: { role: "assistant", content: "Please sign in to chat with me! Go to the login page to get started." } },
      ]);
      setInput("");
      return;
    }

    // Ensure we have an active session
    let sessionId = activeId;
    if (!sessionId) {
      try {
        const s = await createChatSession("widget");
        setSessions((prev) => [s, ...prev]);
        setActiveId(s.id);
        sessionId = s.id;
      } catch {
        return;
      }
    }

    // Add user message locally
    const userEntry: ChatEntry = { message: { role: "user", content: msg } };
    setEntries((prev) => [...prev, userEntry]);
    setInput("");
    setLoading(true);

    // Update session title if it's the first real message
    const isFirstMsg = entries.length <= 1; // only welcome entry
    if (isFirstMsg) {
      const title = msg.slice(0, 30) + (msg.length > 30 ? "..." : "");
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title, updated_at: new Date().toISOString() } : s))
      );
    }

    try {
      const res = await sendSessionMessage(sessionId!, msg);
      const aiEntry: ChatEntry = {
        message: { role: "assistant", content: res.reply },
        products: res.products?.length ? res.products : undefined,
      };
      setEntries((prev) => [...prev, aiEntry]);

      // Update session timestamp
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, updated_at: new Date().toISOString() } : s))
      );
    } catch {
      setEntries((prev) => [
        ...prev,
        { message: { role: "assistant", content: "I'm having trouble connecting right now. Please try again." } },
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

  // ── Collapsed ──────────────────────────────────────────────

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-700"
        aria-label="Open AI chat"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
        </span>
      </button>
    );
  }

  // ── Minimized ──────────────────────────────────────────────

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex w-72 items-center justify-between rounded-xl bg-indigo-600 px-4 py-3 text-white shadow-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="text-sm font-semibold">SmartBuy AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(false)} className="rounded p-1 hover:bg-indigo-500"><Minus className="h-4 w-4" /></button>
          <button onClick={() => { setIsOpen(false); setIsMinimized(false); }} className="rounded p-1 hover:bg-indigo-500"><X className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  // ── Chat List View ─────────────────────────────────────────

  if (showList) {
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.updated_at ?? "").getTime() - new Date(a.updated_at ?? "").getTime()
    );
    return (
      <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between bg-indigo-600 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <List className="h-5 w-5" />
            <span className="text-sm font-semibold">Chat History</span>
          </div>
          <button onClick={() => setShowList(false)} className="rounded p-1 hover:bg-indigo-500"><X className="h-4 w-4" /></button>
        </div>

        {/* New Chat button */}
        <button
          onClick={handleNewChat}
          className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 px-4 py-2.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {sorted.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                session.id === activeId
                  ? "border-indigo-500/50 bg-indigo-500/10"
                  : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              }`}
              onClick={() => handleSwitchChat(session.id)}
            >
              <Bot className="h-5 w-5 shrink-0 text-indigo-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {session.title}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  {timeAgo(session.updated_at)}
                </div>
              </div>
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

        {/* Back button */}
        <div className="border-t border-slate-200 px-4 py-2 dark:border-slate-700">
          <button
            onClick={() => setShowList(false)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  // ── Chat View ──────────────────────────────────────────────

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between bg-indigo-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="text-sm font-semibold">SmartBuy AI</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowList(true)} className="rounded p-1 hover:bg-indigo-500" aria-label="Chat history">
            <List className="h-4 w-4" />
          </button>
          <button onClick={handleNewChat} className="rounded p-1 hover:bg-indigo-500" aria-label="New chat">
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={() => setIsMinimized(true)} className="rounded p-1 hover:bg-indigo-500"><Minus className="h-4 w-4" /></button>
          <button onClick={() => setIsOpen(false)} className="rounded p-1 hover:bg-indigo-500"><X className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {entries.map((entry, i) => (
          <div key={i}>
            <div className={`flex ${entry.message.role === "user" ? "justify-end" : "justify-start"}`}>
              {entry.message.role === "assistant" && (
                <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                  <Bot className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  entry.message.role === "user"
                    ? "rounded-br-md bg-indigo-600 text-white"
                    : "rounded-bl-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                }`}
              >
                {entry.message.content}
                {entry.message.role === "assistant" && entry.message.content.includes("sign in") && !user && (
                  <Link href="/auth/login" className="mt-2 block text-xs font-medium text-indigo-600 underline dark:text-indigo-400">
                    Go to Sign In →
                  </Link>
                )}
              </div>
            </div>

            {/* Product cards */}
            {entry.products && entry.products.length > 0 && (
              <div className="ml-8 mt-2 space-y-2">
                {entry.products.map((p) => (
                  <Link
                    key={p.product_id}
                    href={`/product/${p.product_id}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/50"
                  >
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} width={40} height={40} className="h-10 w-10 rounded object-contain" unoptimized />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 dark:bg-slate-700">
                        <Bot className="h-4 w-4 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">{p.name}</p>
                      <div className="flex items-center gap-2">
                        {p.lowest_price && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(p.lowest_price)}</span>}
                        {p.lowest_platform && <span className="text-[10px] text-slate-500">on {p.lowest_platform}</span>}
                        <span className="text-[10px] text-slate-400">· {p.num_platforms} stores</span>
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Quick chips */}
        {entries.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 pl-8">
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
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
              <Bot className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
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

      {/* Input */}
      <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about any product..."
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
