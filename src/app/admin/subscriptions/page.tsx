"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFetch } from "@/hooks/useFetch";
import {
  Search,
  CreditCard,
  Users,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SubItem {
  id: string;
  stripeSubscriptionId: string;
  plan: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
  createdAt: string;
  user: { id: string; email: string; name: string | null; tier: string };
}

interface SubsResponse {
  subscriptions: SubItem[];
  total: number;
  page: number;
  totalPages: number;
  stats: { active: number; canceling: number; yearly: number; monthly: number };
}

const planLabels: Record<string, string> = {
  pro_monthly: "Monthly",
  pro_yearly: "Yearly",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  past_due: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  canceled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  trialing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  incomplete: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export default function AdminSubscriptionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [actionKey, setActionKey] = useState(0);

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) params.set("search", search);
  if (statusFilter) params.set("status", statusFilter);
  if (planFilter) params.set("plan", planFilter);

  const { data, loading, reload } = useFetch<SubsResponse>(
    `/api/admin/subscriptions?${params}&_k=${actionKey}`,
  );

  const handleAction = async (id: string, action: string) => {
    await fetch("/api/admin/subscriptions", {
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
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground text-sm">
          {data ? `${data.total} subscriptions` : "Loading..."}
        </p>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold">{data.stats.active}</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Monthly</span>
            </div>
            <p className="text-2xl font-bold">{data.stats.monthly}</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">Yearly</span>
            </div>
            <p className="text-2xl font-bold">{data.stats.yearly}</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-muted-foreground">Canceling</span>
            </div>
            <p className="text-2xl font-bold">{data.stats.canceling}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
          <option value="trialing">Trialing</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All plans</option>
          <option value="pro_monthly">Monthly</option>
          <option value="pro_yearly">Yearly</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Plan</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Period End</th>
              <th className="text-left p-3 font-medium">Created</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.subscriptions.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No subscriptions found</td></tr>
            ) : (
              data?.subscriptions.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <p className="font-medium">{s.user.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{s.user.email}</p>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {planLabels[s.plan] || s.plan}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || ""}`}>
                        {s.status}
                      </span>
                      {s.cancelAtPeriodEnd && (
                        <span className="text-[10px] text-yellow-600">(canceling)</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(s.currentPeriodEnd).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    {s.status === "active" && !s.cancelAtPeriodEnd && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive"
                        onClick={() => handleAction(s.id, "cancel")}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                      </Button>
                    )}
                    {s.cancelAtPeriodEnd && s.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-green-600"
                        onClick={() => handleAction(s.id, "reactivate")}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reactivate
                      </Button>
                    )}
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
