"use client";

import { AuthRequired, AuthRequiredPrompt } from "@/components/auth/AuthRequired";
import { useFetch } from "@/hooks/useFetch";
import { Award } from "lucide-react";

interface BadgeItem {
  slug: string;
  name: string;
  description: string;
  icon: string;
  awarded: boolean;
  awardedAt: string | null;
}

interface BadgesResponse {
  badges: BadgeItem[];
  earned: number;
  total: number;
}

function BadgesContent() {
  const { data, loading, status } = useFetch<BadgesResponse>("/api/user/badges");

  if (status === 401) {
    return (
      <AuthRequiredPrompt
        callbackUrl="/badges"
        title="Sign in to view your badges"
        description="Badges are earned from your saved activity and learning progress."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6" /> Badges
        </h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.earned} of ${data.total} earned` : "Loading..."}
        </p>
      </div>

      {/* Progress */}
      {data && (
        <div className="space-y-1">
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(data.earned / data.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {Math.round((data.earned / data.total) * 100)}% complete
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {data?.badges.map((b) => (
            <div
              key={b.slug}
              className={`rounded-xl border p-4 text-center space-y-2 transition-colors ${
                b.awarded ? "bg-primary/5 border-primary/20" : "opacity-50 grayscale"
              }`}
            >
              <div className="text-3xl">{b.icon}</div>
              <p className="font-medium text-sm">{b.name}</p>
              <p className="text-xs text-muted-foreground">{b.description}</p>
              {b.awarded && b.awardedAt && (
                <p className="text-[10px] text-primary">
                  Earned {new Date(b.awardedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BadgesPage() {
  return (
    <AuthRequired
      callbackUrl="/badges"
      title="Sign in to view your badges"
      description="Badges are earned from your saved activity and learning progress."
    >
      <BadgesContent />
    </AuthRequired>
  );
}
