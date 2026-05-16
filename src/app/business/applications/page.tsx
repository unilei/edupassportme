"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, FileText, Loader2, RefreshCw, Save, UserRound } from "lucide-react";
import { AuthRequiredPrompt } from "@/components/auth/AuthRequired";
import { AccountTypeRequired } from "@/components/auth/AccountTypeRequired";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const employerStatuses = [
  "under_review",
  "shortlisted",
  "screening",
  "interview_scheduled",
  "interviewing",
  "decision_pending",
  "offer_extended",
  "hired",
  "rejected",
  "position_closed",
] as const;

type EmployerStatus = (typeof employerStatuses)[number];

type BusinessApplication = {
  id: string;
  status: string;
  coverNote: string | null;
  resumeUrl: string | null;
  interviewAt: string | null;
  interviewTimezone: string | null;
  meetingUrl: string | null;
  employerNote: string | null;
  offerLetterUrl: string | null;
  contractUrl: string | null;
  appliedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    profile: {
      headline: string | null;
      resumeUrl: string | null;
      educationLevel: string | null;
      skills: string[];
    } | null;
  };
  listing: {
    id: string;
    title: string;
    slug: string;
    type: string;
    companyName: string | null;
    location: string | null;
    organization: { id: string; name: string } | null;
    sourceSubmission: { organization: { id: string; name: string } | null } | null;
  };
};

