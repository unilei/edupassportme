"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BadgeCheck, Building2, RefreshCw, Search, ShieldCheck, ShieldOff } from "lucide-react";

const STATUS_FILTERS = ["", "pending", "active", "suspended", "rejected"] as const;
const TYPE_FILTERS = ["", "school", "recruiter", "vendor", "partner", "employer", "other"] as const;
const PLAN_FILTERS = ["", "free", "business", "partner", "enterprise"] as const;
const PERMISSION_FIELDS = ["canPostJobs", "canPostEvents", "canPostDeals", "canSponsor"] as const;
const LIMIT_FIELDS = ["jobPostLimit", "eventPostLimit", "dealPostLimit", "sponsoredLimit"] as const;

type LimitField = (typeof LIMIT_FIELDS)[number];

interface AdminOrganization {
  id: string;
  name: string;
  type: string;
  website: string | null;
  description: string | null;
  status: string;
  plan: string;
  canPostJobs: boolean;
  canPostEvents: boolean;
  canPostDeals: boolean;
  canSponsor: boolean;
  jobPostLimit: number;
  eventPostLimit: number;
  dealPostLimit: number;
  sponsoredLimit: number;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string | null; email: string };
  _count: {
    submissions: number;
    listings: number;
    dealProgramApplications: number;
  };
}

interface OrganizationsResponse {
  organizations: AdminOrganization[];
  total: number;
  page: number;
  totalPages: number;
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    suspended: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    rejected: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

function planBadge(plan: string) {
  const colors: Record<string, string> = {
    free: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    business: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    partner: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    enterprise: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[plan] || colors.free}`}>
      {plan}
    </span>
  );
}

function formatCountLabel(organization: AdminOrganization) {
  return [
    `${organization._count.submissions} submissions`,
    `${organization._count.listings} listings`,
    `${organization._count.dealProgramApplications} deal apps`,
  ].join(" / ");
}

export default function AdminOrganizationsPage() {
  const [data, setData] = useState<OrganizationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const [actioningId, setActioningId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (plan) params.set("plan", plan);

    let cancelled = false;
    setLoading(true);
    setError("");

    fetch(`/api/admin/organizations?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load organizations");
        return res.json();
      })
      .then((body: OrganizationsResponse) => {
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
  }, [page, search, status, type, plan, refreshKey]);

  const reload = () => setRefreshKey((key) => key + 1);

  const patchOrganization = async (organization: AdminOrganization, updates: Record<string, unknown>) => {
    setActioningId(organization.id);
    setError("");

    try {
      const res = await fetch("/api/admin/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: organization.id, action: "update", updates }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update organization");
      }

      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update organization");
    } finally {
      setActioningId("");
    }
  };

  const updateLimit = async (organization: AdminOrganization, field: LimitField) => {
    const current = organization[field];
    const value = window.prompt(`Set ${field}`, String(current));
    if (value === null) return;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Limit must be a non-negative integer");
      return;
    }
    await patchOrganization(organization, { [field]: parsed });
  };

  const organizations = data?.organizations ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} organizations` : "Loading organizations..."}
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
            placeholder="Search organization, owner, or website"
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
        <select
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          {TYPE_FILTERS.map((value) => (
            <option key={value || "all"} value={value}>
              {value || "All types"}
            </option>
          ))}
        </select>
        <select
          value={plan}
          onChange={(event) => {
            setPlan(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          {PLAN_FILTERS.map((value) => (
            <option key={value || "all"} value={value}>
              {value || "All plans"}
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
              <th className="px-4 py-3 font-medium">Organization</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Counts</th>
              <th className="px-4 py-3 font-medium">Permissions</th>
              <th className="px-4 py-3 font-medium">Limits</th>
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
            ) : organizations.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  No organizations
                </td>
              </tr>
            ) : (
              organizations.map((organization) => (
                <tr key={organization.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{organization.name}</span>
                          {organization.verifiedAt ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                              <BadgeCheck className="h-3.5 w-3.5" />
                              verified
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {organization.type} / {organization.owner.email}
                        </div>
                        {organization.website ? (
                          <a
                            href={organization.website}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs text-primary hover:underline"
                          >
                            {organization.website}
                          </a>
                        ) : null}
                        {statusBadge(organization.status)}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      {planBadge(organization.plan)}
                      <select
                        value={organization.plan}
                        disabled={actioningId === organization.id}
                        onChange={(event) => patchOrganization(organization, { plan: event.target.value })}
                        className="block rounded-md border bg-background px-2 py-1 text-xs"
                      >
                        {PLAN_FILTERS.filter(Boolean).map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatCountLabel(organization)}</td>
                  <td className="px-4 py-3">
                    <div className="grid min-w-36 grid-cols-2 gap-2">
                      {PERMISSION_FIELDS.map((field) => (
                        <label key={field} className="flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            checked={organization[field]}
                            disabled={actioningId === organization.id}
                            onChange={() => patchOrganization(organization, { [field]: !organization[field] })}
                          />
                          {field.replace("canPost", "").replace("can", "")}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="grid min-w-40 grid-cols-2 gap-2">
                      {LIMIT_FIELDS.map((field) => (
                        <Button
                          key={field}
                          variant="outline"
                          size="sm"
                          className="h-7 justify-between px-2 text-xs"
                          disabled={actioningId === organization.id}
                          onClick={() => updateLimit(organization, field)}
                        >
                          <span>{field.replace("PostLimit", "").replace("sponsoredLimit", "sponsored")}</span>
                          <span>{organization[field]}</span>
                        </Button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-52 flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actioningId === organization.id || organization.status === "active"}
                        onClick={() => patchOrganization(organization, { status: "active" })}
                      >
                        Activate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actioningId === organization.id || organization.status === "suspended"}
                        onClick={() => patchOrganization(organization, { status: "suspended" })}
                      >
                        Suspend
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actioningId === organization.id || organization.status === "rejected"}
                        onClick={() => patchOrganization(organization, { status: "rejected" })}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actioningId === organization.id}
                        onClick={() => patchOrganization(organization, { verify: !organization.verifiedAt })}
                      >
                        {organization.verifiedAt ? (
                          <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                        ) : (
                          <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {organization.verifiedAt ? "Unverify" : "Verify"}
                      </Button>
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
