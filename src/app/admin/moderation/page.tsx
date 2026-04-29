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
  MousePointerClick,
} from "lucide-react";

interface ListingItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  verified: boolean;
  featured: boolean;
  viewCount: number;
  clickCount: number;
  provider: { name: string };
  createdAt: string;
}

interface ListingsResponse {
  listings: ListingItem[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminModerationPage() {
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    if (verifiedFilter) params.set("verified", verifiedFilter);

    let cancelled = false;
    fetch(`/api/admin/listings?${params}`)
      .then((r) => r.json())
      .then((d: ListingsResponse) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, search, typeFilter, verifiedFilter, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const handleAction = async (id: string, action: string) => {
    await fetch("/api/admin/listings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing permanently?")) return;
    await fetch(`/api/admin/listings?id=${id}`, { method: "DELETE" });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Moderation</h1>
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
          value={verifiedFilter}
          onChange={(e) => { setVerifiedFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Listing</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Provider</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Stats</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.listings.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No listings found</td></tr>
            ) : (
              data?.listings.map((l) => (
                <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <p className="font-medium truncate max-w-52">{l.title}</p>
                    <p className="text-[10px] text-muted-foreground">{l.slug}</p>
                  </td>
                  <td className="p-3">{typeBadge(l.type)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{l.provider.name}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {l.verified ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                          <CheckCircle className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <XCircle className="h-3 w-3" /> Unverified
                        </span>
                      )}
                      {l.featured && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                          <Star className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{l.viewCount}</span>
                      <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{l.clickCount}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {l.verified ? (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleAction(l.id, "unverify")}>
                          Unverify
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-xs text-green-600" onClick={() => handleAction(l.id, "verify")}>
                          Verify
                        </Button>
                      )}
                      {l.featured ? (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleAction(l.id, "unfeature")}>
                          Unfeature
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-xs text-amber-600" onClick={() => handleAction(l.id, "feature")}>
                          Feature
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
