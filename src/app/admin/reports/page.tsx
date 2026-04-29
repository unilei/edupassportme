"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/hooks/useFetch";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface ReportItem {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
  review: {
    id: string;
    title: string;
    body: string;
    listing: { title: string; slug: string };
    user: { email: string; name: string | null };
  } | null;
  reply: {
    id: string;
    body: string;
    user: { email: string; name: string | null };
  } | null;
}

interface ReportsResponse {
  reports: ReportItem[];
  total: number;
  page: number;
  totalPages: number;
}

const reasonLabels: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  misinformation: "Misinformation",
  other: "Other",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  reviewed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  dismissed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export default function AdminReportsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [reasonFilter, setReasonFilter] = useState("");
  const [actionKey, setActionKey] = useState(0);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (statusFilter) params.set("status", statusFilter);
  if (reasonFilter) params.set("reason", reasonFilter);

  const { data, loading, reload } = useFetch<ReportsResponse>(
    `/api/admin/reports?${params}&_k=${actionKey}`,
  );

  const handleAction = async (id: string, action: string) => {
    if (action === "delete-content" && !confirm("Delete the reported content? This cannot be undone.")) return;
    await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setActionKey((k) => k + 1);
    reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm">
          {data ? `${data.total} reports` : "Loading..."}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select
          value={reasonFilter}
          onChange={(e) => { setReasonFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All reasons</option>
          <option value="spam">Spam</option>
          <option value="harassment">Harassment</option>
          <option value="misinformation">Misinformation</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Reports list */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : data?.reports.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No reports found</p>
        ) : (
          data?.reports.map((r) => (
            <div key={r.id} className="rounded-xl border p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || ""}`}>
                    {r.status}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    {reasonLabels[r.reason] || r.reason}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    by {r.user.name || r.user.email} &middot; {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {r.status === "pending" && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-green-600"
                      onClick={() => handleAction(r.id, "resolve")}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleAction(r.id, "dismiss")}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Dismiss
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive"
                      onClick={() => handleAction(r.id, "delete-content")}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* Details */}
              {r.details && (
                <p className="text-sm text-muted-foreground italic">&quot;{r.details}&quot;</p>
              )}

              {/* Reported content */}
              {r.review && (
                <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Review</span>
                    <span className="text-muted-foreground">by {r.review.user.name || r.review.user.email}</span>
                    <a
                      href={`/listing/${r.review.listing.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-0.5"
                    >
                      {r.review.listing.title} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="font-medium">{r.review.title}</p>
                  <p className="text-muted-foreground line-clamp-2">{r.review.body}</p>
                </div>
              )}

              {r.reply && (
                <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Reply</span>
                    <span className="text-muted-foreground">by {r.reply.user.name || r.reply.user.email}</span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">{r.reply.body}</p>
                </div>
              )}
            </div>
          ))
        )}
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
