"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { blogPosts } from "@/content/blogs";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import BlogCard from "@/components/BlogCard";

const categoryColors: Record<string, string> = {
  Feature: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  Guide: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Tips: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function BlogArticlePage() {
  const { user, signOut } = useAuth();
  const params = useParams();
  const slug = params?.slug as string;

  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950">
        <Navbar user={user} onSignOut={signOut} />
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <h1 className="text-4xl font-extrabold text-slate-50">404</h1>
          <p className="mt-3 text-lg text-slate-400">
            Blog post not found.
          </p>
          <Link href="/blog" className="mt-6">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const relatedPosts = blogPosts
    .filter((p) => p.slug !== slug)
    .slice(0, 3);

  const contentParagraphs = post.content.split("\n\n");

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Navbar user={user} onSignOut={signOut} />

      {/* Article */}
      <article className="mx-auto w-full max-w-3xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {/* Category Badge */}
        <Badge
          variant="outline"
          className={`mb-4 border ${categoryColors[post.category] ?? "text-slate-400 border-slate-700"}`}
        >
          {post.category}
        </Badge>

        {/* Title */}
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-50 sm:text-4xl">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {new Date(post.date).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {post.readTime}
          </span>
        </div>

        <Separator className="my-8" />

        {/* Content */}
        <div className="space-y-5">
          {contentParagraphs.map((paragraph, index) => (
            <p
              key={index}
              className="text-base leading-relaxed text-slate-300"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <Separator className="my-12" />

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section>
            <h2 className="mb-6 text-2xl font-bold text-slate-50">
              Related Articles
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <BlogCard key={relatedPost.slug} post={relatedPost} />
              ))}
            </div>
          </section>
        )}

        <Separator className="my-12" />

        {/* CTA Banner */}
        <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 p-8 text-center">
          <h3 className="text-xl font-bold text-slate-50">
            Ready to start saving?
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            Search for any product and compare prices across platforms instantly.
          </p>
          <Link href="/" className="mt-5 inline-block">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              Search products now
              <span aria-hidden="true">&rarr;</span>
            </Button>
          </Link>
        </div>
      </article>
    </div>
  );
}
