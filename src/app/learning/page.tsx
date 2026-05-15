"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthRequired, AuthRequiredPrompt } from "@/components/auth/AuthRequired";
import { useFetch } from "@/hooks/useFetch";
import { BookOpen, CheckCircle, Clock, XCircle, Trash2 } from "lucide-react";
import Link from "next/link";

interface ProgressItem {
  id: string;
  status: string;
  progress: number;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  listing: {
    id: string;
    title: string;
    slug: string;
    type: string;
    image: string | null;
    provider: { name: string };
  };
}

interface ProgressResponse {
  items: ProgressItem[];
  stats: { enrolled: number; inProgress: number; completed: number; dropped: number; total: number };
}

const statusIcons: Record<string, React.ReactNode> = {
  enrolled: <BookOpen className="h-4 w-4 text-blue-500" />,
  in_progress: <Clock className="h-4 w-4 text-yellow-500" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  dropped: <XCircle className="h-4 w-4 text-gray-400" />,
};

const statusLabels: Record<string, string> = {
  enrolled: "Enrolled",
  in_progress: "In Progress",
  completed: "Completed",
  dropped: "Dropped",
};

function LearningContent() {
  const [statusFilter, setStatusFilter] = useState("");
  const [actionKey, setActionKey] = useState(0);

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);

  const { data, loading, status } = useFetch<ProgressResponse>(
    `/api/user/progress?${params}&_k=${actionKey}`,
  );

  const updateProgress = async (listingId: string, update: Record<string, unknown>) => {
    await fetch("/api/user/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, ...update }),
    });
    setActionKey((k) => k + 1);
  };

  const removeProgress = async (listingId: string) => {
    if (!confirm("Remove this from your learning list?")) return;
    await fetch(`/api/user/progress?listingId=${listingId}`, { method: "DELETE" });
    setActionKey((k) => k + 1);
  };

  if (status === 401) {
    return (
      <AuthRequiredPrompt
        callbackUrl="/learning"
        title="Sign in to track your learning"
        description="Your learning list and progress are saved to your EDU Passport account."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> My Learning
        </h1>
        <p className="text-sm text-muted-foreground">Track your learning journey</p>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Enrolled", value: data.stats.enrolled, color: "text-blue-600" },
            { label: "In Progress", value: data.stats.inProgress, color: "text-yellow-600" },
            { label: "Completed", value: data.stats.completed, color: "text-green-600" },
            { label: "Total", value: data.stats.total, color: "text-foreground" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {["", "enrolled", "in_progress", "completed", "dropped"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setStatusFilter(s)}
          >
            {s ? statusLabels[s] : "All"}
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : data?.items.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-muted-foreground">No courses yet</p>
            <p className="text-sm text-muted-foreground">Browse courses and enroll to start tracking</p>
          </div>
        ) : (
          data?.items.map((item) => (
            <div key={item.id} className="rounded-xl border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/listing/${item.listing.slug}`} className="font-medium hover:underline line-clamp-1">
                    {item.listing.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{item.listing.provider.name}</span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1">
                      {statusIcons[item.status]} {statusLabels[item.status]}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" onClick={() => removeProgress(item.listing.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{item.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>

              {/* Quick actions */}
              {item.status !== "completed" && (
                <div className="flex gap-2">
                  {item.status === "enrolled" && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => updateProgress(item.listing.id, { status: "in_progress", progress: 10 })}>
                      Start Learning
                    </Button>
                  )}
                  {item.status === "in_progress" && (
                    <>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => updateProgress(item.listing.id, { progress: Math.min(100, item.progress + 25) })}>
                        +25%
                      </Button>
                      <Button size="sm" variant="default" className="text-xs" onClick={() => updateProgress(item.listing.id, { status: "completed" })}>
                        Mark Complete
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function LearningPage() {
  return (
    <AuthRequired
      callbackUrl="/learning"
      title="Sign in to track your learning"
      description="Your learning list and progress are saved to your EDU Passport account."
    >
      <LearningContent />
    </AuthRequired>
  );
}
