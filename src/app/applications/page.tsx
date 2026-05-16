"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { FileText, MapPin, ExternalLink, Clock, Crown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { AuthRequiredPrompt } from "@/components/auth/AuthRequired";
import { IndividualAccountRequired } from "@/components/auth/AccountTypeRequired";

interface ApplicationItem {
  id: string;
  status: string;
  coverNote: string | null;
  appliedAt: string;
  listing: {
    title: string;
    slug: string;
    type: string;
    url: string;
    location: string | null;
    priceLabel: string | null;
    provider: { name: string; logo: string | null };
  };
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  applied: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  under_review: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  shortlisted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  screening: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  interview_scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  interviewing: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  decision_pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  offer_extended: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  offer_accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  hired: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  offer_declined: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  withdrawn: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  position_closed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const applicationStatuses = [
  "draft",
  "applied",
  "under_review",
  "shortlisted",
  "screening",
  "interview_scheduled",
  "interviewing",
  "decision_pending",
  "offer_accepted",
  "rejected",
  "offer_declined",
  "withdrawn",
];

const summaryStatuses = ["applied", "under_review", "interview_scheduled", "offer_extended"];

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function ApplicationsContent() {
  const { data: session, status: authStatus } = useSession();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);

  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const userTier = (session?.user as Record<string, unknown> | undefined)?.tier as string | undefined;
  const isPro = userTier === "pro";
  const isUser = userId && userId !== "admin";

  useEffect(() => {
    if (!isUser) return;
    let cancelled = false;
    (async () => {
      const r = await fetch("/api/user/applications");
      if (r.status === 401) {
        if (!cancelled) setAuthExpired(true);
        return;
      }
      const d = await r.json();
      if (!cancelled) setApplications(d.applications || []);
    })();
    return () => { cancelled = true; };
  }, [isUser]);

  if (authStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isUser) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-2">Track Your Applications</h1>
        <p className="text-muted-foreground mb-6">Sign in to view and manage your job applications</p>
        <Link href="/auth/signin?callbackUrl=/applications"><Button>Sign In</Button></Link>
      </div>
    );
  }

  if (authExpired) {
    return (
      <AuthRequiredPrompt
        callbackUrl="/applications"
        title="Sign in to track applications"
        description="Application tracking is stored in your EDU Passport account."
      />
    );
  }

  if (!isPro) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Crown className="h-12 w-12 mx-auto mb-4 text-amber-500" />
        <h1 className="text-2xl font-bold mb-2">Pro Feature</h1>
        <p className="text-muted-foreground mb-6">Quick Apply and application tracking are available with EDU Passport Pro</p>
        <Link href="/pricing"><Button>View Pro Plans</Button></Link>
      </div>
    );
  }

  const handleStatusChange = async (applicationId: string, nextStatus: string) => {
    const res = await fetch("/api/user/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, status: nextStatus }),
    });
    if (!res.ok) return;
    setApplications((prev) => prev.map((app) => (
      app.id === applicationId ? { ...app, status: nextStatus } : app
    )));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" /> My Applications
          </h1>
          <p className="text-muted-foreground text-sm">{applications.length} application{applications.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/jobs"><Button variant="outline">Browse Jobs</Button></Link>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {summaryStatuses.map((s) => (
          <div key={s} className="rounded-xl border p-3 text-center">
            <p className="text-lg font-bold">{applications.filter((a) => a.status === s).length}</p>
            <p className="text-xs text-muted-foreground capitalize">{formatStatusLabel(s)}</p>
          </div>
        ))}
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 rounded-xl border">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No applications yet. Use Quick Apply on job listings to get started!</p>
          <Link href="/jobs"><Button>Browse Jobs</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="rounded-xl border p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                {app.listing.provider.logo && (
                  <Image
                    src={app.listing.provider.logo}
                    alt={app.listing.provider.name}
                    width={36}
                    height={36}
                    className="rounded-md mt-0.5 shrink-0"
                    unoptimized
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/listing/${app.listing.slug}`} className="font-semibold text-sm hover:text-primary transition-colors">
                      {app.listing.title}
                    </Link>
                    <select
                      value={app.status}
                      onChange={(event) => handleStatusChange(app.id, event.target.value)}
                      className={`rounded-full border-0 px-2 py-0.5 text-[10px] font-medium capitalize outline-none ${statusColors[app.status] || statusColors.draft}`}
                      aria-label={`Status for ${app.listing.title}`}
                    >
                      {applicationStatuses.map((status) => (
                        <option key={status} value={status}>{formatStatusLabel(status)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{app.listing.provider.name}</span>
                    {app.listing.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {app.listing.location}
                      </span>
                    )}
                    {app.listing.priceLabel && <span>{app.listing.priceLabel}</span>}
                  </div>
                  {app.coverNote && (
                    <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{app.coverNote}&rdquo;</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Applied {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                    <a
                      href={app.listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View listing <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <IndividualAccountRequired
      callbackUrl="/applications"
      title="Sign in to track applications"
      description="Application tracking is stored in your EDU Passport account."
    >
      <ApplicationsContent />
    </IndividualAccountRequired>
  );
}
