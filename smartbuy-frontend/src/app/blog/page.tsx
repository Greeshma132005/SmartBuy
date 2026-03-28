"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { blogPosts } from "@/content/blogs";
import BlogCard from "@/components/BlogCard";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["All", "Feature", "Guide", "Tips"] as const;

export default function BlogPage() {
  const { user, signOut } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const filteredPosts =
    activeCategory === "All"
      ? blogPosts
      : blogPosts.filter((post) => post.category === activeCategory);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar user={user} onSignOut={signOut} />

      {/* Header */}
      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-50 sm:text-5xl">
            SmartBuy Blog
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-400">
            Tips, guides, and insights to help you shop smarter
          </p>

          {/* Category Filter Pills */}
          <div className="mt-8 flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className="focus:outline-none"
              >
                <Badge
                  variant={activeCategory === category ? "default" : "outline"}
                  className={`cursor-pointer px-4 py-1.5 text-sm transition-colors ${
                    activeCategory === category
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  }`}
                >
                  {category}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {filteredPosts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <h3 className="text-lg font-semibold text-slate-300">
                No posts found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                No blog posts match the selected category.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
