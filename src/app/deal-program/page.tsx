"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { ArrowRight, ClipboardList, Loader2, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { canUseDealProgram, getSessionAccountType } from "@/lib/account-types";
import { OnboardingRequired } from "@/components/auth/AccountTypeRequired";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DealProgramApplication = {
  id: string;
  status: string;
  contactName: string;
  contactEmail: string;
  proposedOffer: string;
  targetAudience: string | null;
  reviewNote: string | null;
  createdAt?: string;
  updatedAt?: string;
  organization: {
    id: string;
    name: string;
    type?: string;
    status?: string;
    website: string | null;
  };
};

type DealProgramForm = {
  organizationName: string;
  organizationWebsite: string;
  contactName: string;
  contactEmail: string;
  proposedOffer: string;
  targetAudience: string;
};

type DealProgramField = keyof DealProgramForm;

const initialForm: DealProgramForm = {
  organizationName: "",
  organizationWebsite: "",
  contactName: "",
  contactEmail: "",
  proposedOffer: "",
  targetAudience: "",
};

const statusLabels: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  invited: "Invitation sent",
  active: "Active",
  suspended: "Suspended",
};

function statusClass(status: string) {
  if (status === "active" || status === "approved") {
    return "border-green-200 bg-green-50 text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300";
  }
  if (status === "rejected" || status === "suspended") {
    return "border-destructive/20 bg-destructive/10 text-destructive";
  }
  if (status === "invited") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300";
  }
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";
}

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function DealProgramPage() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState<DealProgramForm>(initialForm);
  const [applications, setApplications] = useState<DealProgramApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const accountType = getSessionAccountType(session?.user);
  const dealProgramAllowed = canUseDealProgram(accountType);

  const loadApplications = useCallback(async () => {
    if (status !== "authenticated" || !dealProgramAllowed) return;

    setLoadingApplications(true);
    setError("");

    try {
      const res = await fetch("/api/marketplace/deal-program", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        applications?: DealProgramApplication[];
        error?: string;
      };

      if (!res.ok) {
        setError(data.error || "Unable to load deal program applications.");
        return;
      }

      setApplications(data.applications || []);
    } catch {
      setError("Unable to load deal program applications.");
    } finally {
      setLoadingApplications(false);
    }
  }, [status, dealProgramAllowed]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const updateField = (field: DealProgramField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateField(event.target.name as DealProgramField, event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/marketplace/deal-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as {
        application?: DealProgramApplication;
        error?: string;
      };

      if (!res.ok || !data.application) {
        setError(data.error || "Unable to submit this application.");
        return;
      }

      setApplications((current) => [data.application as DealProgramApplication, ...current]);
      setMessage("Deal Program application submitted.");
      setForm(initialForm);
    } catch {
      setError("Unable to submit this application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ClipboardList className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Deal Program application</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Sign in to submit a partner offer and track review status.
        </p>
        <Button asChild size="lg" className="mt-7">
          <Link href="/auth/signin?callbackUrl=/deal-program">
            Sign in to apply <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  if (!dealProgramAllowed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Partner account required</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Individual and organization accounts cannot apply to the Deal Program. Use a partner account for deals, sponsorships, and campaigns.
        </p>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/guide">Open user guide</Link>
          </Button>
          {accountType === "organization" ? (
            <Button asChild variant="outline">
              <Link href="/submit-opportunity">Submit opportunity</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/workspace">Workspace</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <OnboardingRequired accountType={accountType}>
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ClipboardList className="h-3.5 w-3.5" />
            Partner intake
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Deal Program application
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Submit a partner offer for review and monitor application status from this page.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={loadApplications} disabled={loadingApplications}>
          {loadingApplications ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Application form</CardTitle>
            <CardDescription>
              The review team uses these details to evaluate the organization and proposed offer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  <span>Organization name</span>
                  <Input
                    name="organizationName"
                    value={form.organizationName}
                    onChange={handleInputChange}
                    placeholder="Example Partner"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span>Organization website</span>
                  <Input
                    name="organizationWebsite"
                    type="url"
                    value={form.organizationWebsite}
                    onChange={handleInputChange}
                    placeholder="https://example.com/deals"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span>Contact name</span>
                  <Input
                    name="contactName"
                    value={form.contactName}
                    onChange={handleInputChange}
                    placeholder="Maya Chen"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span>Contact email</span>
                  <Input
                    name="contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={handleInputChange}
                    placeholder="maya@example.com"
                    required
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm font-medium">
                <span>Proposed offer</span>
                <Textarea
                  name="proposedOffer"
                  value={form.proposedOffer}
                  onChange={handleInputChange}
                  placeholder="Describe the education or career benefit, discount, eligibility, timing, and any restrictions."
                  required
                  className="min-h-32"
                />
              </label>

              <label className="space-y-2 text-sm font-medium">
                <span>Target audience</span>
                <Textarea
                  name="targetAudience"
                  value={form.targetAudience}
                  onChange={handleInputChange}
                  placeholder="Who should see this offer?"
                  className="min-h-24"
                />
              </label>

              {message && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
                  {message}
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit application
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Application status</CardTitle>
            <CardDescription>Submitted Deal Program applications for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingApplications ? (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading applications
              </div>
            ) : applications.length === 0 ? (
              <div className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                No Deal Program applications yet.
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((application) => (
                  <article key={application.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold">
                          {application.organization.name}
                        </h2>
                        {application.organization.website && (
                          <a
                            href={application.organization.website}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block truncate text-xs text-muted-foreground hover:text-primary"
                          >
                            {application.organization.website}
                          </a>
                        )}
                      </div>
                      <Badge variant="outline" className={statusClass(application.status)}>
                        {statusLabels[application.status] || application.status}
                      </Badge>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                      {application.proposedOffer}
                    </p>
                    {application.reviewNote && (
                      <div className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        {application.reviewNote}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{application.contactName}</span>
                      <span>{application.contactEmail}</span>
                      {application.createdAt && <span>Submitted {formatDate(application.createdAt)}</span>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </OnboardingRequired>
  );
}
