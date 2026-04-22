"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send reset link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-slate-950 px-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-slate-950 to-emerald-950/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <ShoppingBag className="h-8 w-8 text-indigo-400" />
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              SmartBuy
            </span>
          </Link>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Reset your password
          </p>
        </div>

        <Card className="border-slate-200 bg-slate-50/80 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-lg text-slate-900 dark:text-slate-100">
              Forgot Password
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {success ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Check your email
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    We sent a password reset link to{" "}
                    <span className="font-medium text-slate-900 dark:text-slate-200">{email}</span>.
                    Click the link in the email to reset your password.
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  Didn&apos;t receive it? Check your spam folder or{" "}
                  <button
                    onClick={() => setSuccess(false)}
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    try again
                  </button>
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Enter the email address associated with your account and we&apos;ll
                  send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        className="pl-10"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>

          <CardFooter className="justify-center border-t border-slate-200 pt-4 dark:border-slate-800">
            <Link
              href="/auth/login"
              className="flex items-center gap-1 text-sm text-indigo-400 transition-colors hover:text-indigo-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
