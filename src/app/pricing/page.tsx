"use client";

import { useSession } from "next-auth/react";
import { SessionProvider } from "next-auth/react";
import { Check, X, Crown, Zap, Sparkles, Shield, ArrowRight, Star, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";

const features = [
  { name: "Browse all opportunities", free: true, pro: true },
  { name: "Track up to 20 opportunities", free: true, pro: false, proLabel: "Unlimited opportunity tracking" },
  { name: "Personalized recommendations", free: true, pro: false, proLabel: "Priority recommendations with fit reasons" },
  { name: "Up to 3 saved searches", free: true, pro: false, proLabel: "Unlimited saved searches" },
  { name: "Sponsored ads shown", free: true, pro: false, proLabel: "Ad-free experience" },
  { name: "Quick Apply for jobs", free: false, pro: true },
  { name: "Deadline and next-action reminders", free: false, pro: true },
  { name: "Application pipeline tracking", free: false, pro: true },
  { name: "Early access to new features", free: false, pro: true },
];

const SUPPORT_EMAIL = "support@edupassport.me";

function PricingContent() {
  const { data: session, status } = useSession();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const userTier = (session?.user as Record<string, unknown> | undefined)?.tier as string | undefined;
  const userEmail = session?.user?.email || "";
  const isPro = userTier === "pro";
  const planLabel = billing === "annual" ? "Pro Yearly" : "Pro Monthly";
  const contactBody = `Hi EDU Passport team,\n\nPlease activate ${planLabel} for my account.${userEmail ? `\n\nAccount email: ${userEmail}` : ""}`;
  const contactHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Activate ${planLabel}`)}&body=${encodeURIComponent(contactBody)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      {/* Header */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
          <Sparkles className="h-4 w-4" /> Upgrade your opportunity workspace
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-balance">
          Choose Your{" "}
          <span className="bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Plan
          </span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-balance">
          Get more from EDU Passport with Pro — unlimited tracking, fit reasons, reminders, Quick Apply, and fewer distractions.
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
              <p className="text-sm text-muted-foreground">For exploring opportunities</p>
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
              <p className="text-sm text-muted-foreground">For active applicants and planners</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold">{billing === "annual" ? "$79.99" : "$9.99"}</span>
              <span className="text-muted-foreground">/{billing === "annual" ? "year" : "month"}</span>
            </div>
            {billing === "annual" && (
              <p className="text-sm text-muted-foreground mt-2">
                About <span className="font-semibold text-foreground">$6.67/month</span> billed yearly
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
            <a href={contactHref} className="block mb-8">
              <Button className="w-full h-11 rounded-xl gradient-primary hover:opacity-90 transition-opacity">
                <Mail className="h-4 w-4 mr-2" /> Contact to Activate
              </Button>
            </a>
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
          Pro access is manually activated by the EDU Passport admin after payment confirmation.
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
