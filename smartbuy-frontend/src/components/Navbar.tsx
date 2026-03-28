"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag, User, LogOut, Home, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types";

interface NavbarProps {
  user: AuthUser | null;
  onSignOut?: () => void;
}

export default function Navbar({ user, onSignOut }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <ShoppingBag className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            SmartBuy
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-1 sm:flex">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Home className="h-4 w-4" />
              Home
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                  <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-300 sm:inline-block">
                  {user.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
                className="gap-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <nav className="flex items-center justify-center gap-1 border-t border-slate-100 py-1 sm:hidden dark:border-slate-800">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <Home className="h-3.5 w-3.5" />
            Home
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Button>
        </Link>
      </nav>
    </header>
  );
}
