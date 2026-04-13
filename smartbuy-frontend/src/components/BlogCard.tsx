"use client";

import React from "react";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { BlogPost } from "@/content/blogs";

interface BlogCardProps {
  post: BlogPost;
}

const categoryVariant: Record<BlogPost["category"], "default" | "secondary" | "success"> = {
  Feature: "default",
  Guide: "secondary",
  Tips: "success",
};

export default function BlogCard({ post }: BlogCardProps) {
  return (
    <Card className="group flex flex-col border-slate-200 bg-slate-50 transition-all hover:border-slate-300 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/5 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700 dark:hover:bg-slate-900/80">
      <CardHeader className="pb-3">
        <div className="mb-2">
          <Badge variant={categoryVariant[post.category]} className="text-xs">
            {post.category}
          </Badge>
        </div>
        <Link href={`/blog/${post.slug}`} className="block">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-slate-900 dark:text-slate-50 transition-colors group-hover:text-indigo-400">
            {post.title}
          </h3>
        </Link>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <p className="flex-1 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {post.description}
        </p>

        <div className="mt-4 flex items-center gap-4 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(post.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {post.readTime}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
