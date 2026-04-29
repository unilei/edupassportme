"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";

interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditResponse {
  logs: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const actionColors: Record<string, string> = {
  "user.ban": "text-red-600",
  "user.unban": "text-green-600",
  "user.role": "text-blue-600",
  "review.delete": "text-red-600",
  "listing.verify": "text-green-600",
  "listing.unverify": "text-orange-600",
  "listing.feature": "text-amber-600",
  "listing.unfeature": "text-gray-600",
  "listing.delete": "text-red-600",
  "export.users": "text-purple-600",
  "export.listings": "text-purple-600",
  "export.reviews": "text-purple-600",
};

export default function AdminAuditLogPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (actionFilter) params.set("action", actionFilter);

    let cancelled = false;
    fetch(`/api/admin/audit-log?${params}`)
      .then((r) => r.json())
      .then((d: AuditResponse) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, actionFilter]);

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details) return null;
    return Object.entries(details)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(", ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground text-sm">
            {data ? `${data.total} entries` : "Loading..."}
          </p>
        </div>
        <ScrollText className="h-6 w-6 text-muted-foreground" />
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All actions</option>
          <option value="user.ban">User Ban</option>
          <option value="user.unban">User Unban</option>
          <option value="user.role">Role Change</option>
          <option value="review.delete">Review Delete</option>
          <option value="listing">Listing Actions</option>
          <option value="export">Data Exports</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Time</th>
              <th className="text-left p-3 font-medium">Actor</th>
              <th className="text-left p-3 font-medium">Action</th>
              <th className="text-left p-3 font-medium">Target</th>
              <th className="text-left p-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.logs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No audit logs yet</td></tr>
            ) : (
              data?.logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-xs font-medium">{log.actor}</td>
                  <td className="p-3">
                    <code className={`text-xs font-mono px-1.5 py-0.5 rounded bg-muted ${actionColors[log.action] || ""}`}>
                      {log.action}
                    </code>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground font-mono truncate max-w-28">
                    {log.target || "—"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground truncate max-w-52">
                    {formatDetails(log.details) || "—"}
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
