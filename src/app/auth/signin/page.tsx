"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getPostLoginPath } from "@/lib/account-routing";
import { normalizeAccountType } from "@/lib/account-types";

function getSafeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const setSignInError = (code?: string | null) => {
    if (code === "UNVERIFIED_EMAIL") {
      setError("Please verify your email before signing in.");
      return;
    }

    if (code === "ACCOUNT_BANNED") {
      setError("Your account has been suspended.");
      return;
    }

    setError("Invalid email or password");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResendMessage("");
    setLoading(true);

    const res = await signIn("user-login", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!res?.ok || res.error) {
      setSignInError(res?.error);
      return;
    }

    if (callbackUrl) {
      window.location.assign(callbackUrl);
      return;
    }

    try {
      const profileRes = await fetch("/api/user/profile", { cache: "no-store" });
      if (profileRes.ok) {
        const body = await profileRes.json() as {
          user?: {
            role?: string | null;
            accountType?: string | null;
            profile?: { onboardingCompletedAt?: string | null } | null;
          } | null;
        };
        const user = body.user;
        window.location.assign(getPostLoginPath({
          role: user?.role,
          accountType: normalizeAccountType(user?.accountType),
          onboardingCompletedAt: user?.profile?.onboardingCompletedAt ?? null,
        }));
        return;
      }
    } catch {
      // Fall back to the public home page if the post-login profile lookup fails.
    }

    window.location.assign("/");
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMessage("");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data: { message?: string; error?: string } = await res.json();
      setResendMessage(res.ok ? (data.message || "Verification email sent.") : (data.error || "Unable to resend verification email."));
    } catch {
      setResendMessage("Unable to resend verification email.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border bg-card p-8 shadow-xl shadow-primary/5">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-lg mb-4">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your EDU Passport account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3 border border-destructive/20">
                {error}
                {error === "Please verify your email before signing in." && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendLoading || !email}
                    className="mt-2 block text-xs font-semibold text-destructive underline-offset-4 hover:underline disabled:opacity-60"
                  >
                    {resendLoading ? "Sending verification email..." : "Resend verification email"}
                  </button>
                )}
              </div>
            )}

            {resendMessage && (
              <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                {resendMessage}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-11 rounded-xl"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in...</>
              ) : (
                <>Sign In <ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline font-semibold">
              Sign up
            </Link>
          </p>
        </div>

        {/* Admin link */}
        <div className="mt-6 text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">Admin?</span>
            </div>
          </div>
          <Link href="/admin/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Go to admin login
          </Link>
        </div>
      </div>
    </div>
  );
}
