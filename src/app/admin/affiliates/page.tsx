"use client";

import { DollarSign, MousePointerClick, TrendingUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useFetch } from "@/hooks/useFetch";

interface ProviderStat {
  id: string;
  name: string;
  slug: string;
  affiliateTag: string | null;
  commissionRate: number | null;
  totalClicks: number;
  estimatedRevenue: number;
}

interface RecentClick {
  id: string;
  affiliateTag: string | null;
  commission: number | null;
  createdAt: string;
  listing: { title: string; slug: string };
}

interface AffiliateData {
  providers: ProviderStat[];
  totals: { clicks: number; estimatedRevenue: number };
  recentClicks: RecentClick[];
  dailyClickCount: number;
}

export default function AffiliatesPage() {
  const { data, loading } = useFetch<AffiliateData>("/api/admin/affiliates");

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading affiliate data...</div>;
  }

  if (!data) {
    return <div className="py-20 text-center text-muted-foreground">Failed to load data</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
        <p className="text-muted-foreground">Track affiliate clicks and estimated revenue</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <MousePointerClick className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Affiliate Clicks</p>
              <p className="text-2xl font-bold">{data.totals.clicks.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Est. Revenue</p>
              <p className="text-2xl font-bold">${data.totals.estimatedRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Partners</p>
              <p className="text-2xl font-bold">{data.providers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Breakdown */}
      <div className="rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Affiliate Partners</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium">Provider</th>
                <th className="text-left p-3 font-medium">Affiliate Tag</th>
                <th className="text-right p-3 font-medium">Commission</th>
                <th className="text-right p-3 font-medium">Clicks</th>
                <th className="text-right p-3 font-medium">Est. Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.providers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No affiliate partners configured yet. Add affiliateTag to providers in the database.
                  </td>
                </tr>
              ) : (
                data.providers.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.affiliateTag}</code></td>
                    <td className="p-3 text-right">{p.commissionRate ? `${(p.commissionRate * 100).toFixed(0)}%` : "—"}</td>
                    <td className="p-3 text-right">{p.totalClicks.toLocaleString()}</td>
                    <td className="p-3 text-right font-medium">${p.estimatedRevenue.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Clicks */}
      <div className="rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Recent Affiliate Clicks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium">Listing</th>
                <th className="text-left p-3 font-medium">Tag</th>
                <th className="text-right p-3 font-medium">Commission</th>
                <th className="text-right p-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {data.recentClicks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">No affiliate clicks yet</td>
                </tr>
              ) : (
                data.recentClicks.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="p-3">
                      <Link href={`/listing/${c.listing.slug}`} className="hover:underline flex items-center gap-1">
                        {c.listing.title} <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                    <td className="p-3"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{c.affiliateTag}</code></td>
                    <td className="p-3 text-right">{c.commission ? `$${c.commission.toFixed(2)}` : "—"}</td>
                    <td className="p-3 text-right text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