type ApplicationDraft = {
  status: EmployerStatus;
  employerNote: string;
  interviewAt: string;
  timezone: string;
  meetingUrl: string;
  offerLetterUrl: string;
  contractUrl: string;
};

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function defaultTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function draftFromApplication(application: BusinessApplication): ApplicationDraft {
  const status = employerStatuses.includes(application.status as EmployerStatus)
    ? application.status as EmployerStatus
    : "under_review";

  return {
    status,
    employerNote: application.employerNote || "",
    interviewAt: toDateTimeLocal(application.interviewAt),
    timezone: application.interviewTimezone || defaultTimezone(),
    meetingUrl: application.meetingUrl || "",
    offerLetterUrl: application.offerLetterUrl || "",
    contractUrl: application.contractUrl || "",
  };
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    applied: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    under_review: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    shortlisted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    screening: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    interview_scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    interviewing: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    decision_pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    offer_extended: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    hired: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    position_closed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[status] || "bg-muted text-muted-foreground"}`}>
      {formatLabel(status)}
    </span>
  );
}

function BusinessApplicationsContent() {
  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ApplicationDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [authExpired, setAuthExpired] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/business/applications");
        if (cancelled) return;
        if (res.status === 401) {
          setAuthExpired(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load applications");
        const body = await res.json() as { applications: BusinessApplication[] };
        if (cancelled) return;
        setApplications(body.applications || []);
        setDrafts(Object.fromEntries((body.applications || []).map((application) => [
          application.id,
          draftFromApplication(application),
        ])));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load applications");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadApplications();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const summary = useMemo(() => ({
    total: applications.length,
    active: applications.filter((application) => !["hired", "rejected", "position_closed"].includes(application.status)).length,
    interviews: applications.filter((application) => ["interview_scheduled", "interviewing"].includes(application.status)).length,
    offers: applications.filter((application) => application.status === "offer_extended").length,
  }), [applications]);

  const updateDraft = (applicationId: string, field: keyof ApplicationDraft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [applicationId]: {
        ...(current[applicationId] || {
          status: "under_review",
          employerNote: "",
          interviewAt: "",
          timezone: defaultTimezone(),
          meetingUrl: "",
          offerLetterUrl: "",
          contractUrl: "",
        }),
        [field]: value,
      },
    }));
  };

  const saveApplication = async (application: BusinessApplication) => {
    const draft = drafts[application.id] || draftFromApplication(application);
    setSavingId(application.id);
    setError("");
    try {
      const res = await fetch("/api/business/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: application.id,
          status: draft.status,
          employerNote: draft.employerNote,
          interviewAt: draft.interviewAt,
          timezone: draft.timezone,
          meetingUrl: draft.meetingUrl,
          offerLetterUrl: draft.offerLetterUrl,
          contractUrl: draft.contractUrl,
        }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string; application?: BusinessApplication };
      if (!res.ok) throw new Error(body.error || "Failed to update application");
      if (body.application) {
        setApplications((current) => current.map((item) => (
          item.id === application.id ? body.application as BusinessApplication : item
        )));
        setDrafts((current) => ({
          ...current,
          [application.id]: draftFromApplication(body.application as BusinessApplication),
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update application");
    } finally {
      setSavingId("");
    }
  };

  if (authExpired) {
    return (
      <AuthRequiredPrompt
        callbackUrl="/business/applications"
        title="Business access required"
        description="Sign in with a business owner account to manage applicant pipelines."
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
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Applications</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Move candidates through employer-managed statuses, interviews, offers, and decisions.
          </p>
        </div>
        <Button variant="outline" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total", summary.total],
          ["Active", summary.active],
          ["Interviews", summary.interviews],
          ["Offers", summary.offers],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {applications.length === 0 ? (
          <div className="rounded-xl border bg-card py-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No applications yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Applications will appear after individuals quick-apply to your job listings.</p>
          </div>
        ) : (
          applications.map((application) => {
            const draft = drafts[application.id] || draftFromApplication(application);
            const organization = application.listing.organization || application.listing.sourceSubmission?.organization;
            return (
              <section key={application.id} className="rounded-xl border bg-card">
                <div className="grid gap-4 border-b px-4 py-4 lg:grid-cols-[1.2fr_1fr]">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {statusBadge(application.status)}
                      <span className="text-xs text-muted-foreground">Applied {formatDate(application.appliedAt)}</span>
                    </div>
                    <h2 className="truncate font-semibold">
                      <Link href={`/listing/${application.listing.slug}`} className="hover:underline">
                        {application.listing.title}
                      </Link>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {organization?.name || application.listing.companyName || "Organization"}
                      {application.listing.location ? ` - ${application.listing.location}` : ""}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      <p className="truncate font-medium">{application.user.name || application.user.email}</p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{application.user.email}</p>
                    {application.user.profile?.headline ? (
                      <p className="mt-1 text-xs text-muted-foreground">{application.user.profile.headline}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 p-4 lg:grid-cols-[220px_1fr]">
                  <div className="space-y-3">
                    <label className="space-y-1.5 text-xs font-medium">
                      <span>Status</span>
                      <select
                        value={draft.status}
                        onChange={(event) => updateDraft(application.id, "status", event.target.value)}
                        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                      >
                        {employerStatuses.map((status) => (
                          <option key={status} value={status}>{formatLabel(status)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1.5 text-xs font-medium">
                      <span>Interview</span>
                      <Input
                        type="datetime-local"
                        value={draft.interviewAt}
                        onChange={(event) => updateDraft(application.id, "interviewAt", event.target.value)}
                      />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium">
                      <span>Timezone</span>
                      <Input
                        value={draft.timezone}
                        onChange={(event) => updateDraft(application.id, "timezone", event.target.value)}
                        placeholder="America/New_York"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-medium md:col-span-2">
                      <span>Employer note</span>
                      <Textarea
                        value={draft.employerNote}
                        onChange={(event) => updateDraft(application.id, "employerNote", event.target.value)}
                        className="min-h-20"
                        placeholder="Internal note for this candidate"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium">
                      <span>Meeting URL</span>
                      <Input
                        value={draft.meetingUrl}
                        onChange={(event) => updateDraft(application.id, "meetingUrl", event.target.value)}
                        placeholder="https://meet.example.com"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium">
                      <span>Offer letter URL</span>
                      <Input
                        value={draft.offerLetterUrl}
                        onChange={(event) => updateDraft(application.id, "offerLetterUrl", event.target.value)}
                        placeholder="https://files.example.com/offer.pdf"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium">
                      <span>Contract URL</span>
                      <Input
                        value={draft.contractUrl}
                        onChange={(event) => updateDraft(application.id, "contractUrl", event.target.value)}
                        placeholder="https://files.example.com/contract.pdf"
                      />
                    </label>
                    <div className="flex items-end justify-between gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDate(application.interviewAt)}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => saveApplication(application)}
                        disabled={savingId === application.id}
                      >
                        {savingId === application.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function BusinessApplicationsPage() {
  return (
    <AccountTypeRequired
      allowed={["organization", "partner"]}
      callbackUrl="/business/applications"
      title="Sign in to manage applications"
      description="Applicant management is available to organization owner accounts."
      blockedTitle="Business account required"
      blockedDescription="Use an organization or partner account to manage applicant pipelines."
    >
      <BusinessApplicationsContent />
    </AccountTypeRequired>
  );
}
