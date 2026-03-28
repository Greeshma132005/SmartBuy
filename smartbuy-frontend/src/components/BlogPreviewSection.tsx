"use client";

import React from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { blogPosts } from "@/content/blogs";
import BlogCard from "@/components/BlogCard";

export default function BlogPreviewSection() {
  const latestPosts = [...blogPosts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return (
    <section className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
              <BookOpen className="h-5 w-5 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-50">
              From Our Blog
            </h2>
          </div>
          <Link
            href="/blog"
            className="text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            View All Articles &rarr;
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latestPosts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
