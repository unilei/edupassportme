"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  Users,
} from "lucide-react";
import { AuthRequired, AuthRequiredPrompt } from "@/components/auth/AuthRequired";
import { Button } from "@/components/ui/button";

type BusinessOrganization = {
  id: string;
  name: string;
  type: string;
  status: string;
  plan?: string | null;
  verifiedAt?: string | null;
  canPostJobs?: boolean | null;
  canPostEvents?: boolean | null;
  canPostDeals?: boolean | null;
  canSponsor?: boolean | null;
  jobPostLimit?: number | null;
  eventPostLimit?: number | null;
  dealPostLimit?: number | null;
  _count?: {
    submissions?: number;
    dealProgramApplications?: number;
  };
};

type BusinessOverview = {
  organizations: BusinessOrganization[];
  counts: {
    organizations: number;
    submissions: number;
    publishedListings: number;
    applications: number;
    activeApplications: number;
  };
  applicationStatusCounts: Record<string, number>;
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function badgeClass(value: string) {
  const colors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    suspended: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    rejected: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    partner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    business: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    free: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };

  return colors[value] || "bg-muted text-muted-foreground";
}

function BusinessDashboardContent() {
  const [data, setData] = useState<BusinessOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authExpired, setAuthExpired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/business/overview");
        if (cancelled) return;
        if (res.status === 401) {
          setAuthExpired(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load business overview");
        const body = await res.json() as BusinessOverview;
        if (!cancelled) setData(body);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load business overview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOverview();
    return () => { cancelled = true; };
  }, []);

  if (authExpired) {
    return (
      <AuthRequiredPrompt
        callbackUrl="/business"
        title="Business access required"
        description="Sign in with a business owner account to manage marketplace listings and applicants."
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

  const counts = data?.counts ?? {
    organizations: 0,
    submissions: 0,
    publishedListings: 0,
    applications: 0,
    activeApplications: 0,
  };
  const organizations = data?.organizations ?? [];
  const statusCounts = Object.entries(data?.applicationStatusCounts ?? {}).filter(([, count]) => count > 0);

  const cards = [
    { label: "Organizations", value: counts.organizations, icon: Building2, color: "text-blue-500" },
    { label: "Submissions", value: counts.submissions, icon: Send, color: "text-amber-500" },
    { label: "Published", value: counts.publishedListings, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Active applicants", value: counts.activeApplications, icon: Users, color: "text-purple-500" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            Business Workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Manage marketplace supply</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review organization status, listing flow, and applicant pipeline from one owner-scoped workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/business/listings">Listings</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/business/applications">Applications</Link>
          </Button>
          <Button asChild>
            <Link href="/submit-opportunity">Submit opportunity</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">Organizations</h2>
            <p className="text-xs text-muted-foreground">Plan, permissions, and posting limits.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Permissions</th>
                  <th className="px-4 py-3 font-medium">Submissions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {organizations.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                      No organizations assigned to this account.
                    </td>
                  </tr>
                ) : (
                  organizations.map((organization) => (
                    <tr key={organization.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{organization.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{formatLabel(organization.type)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeClass(organization.status)}`}>
                          {formatLabel(organization.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${badgeClass(organization.plan || "free")}`}>
                          {formatLabel(organization.plan || "free")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-xs flex-wrap gap-1.5">
                          {[
                            ["Jobs", organization.canPostJobs],
                            ["Events", organization.canPostEvents],
                            ["Deals", organization.canPostDeals],
                            ["Sponsor", organization.canSponsor],
                          ].map(([label, enabled]) => (
                            <span
                              key={label as string}
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {organization._count?.submissions ?? 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">Applicant Pipeline</h2>
            <p className="text-xs text-muted-foreground">{counts.applications} total applications.</p>
          </div>
          <div className="divide-y">
            {statusCounts.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No applicant activity yet.</div>
            ) : (
              statusCounts.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="capitalize">{formatLabel(status)}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))
            )}
          </div>
          <div className="border-t p-4">
            <Button asChild className="w-full" variant="outline">
              <Link href="/business/applications">
                Manage applications <FileText className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function BusinessDashboardPage() {
  return (
    <AuthRequired
      callbackUrl="/business"
      title="Sign in to open Business Workspace"
      description="Business tools are available to organization owner accounts."
    >
      <BusinessDashboardContent />
    </AuthRequired>
  );
}
