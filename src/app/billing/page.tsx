"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Crown,
  CreditCard,
  CheckCircle,
  Loader2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

interface SubscriptionData {
  id: string;
  status: string;
  plan: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}

interface BillingData {
  tier: string;
  subscription: SubscriptionData | null;
}

export default function BillingPage() {
  const { data: session, status: authStatus } = useSession();
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  const success = searchParams.get("success") === "true";

  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const isUser = !!userId && userId !== "admin";

  useEffect(() => {
    if (!isUser) return;
    fetch("/api/user/billing")
      .then((r) => r.json())
      .then((d: BillingData) => setBilling(d))
      .finally(() => setLoading(false));
  }, [isUser]);

  const handlePortal = async () => {
    setActionLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setActionLoading("");
    }
  };

  const handleUpgrade = async (plan: "pro_monthly" | "pro_yearly") => {
    setActionLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setActionLoading("");
    }
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isUser) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Please sign in to manage your billing.</p>
      </div>
    );
  }

  const sub = billing?.subscription;
  const isPro = billing?.tier === "pro";

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">Billing</h1>
      <p className="text-muted-foreground mb-8">Manage your subscription and payment methods</p>

      {/* Success banner */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-400">Welcome to Pro!</p>
            <p className="text-xs text-green-700 dark:text-green-500">Your subscription is now active. Enjoy all Pro features.</p>
          </div>
        </div>
      )}

      {/* Current plan card */}
      <div className="rounded-xl border bg-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isPro ? "bg-amber-100 dark:bg-amber-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
              <Crown className={`h-5 w-5 ${isPro ? "text-amber-600" : "text-gray-500"}`} />
            </div>
            <div>
              <h2 className="font-semibold">{isPro ? "Pro Plan" : "Free Plan"}</h2>
              <p className="text-xs text-muted-foreground">
                {sub ? (
                  sub.cancelAtPeriodEnd
                    ? `Cancels on ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews on ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                ) : (
                  "Basic access to EDU Passport"
                )}
              </p>
            </div>
          </div>
          {sub && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              sub.status === "active"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : sub.status === "trialing"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}>
              {sub.status === "trialing" ? "Trial" : sub.status}
            </span>
          )}
        </div>

        {sub?.trialEnd && new Date(sub.trialEnd) > new Date() && (
          <div className="flex items-center gap-2 text-xs text-blue-600 mb-4">
            <AlertCircle className="h-3.5 w-3.5" />
            Trial ends on {new Date(sub.trialEnd).toLocaleDateString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {isPro && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortal}
              disabled={!!actionLoading}
            >
              {actionLoading === "portal" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Manage Subscription
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Upgrade cards (show if not Pro) */}
      {!isPro && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Monthly */}
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold mb-1">Pro Monthly</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold">$9.99</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-600" /> AI-powered recommendations</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-600" /> Unlimited saved listings</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-600" /> Quick apply to jobs</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-600" /> Price drop alerts</li>
            </ul>
            <Button
              className="w-full"
              onClick={() => handleUpgrade("pro_monthly")}
              disabled={!!actionLoading}
            >
              {actionLoading === "pro_monthly" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Start 7-day free trial
            </Button>
          </div>

          {/* Yearly */}
          <div className="rounded-xl border-2 border-primary bg-card p-6 relative">
            <span className="absolute -top-3 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
              SAVE 33%
            </span>
            <h3 className="font-semibold mb-1">Pro Yearly</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold">$79.99</span>
              <span className="text-sm text-muted-foreground">/year</span>
            </div>
            <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-600" /> Everything in Monthly</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-600" /> 2 months free</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-600" /> Priority support</li>
              <li className="flex items-center gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-600" /> Early access to features</li>
            </ul>
            <Button
              className="w-full"
              onClick={() => handleUpgrade("pro_yearly")}
              disabled={!!actionLoading}
            >
              {actionLoading === "pro_yearly" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Start 7-day free trial
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
