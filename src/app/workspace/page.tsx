"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight, CalendarClock, FileText, Loader2, Sparkles, Target } from "lucide-react";
import { AuthRequired, AuthRequiredPrompt } from "@/components/auth/AuthRequired";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ListingCard } from "@/components/listing/ListingCard";
import { OpportunityWorkspacePanel, type OpportunityWorkspaceEntry } from "@/components/workspace/OpportunityWorkspacePanel";
import { Button } from "@/components/ui/button";

type RecommendedListing = OpportunityWorkspaceEntry["listing"] & {
  fitScore?: number;
  fitReasons?: string[];
};

interface ApplicationItem {
  id: string;
  status: string;
}

function isDueSoon(entry: OpportunityWorkspaceEntry) {
  const now = Date.now();
  const sevenDays = now + 7 * 24 * 60 * 60 * 1000;
  return [entry.nextActionAt, entry.deadlineAt].some((value) => {
    if (!value) return false;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time >= now && time <= sevenDays;
  });
}

function WorkspaceContent() {
  const { status } = useSession();
  const [saved, setSaved] = useState<OpportunityWorkspaceEntry[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedListing[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authExpired, setAuthExpired] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const [savedRes, recsRes, appsRes] = await Promise.all([
          fetch("/api/user/saved"),
          fetch("/api/user/recommendations"),
          fetch("/api/user/applications"),
        ]);

        if (cancelled) return;
        if ([savedRes, recsRes, appsRes].some((res) => res.status === 401)) {
          setAuthExpired(true);
          setLoading(false);
          return;
        }

        const [savedData, recsData, appsData] = await Promise.all([
          savedRes.json(),
          recsRes.json(),
          appsRes.json(),
        ]);
        if (cancelled) return;
        setSaved(savedData.saved || []);
        setRecommendations(recsData.listings || []);
        setApplications(appsData.applications || []);
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    void loadWorkspace();
    return () => { cancelled = true; };
  }, [status]);

  const activeTracked = saved.filter((entry) => !["completed", "dismissed"].includes(entry.status || "saved")).length;
  const dueSoon = saved.filter(isDueSoon).length;
  const activeApplications = applications.filter((app) => !["rejected", "withdrawn"].includes(app.status)).length;
  const topRecommendations = useMemo(() => recommendations.slice(0, 3), [recommendations]);

  const handleRemove = async (listingId: string) => {
    await fetch("/api/user/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    setSaved((prev) => prev.filter((item) => item.listing.id !== listingId));
  };

  const handleUpdate = async (savedId: string, payload: Record<string, string | null>) => {
    const res = await fetch("/api/user/saved", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ savedId, ...payload }),
    });
    if (!res.ok) return;
    const data = await res.json() as { saved: OpportunityWorkspaceEntry };
    setSaved((prev) => prev.map((item) => (item.id === savedId ? data.saved : item)));
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (authExpired) {
    return (
      <AuthRequiredPrompt
        callbackUrl="/workspace"
        title="Sign in to open your workspace"
        description="Your saved opportunities, deadlines, and recommendations live in your EDU Passport account."
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Workspace" }]} />

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Target className="h-3.5 w-3.5" />
            Student Opportunity Workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Keep every next step moving.
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Turn courses, jobs, events, and student deals into a focused action list with deadlines, priorities, and recommendations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/profile">
            <Button variant="outline">Tune Preferences</Button>
          </Link>
          <Link href="/search">
            <Button>Find Opportunities <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Tracked", value: activeTracked, icon: Target },
          { label: "Due soon", value: dueSoon, icon: CalendarClock },
          { label: "Applications", value: activeApplications, icon: FileText },
          { label: "Recommended", value: recommendations.length, icon: Sparkles },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border bg-card p-4">
              <Icon className="mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          );
        })}
      </div>

      {topRecommendations.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Recommended next opportunities</h2>
              <p className="text-sm text-muted-foreground">Ranked from your profile, saved activity, goals, and preferred opportunity types.</p>
            </div>
            <Link href="/for-you" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {topRecommendations.map((listing) => (
              <div key={listing.id} className="space-y-2">
                <ListingCard listing={listing} />
                {(listing.fitReasons?.length || listing.fitScore) && (
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {listing.fitScore !== undefined && (
                      <span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
                        {listing.fitScore}% fit
                      </span>
                    )}
                    {listing.fitReasons?.slice(0, 2).map((reason) => (
                      <span key={reason} className="rounded-full border px-2 py-1 text-muted-foreground">{reason}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {saved.length === 0 ? (
        <div className="rounded-xl border py-14 text-center">
          <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <h2 className="mb-2 text-xl font-semibold">Start by saving an opportunity</h2>
          <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">
            Save courses, jobs, events, or deals, then come back here to set priorities, deadlines, and next actions.
          </p>
          <Link href="/courses">
            <Button>Browse Opportunities</Button>
          </Link>
        </div>
      ) : (
        <OpportunityWorkspacePanel entries={saved} onUpdate={handleUpdate} onRemove={handleRemove} />
      )}
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <AuthRequired
      callbackUrl="/workspace"
      title="Sign in to open your workspace"
      description="Your saved opportunities, deadlines, and recommendations live in your EDU Passport account."
    >
      <WorkspaceContent />
    </AuthRequired>
  );
}
