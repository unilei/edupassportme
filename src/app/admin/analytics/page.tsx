"use client";

import { useEffect, useState } from "react";
import {
  Users, Crown, MousePointerClick, FileText, TrendingUp,
  Megaphone, DollarSign, BarChart3, ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface OverviewData {
  totalUsers: number;
  proUsers: number;
  newUsersThisMonth: number;
  totalListings: number;
  totalClicks: number;
  clicksThisMonth: number;
  clicksThisWeek: number;
  totalApplications: number;
  totalSponsored: number;
  sponsoredActive: number;
  affiliateClicks: number;
}

interface TopListing {
  id: string;
  title: string;
  slug: string;
  type: string;
  clickCount: number;
  provider: { name: string };
}

interface TopProvider {
  id: string;
  name: string;
  slug: string;
  listingCount: number;
}

interface RecentUser {
  id: string;
  email: string;
  name: string | null;
  tier: string;
  createdAt: string;
}

interface ClickDay {
  date: string;
  count: number;
}

interface TypeDist {
  type: string;
  count: number;
}

interface AnalyticsData {
  overview: OverviewData;
  typeDistribution: TypeDist[];
  topListings: TopListing[];
  topProviders: TopProvider[];
  recentUsers: RecentUser[];
  clickTrend: ClickDay[];
}

function MiniBarChart({ data, maxBars = 30 }: { data: ClickDay[]; maxBars?: number }) {
  const sliced = data.slice(-maxBars);
  const max = Math.max(...sliced.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-0.5 h-32">
      {sliced.map((d) => (
        <div key={d.date} className="flex-1 group relative flex flex-col items-center justify-end">
          <div
            className="w-full bg-primary/80 rounded-t-sm min-h-0.5 transition-all group-hover:bg-primary"
            style={{ height: `${(d.count / max) * 100}%` }}
          />
          <div className="absolute -top-8 bg-card border rounded px-2 py-1 text-[10px] whitespace-nowrap hidden group-hover:block shadow z-10">
            {d.date}: {d.count} clicks
          </div>
        </div>
      ))}
    </div>
  );
}

const typeColors: Record<string, string> = {
  course: "bg-blue-500",
  job: "bg-green-500",
  event: "bg-purple-500",
  deal: "bg-orange-500",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <BarChart3 className="h-5 w-5 animate-pulse mr-2" /> Loading analytics...
      </div>
    );
  }

  if (!data) {
    return <div className="py-20 text-center text-muted-foreground">Failed to load analytics</div>;
  }

  const o = data.overview;

  const statCards = [
    { label: "Total Users", value: o.totalUsers, sub: `+${o.newUsersThisMonth} this month`, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Pro Members", value: o.proUsers, sub: `${o.totalUsers ? ((o.proUsers / o.totalUsers) * 100).toFixed(0) : 0}% conversion`, icon: Crown, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "Total Clicks", value: o.totalClicks, sub: `${o.clicksThisWeek} this week`, icon: MousePointerClick, color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20" },
    { label: "Applications", value: o.totalApplications, sub: "Quick Apply", icon: FileText, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "Affiliate Clicks", value: o.affiliateClicks, sub: `${o.totalClicks ? ((o.affiliateClicks / o.totalClicks) * 100).toFixed(0) : 0}% of total`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Sponsored", value: `${o.sponsoredActive}/${o.totalSponsored}`, sub: "active slots", icon: Megaphone, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20" },
  ];

  const totalTypeCount = data.typeDistribution.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Analytics
        </h1>
        <p className="text-muted-foreground text-sm">Platform performance overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{typeof card.value === "number" ? card.value.toLocaleString() : card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Click Trend Chart */}
      <div className="rounded-xl border p-5">
        <h2 className="font-semibold mb-1">Click Trend (Last 30 Days)</h2>
        <p className="text-xs text-muted-foreground mb-4">{o.clicksThisMonth.toLocaleString()} clicks this month</p>
        {data.clickTrend.length > 0 ? (
          <MiniBarChart data={data.clickTrend} />
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No click data yet</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type Distribution */}
        <div className="rounded-xl border p-5">
          <h2 className="font-semibold mb-4">Listings by Type</h2>
          <div className="space-y-3">
            {data.typeDistribution.map((d) => (
              <div key={d.type}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="capitalize font-medium">{d.type}</span>
                  <span className="text-muted-foreground">{d.count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${typeColors[d.type] || "bg-gray-500"}`}
                    style={{ width: `${(d.count / totalTypeCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">Total: {o.totalListings} listings</p>
          </div>
        </div>

        {/* Top Providers */}
        <div className="rounded-xl border p-5">
          <h2 className="font-semibold mb-4">Top Providers</h2>
          <div className="space-y-2">
            {data.topProviders.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{p.listingCount} listings</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Listings */}
      <div className="rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Most Clicked Listings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium w-8">#</th>
                <th className="text-left p-3 font-medium">Listing</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Provider</th>
                <th className="text-right p-3 font-medium">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {data.topListings.map((l, i) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3">
                    <Link href={`/listing/${l.slug}`} className="hover:text-primary flex items-center gap-1 font-medium">
                      {l.title} <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                  </td>
                  <td className="p-3 capitalize">{l.type}</td>
                  <td className="p-3 text-muted-foreground">{l.provider.name}</td>
                  <td className="p-3 text-right font-medium">{l.clickCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Users */}
      <div className="rounded-xl border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Recent Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Tier</th>
                <th className="text-right p-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No users yet</td></tr>
              ) : (
                data.recentUsers.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-3">
                      <div className="font-medium">{u.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.tier === "pro" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>
                        {u.tier === "pro" ? "Pro" : "Free"}
                      </span>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
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
