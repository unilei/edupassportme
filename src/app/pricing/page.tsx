"use client";

import { useSession } from "next-auth/react";
import { SessionProvider } from "next-auth/react";
import { Check, X, Crown, Zap, Sparkles, Shield, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";

const features = [
  { name: "Browse all listings", free: true, pro: true },
  { name: "Save up to 20 listings", free: true, pro: false, proLabel: "Unlimited saves" },
  { name: "Personalized recommendations", free: true, pro: true },
  { name: "Up to 3 saved searches", free: true, pro: false, proLabel: "Unlimited saved searches" },
  { name: "Sponsored ads shown", free: true, pro: false, proLabel: "Ad-free experience" },
  { name: "Quick Apply for jobs", free: false, pro: true },
  { name: "Resume builder & storage", free: false, pro: true },
  { name: "Application tracking", free: false, pro: true },
  { name: "Priority in recommendations", free: false, pro: true },
  { name: "Early access to new features", free: false, pro: true },
];

function PricingContent() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const userTier = (session?.user as Record<string, unknown> | undefined)?.tier as string | undefined;
  const isPro = userTier === "pro";

  const handleUpgrade = async (plan: string) => {
    if (!userId || userId === "admin") return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (res.ok) {
        setSuccess(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg mb-6">
          <Crown className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Welcome to Pro!</h1>
        <p className="text-muted-foreground mb-8 text-lg">Your account has been upgraded. Enjoy all Pro features.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/profile"><Button className="gradient-primary hover:opacity-90">Go to Profile</Button></Link>
          <Link href="/for-you"><Button variant="outline">View Recommendations</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      {/* Header */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
          <Sparkles className="h-4 w-4" /> Upgrade your learning journey
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-balance">
          Choose Your{" "}
          <span className="bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Plan
          </span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-balance">
          Get more from EDU Passport with Pro — unlimited saves, ad-free browsing, quick apply, and more.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-12">
        <div className="flex items-center bg-muted rounded-xl p-1">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              billing === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              billing === "annual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold">
              Save 33%
            </span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free */}
        <div className="rounded-2xl border bg-card p-8 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted">
              <Zap className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Free</h2>
              <p className="text-sm text-muted-foreground">For casual learners</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold">$0</span>
              <span className="text-muted-foreground">/forever</span>
            </div>
          </div>

          <Button variant="outline" className="w-full mb-8 h-11 rounded-xl" disabled>Current Plan</Button>

          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f.name} className="flex items-start gap-3 text-sm">
                {f.free ? (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted shrink-0 mt-0.5">
                    <X className="h-3 w-3 text-muted-foreground/40" />
                  </div>
                )}
                <span className={f.free ? "" : "text-muted-foreground/60"}>{f.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className="rounded-2xl border-2 border-primary bg-card p-8 relative hover:shadow-xl hover:shadow-primary/10 transition-all duration-300">
          {/* Badge */}
          <div className="absolute -top-4 left-8">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
              <Star className="h-3 w-3 fill-white" />
              Most Popular
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4 mt-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-primary shadow-md">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Pro</h2>
              <p className="text-sm text-muted-foreground">For serious learners</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold">{billing === "annual" ? "$8" : "$12"}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            {billing === "annual" && (
              <p className="text-sm text-muted-foreground mt-2">
                Billed <span className="font-semibold text-foreground">$96/year</span>
              </p>
            )}
          </div>

          {status === "loading" ? (
            <Button className="w-full mb-8 h-11 rounded-xl" disabled>Loading...</Button>
          ) : !userId || userId === "admin" ? (
            <Link href="/auth/signup" className="block mb-8">
              <Button className="w-full h-11 rounded-xl gradient-primary hover:opacity-90 transition-opacity">
                Sign Up to Upgrade <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          ) : isPro ? (
            <Button className="w-full mb-8 h-11 rounded-xl" disabled>
              <Shield className="h-4 w-4 mr-2" /> Active Pro Member
            </Button>
          ) : (
            <Button
              className="w-full mb-8 h-11 rounded-xl gradient-primary hover:opacity-90 transition-opacity"
              onClick={() => handleUpgrade(billing)}
              disabled={loading}
            >
              {loading ? "Upgrading..." : "Upgrade to Pro"}
            </Button>
          )}

          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f.name} className="flex items-start gap-3 text-sm">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <span>{f.proLabel || f.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FAQ / note */}
      <div className="text-center mt-12">
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Cancel anytime. Pro subscription auto-renews. Payment processing powered by Stripe (coming soon — currently in demo mode).
        </p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <SessionProvider>
      <PricingContent />
    </SessionProvider>
  );
}
