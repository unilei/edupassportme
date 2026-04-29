"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useNotificationStream } from "@/hooks/useNotificationStream";

const typeIcon: Record<string, string> = {
  new_match: "🔍",
  price_drop: "💰",
  welcome: "👋",
  system: "ℹ️",
};

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const isUser = !!userId && userId !== "admin";

  // SSE-based real-time unread count
  const { unreadCount, setUnreadCount } = useNotificationStream(isUser);

  // Fetch full notification list when dropdown opens
  const fetchNotifications = useCallback(() => {
    if (!isUser) return;
    fetch("/api/user/notifications?limit=10")
      .then((r) => r.json())
      .then((data: { notifications: Notification[]; unreadCount: number }) => {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {/* ignore */});
  }, [isUser, setUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/user/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markRead(id: string) {
    await fetch("/api/user/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setUnreadCount((c) => Math.max(0, c - 1));
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  // Snapshot current time once per mount to avoid impure render calls
  const [now] = useState(() => Date.now());

  const timeAgo = useCallback(
    (dateStr: string) => {
      const diff = now - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    },
    [now],
  );

  if (!isUser) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-card shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const inner = (
                  <div
                    className={`flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                      if (!n.link) setOpen(false);
                    }}
                  >
                    <span className="text-base shrink-0 mt-0.5">{typeIcon[n.type] || "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.read ? "font-semibold" : ""}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                    )}
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
