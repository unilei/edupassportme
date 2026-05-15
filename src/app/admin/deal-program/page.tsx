"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Handshake, MailPlus, PauseCircle, RefreshCw, Search, XCircle } from "lucide-react";

const STATUS_FILTERS = ["", "pending", "approved", "invited", "active", "rejected", "suspended"] as const;
const ACTIONS = ["approve", "invite", "activate", "reject", "suspend"] as const;

type DealProgramAction = (typeof ACTIONS)[number];

interface DealProgramApplication {
  id: string;
  contactName: string;
  contactEmail: string;
  proposedOffer: string;
  targetAudience: string | null;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  invitedAt: string | null;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    type: string;
    status: string;
    plan: string;
    canPostDeals: boolean;
    owner: { id: string; name: string | null; email: string };
  };
  submittedBy: { id: string; name: string | null; email: string };
  reviewedBy: { id: string; name: string | null; email: string } | null;
}

interface DealProgramResponse {
  applications: DealProgramApplication[];
  total: number;
  page: number;
  totalPages: number;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    approved: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    invited: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    rejected: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    suspended: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not reviewed";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function actionIcon(action: DealProgramAction) {
  if (action === "approve") return <CheckCircle className="mr-1.5 h-3.5 w-3.5" />;
  if (action === "invite") return <MailPlus className="mr-1.5 h-3.5 w-3.5" />;
  if (action === "activate") return <Handshake className="mr-1.5 h-3.5 w-3.5" />;
  if (action === "reject") return <XCircle className="mr-1.5 h-3.5 w-3.5" />;
  return <PauseCircle className="mr-1.5 h-3.5 w-3.5" />;
}

export default function AdminDealProgramPage() {
  const [data, setData] = useState<DealProgramResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [actioningKey, setActioningKey] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);

    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(`/api/admin/deal-program?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load Deal Program applications");
        return res.json();
      })
      .then((body: DealProgramResponse) => {
        if (!cancelled) setData(body);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, search, status, refreshKey]);

  const reload = () => setRefreshKey((key) => key + 1);

  const handleAction = async (application: DealProgramApplication, action: DealProgramAction) => {
    const note = window.prompt("Review note", application.reviewNote ?? "");
    if (note === null) return;

    const actionKey = `${application.id}:${action}`;
    setActioningKey(actionKey);
    setError("");

    try {
      const res = await fetch("/api/admin/deal-program", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: application.id,
          action,
          reviewNote: note.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update Deal Program application");
      }

      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update Deal Program application");
    } finally {
      setActioningKey("");
    }
  };

  const applications = data?.applications ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Deal Program Review</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} applications` : "Loading applications..."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search offer, contact, organization, or owner"
            className="pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          {STATUS_FILTERS.map((value) => (
            <option key={value || "all"} value={value}>
              {value || "All statuses"}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Application</th>
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Offer</th>
              <th className="px-4 py-3 font-medium">Review</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  Loading...
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  No Deal Program applications
                </td>
              </tr>
            ) : (
              applications.map((application) => (
                <tr key={application.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{application.contactName}</span>
                        {statusBadge(application.status)}
                      </div>
                      <a className="block text-xs text-primary hover:underline" href={`mailto:${application.contactEmail}`}>
                        {application.contactEmail}
                      </a>
                      <div className="text-xs text-muted-foreground">
                        Submitted by {application.submittedBy.email} on {formatDate(application.createdAt)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="font-medium">{application.organization.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {application.organization.type} / {application.organization.status} / {application.organization.plan}
                      </div>
                      <div className="text-xs text-muted-foreground">Owner: {application.organization.owner.email}</div>
                      {application.organization.canPostDeals ? (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          deal posting enabled
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-md space-y-2">
                      <p className="line-clamp-4">{application.proposedOffer}</p>
                      {application.targetAudience ? (
                        <p className="text-xs text-muted-foreground">Audience: {application.targetAudience}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>{formatDate(application.reviewedAt)}</div>
                      {application.reviewedBy ? <div>By {application.reviewedBy.email}</div> : null}
                      {application.reviewNote ? <div className="max-w-xs text-foreground">{application.reviewNote}</div> : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-56 flex-wrap gap-2">
                      {ACTIONS.map((action) => {
                        const disabled =
                          actioningKey === `${application.id}:${action}` ||
                          (action === "approve" && application.status === "approved") ||
                          (action === "activate" && application.status === "active") ||
                          (action === "reject" && application.status === "rejected") ||
                          (action === "suspend" && application.status === "suspended");

                        return (
                          <Button
                            key={action}
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            onClick={() => handleAction(application, action)}
                          >
                            {actionIcon(action)}
                            {action}
                          </Button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {data?.page ?? page} of {data?.totalPages ?? 1}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || page >= (data?.totalPages ?? 1)}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
