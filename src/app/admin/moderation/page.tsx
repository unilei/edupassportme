"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  CheckCircle,
  XCircle,
  Star,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Flag,
  RotateCcw,
  MousePointerClick,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";

interface ListingItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  verified: boolean;
  featured: boolean;
  status: string;
  qualityScore: number;
  viewCount: number;
  clickCount: number;
  externalId: string | null;
  lastSeenAt: string | null;
  expiresAt: string | null;
  provider: { name: string; slug: string };
  createdAt: string;
}

interface ProviderOption {
  name: string;
  slug: string;
  count: number;
}

interface ListingsResponse {
  listings: ListingItem[];
  total: number;
  page: number;
  totalPages: number;
  providers: ProviderOption[];
  summary: {
    statusCounts: Record<string, number>;
    lowQualityCount: number;
  };
}

export default function AdminModerationPage() {
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [qualityFilter, setQualityFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    if (verifiedFilter) params.set("verified", verifiedFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (providerFilter) params.set("provider", providerFilter);
    if (qualityFilter) params.set("quality", qualityFilter);

    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/admin/listings?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load listings");
        return r.json();
      })
      .then((d: ListingsResponse) => { if (!cancelled) setData(d); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, search, typeFilter, verifiedFilter, statusFilter, providerFilter, qualityFilter, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const handleAction = async (id: string, action: string) => {
    const actionKey = `${id}:${action}`;
    setActioningId(actionKey);
    setError("");
    try {
      const res = await fetch("/api/admin/listings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update listing");
      }
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
    } finally {
      setActioningId("");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing permanently?")) return;
    setError("");
    const res = await fetch(`/api/admin/listings?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to delete listing");
      return;
    }
    reload();
  };

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      course: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      job: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      event: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      deal: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] || "bg-gray-100 text-gray-700"}`}>
        {type}
      </span>
    );
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
      needs_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      hidden: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      stale: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
      expired: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  const qualityBadge = (score: number) => {
    if (score >= 0.75) {
      return <span className="text-xs font-medium text-emerald-600">{Math.round(score * 100)} good</span>;
    }
    if (score >= 0.4) {
      return <span className="text-xs font-medium text-amber-600">{Math.round(score * 100)} review</span>;
    }
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600"><AlertTriangle className="h-3 w-3" />{Math.round(score * 100)} low</span>;
  };

  const formatDate = (value: string | null) => {
    if (!value) return "No date";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  };

  const summaryCount = (status: string) => data?.summary.statusCounts[status] || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Data Quality Review</h1>
          <p className="text-muted-foreground text-sm">
            {data ? `${data.total} listings total` : "Loading..."}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/admin/export?type=listings" download>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground">Active</p>
          <p className="mt-1 text-2xl font-semibold">{summaryCount("active")}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground">Needs review</p>
          <p className="mt-1 text-2xl font-semibold">{summaryCount("needs_review")}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground">Hidden</p>
          <p className="mt-1 text-2xl font-semibold">{summaryCount("hidden")}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium text-muted-foreground">Low quality</p>
          <p className="mt-1 text-2xl font-semibold">{data?.summary.lowQualityCount || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="course">Course</option>
          <option value="job">Job</option>
          <option value="event">Event</option>
          <option value="deal">Deal</option>
        </select>
        <select
          value={providerFilter}
          onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All sources</option>
          {data?.providers.map((provider) => (
            <option key={provider.slug} value={provider.slug}>
              {provider.name} ({provider.count})
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All listing states</option>
          <option value="active">Active</option>
          <option value="needs_review">Needs review</option>
          <option value="hidden">Hidden</option>
          <option value="stale">Stale</option>
          <option value="expired">Expired</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All verification</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <select
          value={qualityFilter}
          onChange={(e) => { setQualityFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All quality</option>
          <option value="low">Low quality</option>
          <option value="zero">No score</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium min-w-72">Listing</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Provider</th>
              <th className="text-left p-3 font-medium">Quality</th>
              <th className="text-left p-3 font-medium">Freshness</th>
              <th className="text-left p-3 font-medium">Stats</th>
              <th className="text-right p-3 font-medium min-w-80">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.listings.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No listings found</td></tr>
            ) : (
              data?.listings.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="space-y-1">
                      <p className="font-medium truncate max-w-72">{l.title}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{l.slug}</span>
                        {l.externalId && <span>External: {l.externalId}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {statusBadge(l.status)}
                        {l.verified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle className="h-3 w-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <XCircle className="h-3 w-3" /> Unverified
                          </span>
                        )}
                        {l.featured && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                            <Star className="h-3 w-3" /> Featured
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{typeBadge(l.type)}</td>
                  <td className="p-3">
                    <div className="text-xs">
                      <p className="font-medium">{l.provider.name}</p>
                      <p className="text-muted-foreground">{l.provider.slug}</p>
                    </div>
                  </td>
                  <td className="p-3">{qualityBadge(l.qualityScore)}</td>
                  <td className="p-3">
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" /> Seen {formatDate(l.lastSeenAt)}
                      </span>
                      <span>Expires {formatDate(l.expiresAt)}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{l.viewCount}</span>
                      <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{l.clickCount}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {l.verified ? (
                        <Button variant="ghost" size="sm" className="text-xs" disabled={!!actioningId} onClick={() => handleAction(l.id, "unverify")}>
                          Unverify
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-xs text-emerald-600" disabled={!!actioningId} onClick={() => handleAction(l.id, "verify")}>
                          Verify
                        </Button>
                      )}
                      {l.featured ? (
                        <Button variant="ghost" size="sm" className="text-xs" disabled={!!actioningId} onClick={() => handleAction(l.id, "unfeature")}>
                          Unfeature
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-xs text-amber-600" disabled={!!actioningId} onClick={() => handleAction(l.id, "feature")}>
                          Feature
                        </Button>
                      )}
                      {l.status !== "needs_review" && l.status !== "hidden" && (
                        <Button variant="ghost" size="sm" className="text-xs text-amber-700" disabled={!!actioningId} onClick={() => handleAction(l.id, "needs_review")}>
                          <Flag className="h-3 w-3 mr-1" /> Review
                        </Button>
                      )}
                      {l.status !== "hidden" ? (
                        <Button variant="ghost" size="sm" className="text-xs text-rose-600" disabled={!!actioningId} onClick={() => handleAction(l.id, "hide")}>
                          <EyeOff className="h-3 w-3 mr-1" /> Hide
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-xs text-emerald-600" disabled={!!actioningId} onClick={() => handleAction(l.id, "restore")}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Restore
                        </Button>
                      )}
                      {l.status !== "active" && l.status !== "hidden" && (
                        <Button variant="ghost" size="sm" className="text-xs text-emerald-600" disabled={!!actioningId} onClick={() => handleAction(l.id, "restore")}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Active
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
