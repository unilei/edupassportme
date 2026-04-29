"use client";

import { useEffect, useState } from "react";
import { useSession, SessionProvider } from "next-auth/react";
import { FileText, MapPin, ExternalLink, Clock, Crown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

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
  viewed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  interview: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  offered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  withdrawn: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

function ApplicationsContent() {
  const { data: session, status: authStatus } = useSession();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading] = useState(false);

  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const userTier = (session?.user as Record<string, unknown> | undefined)?.tier as string | undefined;
  const isPro = userTier === "pro";
  const isUser = userId && userId !== "admin";

  useEffect(() => {
    if (!isUser) return;
    let cancelled = false;
    (async () => {
      const r = await fetch("/api/user/applications");
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
        <Link href="/auth/signin"><Button>Sign In</Button></Link>
      </div>
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
        {["applied", "viewed", "interview", "offered"].map((s) => (
          <div key={s} className="rounded-xl border p-3 text-center">
            <p className="text-lg font-bold">{applications.filter((a) => a.status === s).length}</p>
            <p className="text-xs text-muted-foreground capitalize">{s}</p>
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[app.status] || statusColors.draft}`}>
                      {app.status}
                    </span>
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
    <SessionProvider>
      <ApplicationsContent />
    </SessionProvider>
  );
}
