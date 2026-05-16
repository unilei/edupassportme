"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Loader2, PlusCircle, RefreshCw } from "lucide-react";
import { AuthRequiredPrompt } from "@/components/auth/AuthRequired";
import { AccountTypeRequired } from "@/components/auth/AccountTypeRequired";
import { Button } from "@/components/ui/button";

type BusinessSubmission = {
  id: string;
  title: string;
  type: string;
  status: string;
  reviewNote: string | null;
  url: string;
  location: string | null;
  companyName: string | null;
  createdAt: string;
  updatedAt: string;
  publishedListing: { id: string; slug: string; status: string } | null;
  organization: { id: string; name: string; type: string } | null;
};

type BusinessListing = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  url: string;
  location: string | null;
  companyName: string | null;
  viewCount: number;
  clickCount: number;
  publishedAt: string | null;
  updatedAt: string;
  organization: { id: string; name: string; type: string } | null;
  sourceSubmission: {
    id: string;
    status: string;
    organization: { id: string; name: string; type: string } | null;
  } | null;
  _count?: { applications?: number; savedBy?: number };
};

type BusinessListingsResponse = {
  organizations: { id: string; name: string; type: string; status: string; plan?: string | null }[];
  submissions: BusinessSubmission[];
  listings: BusinessListing[];
};

function formatDate(value: string | null) {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    pending_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    needs_changes: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    hidden: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || "bg-muted text-muted-foreground"}`}>
      {formatLabel(status)}
    </span>
  );
}

function typeBadge(type: string) {
  const colors: Record<string, string> = {
    job: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    event: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    course: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    deal: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[type] || "bg-muted text-muted-foreground"}`}>
      {type}
    </span>
  );
}

function BusinessListingsContent() {
  const [data, setData] = useState<BusinessListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authExpired, setAuthExpired] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/business/listings");
        if (cancelled) return;
        if (res.status === 401) {
          setAuthExpired(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load business listings");
        const body = await res.json() as BusinessListingsResponse;
        if (!cancelled) setData(body);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load business listings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadListings();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const submissions = data?.submissions ?? [];
  const listings = data?.listings ?? [];
  const summary = {
    pending: submissions.filter((submission) => submission.status === "pending_review").length,
    needsChanges: submissions.filter((submission) => submission.status === "needs_changes").length,
    published: listings.length,
    applications: listings.reduce((sum, listing) => sum + (listing._count?.applications ?? 0), 0),
  };

  if (authExpired) {
    return (
      <AuthRequiredPrompt
        callbackUrl="/business/listings"
        title="Business access required"
        description="Sign in with a business owner account to review your marketplace listings."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/business" className="text-sm font-medium text-primary hover:underline">
            Business Workspace
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Listings</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Track submitted opportunities and published marketplace listings owned by your organizations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/submit-opportunity">
              <PlusCircle className="h-4 w-4" />
              Submit opportunity
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Pending review", summary.pending],
          ["Needs changes", summary.needsChanges],
          ["Published", summary.published],
          ["Applications", summary.applications],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">Submitted Opportunities</h2>
            <p className="text-xs text-muted-foreground">{submissions.length} review records.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {submissions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      No submitted opportunities yet.
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => (
                    <tr key={submission.id} className="align-top">
                      <td className="px-4 py-3">{typeBadge(submission.type)}</td>
                      <td className="px-4 py-3">
                        <a
                          href={submission.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium hover:underline"
                        >
                          {submission.title}
                        </a>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {submission.organization?.name || submission.companyName || "Organization"}
                        </p>
                        {submission.reviewNote ? (
                          <p className="mt-1 text-xs text-muted-foreground">{submission.reviewNote}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{statusBadge(submission.status)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(submission.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">Published Listings</h2>
            <p className="text-xs text-muted-foreground">{listings.length} live marketplace records.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Listing</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Signals</th>
                  <th className="px-4 py-3 font-medium">Published</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {listings.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      No published listings yet.
                    </td>
                  </tr>
                ) : (
                  listings.map((listing) => {
                    const organization = listing.organization || listing.sourceSubmission?.organization;
                    return (
                      <tr key={listing.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div>
                              <Link href={`/listing/${listing.slug}`} className="font-medium hover:underline">
                                {listing.title}
                              </Link>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {typeBadge(listing.type)}
                                <span>{organization?.name || listing.companyName || "Organization"}</span>
                                <a href={listing.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                  Source <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{statusBadge(listing.status)}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>{listing.viewCount} views</p>
                            <p>{listing.clickCount} clicks</p>
                            <p>{listing._count?.applications ?? 0} applications</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(listing.publishedAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function BusinessListingsPage() {
  return (
    <AccountTypeRequired
      allowed={["organization", "partner"]}
      callbackUrl="/business/listings"
      title="Sign in to view business listings"
      description="Listing management is available to organization owner accounts."
      blockedTitle="Business account required"
      blockedDescription="Use an organization or partner account to manage marketplace listings."
      requireOnboarding
    >
      <BusinessListingsContent />
    </AccountTypeRequired>
  );
}
