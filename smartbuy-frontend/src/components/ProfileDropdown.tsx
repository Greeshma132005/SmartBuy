"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, LogOut, ChevronDown } from "lucide-react";

import { useTheme } from "@/contexts/ThemeContext";

interface ProfileDropdownProps {
  userEmail: string;
  onSignOut: () => void;
}

export default function ProfileDropdown({
  userEmail,
  onSignOut,
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const initials = userEmail ? userEmail.charAt(0).toUpperCase() : "U";

  const handleSignOut = () => {
    setIsOpen(false);
    onSignOut();
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors
                   hover:bg-slate-100 dark:hover:bg-slate-800
                   focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Profile menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-600 text-white text-sm font-semibold">
          {initials}
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-500 dark:text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-72 rounded-xl overflow-hidden border shadow-xl z-50
                     bg-white border-slate-200 shadow-slate-200/40
                     dark:bg-slate-900 dark:border-slate-700 dark:shadow-black/40"
          role="menu"
          aria-orientation="vertical"
        >
          {/* User Info */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-600 text-white text-base font-semibold flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-slate-900 dark:text-white">
                  {userEmail}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  SmartBuy Account
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-700" />

          {/* Theme Toggle */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon size={18} className="text-indigo-400" />
                ) : (
                  <Sun size={18} className="text-amber-500" />
                )}
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {theme === "dark" ? "Dark Mode" : "Light Mode"}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTheme();
                }}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  theme === "dark" ? "bg-indigo-600" : "bg-slate-300"
                }`}
                role="switch"
                aria-checked={theme === "dark"}
                aria-label="Toggle dark mode"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${
                    theme === "dark" ? "translate-x-5" : "translate-x-0"
                  }`}
                >
                  {theme === "dark" ? (
                    <Moon size={12} className="text-indigo-600" />
                  ) : (
                    <Sun size={12} className="text-amber-500" />
                  )}
                </span>
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-700" />

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors
                       hover:bg-red-50 dark:hover:bg-red-900/20
                       text-red-600 dark:text-red-400"
            role="menuitem"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
