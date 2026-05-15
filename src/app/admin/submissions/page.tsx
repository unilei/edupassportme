"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, FilePenLine, RefreshCw, XCircle } from "lucide-react";

const STATUS_FILTERS = [
  { value: "pending_review", label: "Pending review" },
  { value: "needs_changes", label: "Needs changes" },
  { value: "rejected", label: "Rejected" },
  { value: "published", label: "Published" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];
type SubmissionAction = "approve" | "needs_changes" | "reject";

interface AdminSubmission {
  id: string;
  type: string;
  title: string;
  url: string;
  status: string;
  reviewNote: string | null;
  publishedListingId: string | null;
  organization: { id: string; name: string; type: string; website: string | null } | null;
  submittedBy: { id: string; name: string | null; email: string };
  createdAt: string;
  reviewedAt: string | null;
}

interface SubmissionsResponse {
  submissions: AdminSubmission[];
  total: number;
  page: number;
  totalPages: number;
}

function formatDate(value: string | null) {
  if (!value) return "Not reviewed";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function typeBadge(type: string) {
  const colors: Record<string, string> = {
    course: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    job: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    event: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    deal: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[type] || "bg-gray-100 text-gray-700"}`}>
      {type}
    </span>
  );
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    needs_changes: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function AdminSubmissionsPage() {
  const [data, setData] = useState<SubmissionsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending_review");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioningId, setActioningId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ status: statusFilter, page: "1", limit: "50" });
    let cancelled = false;

    setLoading(true);
    setError("");
    fetch(`/api/admin/submissions?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load submissions");
        return res.json();
      })
      .then((body: SubmissionsResponse) => {
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
  }, [statusFilter, refreshKey]);

  const reload = () => setRefreshKey((key) => key + 1);

  const handleAction = async (submission: AdminSubmission, action: SubmissionAction) => {
    let reviewNote: string | undefined;

    if (action === "needs_changes" || action === "reject") {
      const note = window.prompt("Review note");
      if (note === null) return;
      if (!note.trim()) {
        setError("Review note is required");
        return;
      }
      reviewNote = note.trim();
    }

    const actionKey = `${submission.id}:${action}`;
    setActioningId(actionKey);
    setError("");

    try {
      const res = await fetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: submission.id,
          action,
          ...(reviewNote ? { reviewNote } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update submission");
      }

      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update submission");
    } finally {
      setActioningId("");
    }
  };

  const submissions = data?.submissions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Submission Review</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} submissions` : "Loading submissions..."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={statusFilter === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
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
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Submitted</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : submissions.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  No submissions
                </td>
              </tr>
            ) : (
              submissions.map((submission) => (
                <tr key={submission.id} className="align-top">
                  <td className="px-4 py-3">{typeBadge(submission.type)}</td>
                  <td className="px-4 py-3">
                    <div className="max-w-sm">
                      <a
                        href={submission.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-foreground hover:underline"
                      >
                        {submission.title}
                      </a>
                      {submission.reviewNote ? (
                        <p className="mt-1 text-xs text-muted-foreground">{submission.reviewNote}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="min-w-36">
                      <p className="font-medium">
                        {submission.organization?.name || submission.submittedBy.name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">{submission.submittedBy.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(submission.createdAt)}</td>
                  <td className="px-4 py-3">{statusBadge(submission.status)}</td>
                  <td className="px-4 py-3">
                    {submission.status === "pending_review" ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAction(submission, "approve")}
                          disabled={actioningId === `${submission.id}:approve`}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve and publish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(submission, "needs_changes")}
                          disabled={actioningId === `${submission.id}:needs_changes`}
                        >
                          <FilePenLine className="mr-2 h-4 w-4" />
                          Request changes
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(submission, "reject")}
                          disabled={actioningId === `${submission.id}:reject`}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {submission.publishedListingId ? "Published" : "Reviewed"}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
