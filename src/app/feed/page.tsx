"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/hooks/useFetch";
import { useSSE } from "@/hooks/useSSE";
import { ChevronLeft, ChevronRight, User, Rss, Wifi, WifiOff } from "lucide-react";
import Image from "next/image";

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  link: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; avatar: string | null };
}

interface FeedResponse {
  activities: ActivityItem[];
  total: number;
  page: number;
  totalPages: number;
}

const typeIcons: Record<string, string> = {
  review: "📝",
  reply: "💬",
  save: "🔖",
  follow: "🤝",
  badge: "🏅",
  enroll: "🎓",
  complete: "🎉",
};

interface StreamEvent {
  type: string;
  activities?: ActivityItem[];
  watchCount?: number;
}

export default function FeedPage() {
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<"following" | "me">("following");
  const [liveItems, setLiveItems] = useState<ActivityItem[]>([]);

  const { data, loading } = useFetch<FeedResponse>(
    `/api/user/feed?page=${page}&scope=${scope}`,
  );

  const handleSSE = useCallback((event: StreamEvent) => {
    if (event.type === "new_activities" && event.activities) {
      setLiveItems((prev) => {
        const ids = new Set(prev.map((a) => a.id));
        const fresh = event.activities!.filter((a) => !ids.has(a.id));
        return [...fresh, ...prev].slice(0, 20);
      });
    }
  }, []);

  const { connected } = useSSE<StreamEvent>({
    url: "/api/user/feed/stream",
    enabled: scope === "following" && page === 1,
    onMessage: handleSSE,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rss className="h-6 w-6" /> Activity Feed
          </h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.total} activities` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scope === "following" && page === 1 && (
            <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${connected ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
              {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {connected ? "Live" : "Offline"}
            </span>
          )}
        <div className="flex gap-1 rounded-lg border p-1">
          <Button
            variant={scope === "following" ? "default" : "ghost"}
            size="sm"
            className="text-xs"
            onClick={() => { setScope("following"); setPage(1); }}
          >
            Following
          </Button>
          <Button
            variant={scope === "me" ? "default" : "ghost"}
            size="sm"
            className="text-xs"
            onClick={() => { setScope("me"); setPage(1); }}
          >
            My Activity
          </Button>
        </div>
        </div>
      </div>

      {/* Live items from SSE */}
      {liveItems.length > 0 && page === 1 && scope === "following" && (
        <div className="space-y-3">
          <p className="text-xs text-green-600 font-medium flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            {liveItems.length} new {liveItems.length === 1 ? "activity" : "activities"}
          </p>
          {liveItems.map((a) => (
            <div key={a.id} className="flex gap-3 rounded-xl border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20 p-4 transition-colors">
              <div className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                {a.user.avatar ? (
                  <Image src={a.user.avatar} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium truncate">{a.user.name || a.user.email}</span>
                  <span className="text-xs text-green-600">just now</span>
                </div>
                <p className="text-sm mt-0.5">
                  <span className="mr-1">{typeIcons[a.type] || "📌"}</span>
                  {a.link ? <a href={a.link} className="hover:underline">{a.message}</a> : a.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : data?.activities.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-muted-foreground">No activities yet</p>
            {scope === "following" && (
              <p className="text-sm text-muted-foreground">Follow other users to see their activity here</p>
            )}
          </div>
        ) : (
          data?.activities.map((a) => (
            <div key={a.id} className="flex gap-3 rounded-xl border p-4 hover:bg-muted/30 transition-colors">
              <div className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                {a.user.avatar ? (
                  <Image src={a.user.avatar} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium truncate">{a.user.name || a.user.email}</span>
                  <span className="text-muted-foreground">&middot;</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm mt-0.5">
                  <span className="mr-1">{typeIcons[a.type] || "📌"}</span>
                  {a.link ? (
                    <a href={a.link} className="hover:underline">{a.message}</a>
                  ) : (
                    a.message
                  )}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
