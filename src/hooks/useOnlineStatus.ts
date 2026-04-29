"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Track the browser's online/offline status + periodic heartbeat to server.
 */
export function useOnlineStatus(userId?: string) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Browser online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Server heartbeat — ping presence endpoint every 60s
  useEffect(() => {
    if (!userId || !isOnline) return;

    const ping = () => {
      fetch("/api/user/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "online" }),
        keepalive: true,
      }).catch(() => {});
    };

    ping(); // immediate
    const interval = setInterval(ping, 60_000);

    // Send offline on unload
    const handleUnload = () => {
      navigator.sendBeacon?.(
        "/api/user/presence",
        JSON.stringify({ status: "offline" }),
      );
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [userId, isOnline]);

  return { isOnline };
}

/**
 * Check if a specific user is online (client-side fetch).
 */
export function useUserOnlineStatus(targetUserId: string | undefined) {
  const [online, setOnline] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    if (!targetUserId) return;
    fetch(`/api/user/presence?userId=${targetUserId}`)
      .then((r) => r.json())
      .then((data: { online: boolean }) => setOnline(data.online))
      .catch(() => setOnline(null));
  }, [targetUserId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { online };
}
