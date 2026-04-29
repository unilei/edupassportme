"use client";

import { useEffect, useRef, useState } from "react";

interface StreamEvent {
  type: string;
  count?: number;
}

export function useNotificationStream(enabled: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRetries = 5;
  const connectRef = useRef<() => void>(null);

  useEffect(() => {
    const doConnect = () => {
      if (!enabled || typeof window === "undefined") return;

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource("/api/user/notifications/stream");
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StreamEvent;
          if (data.type === "unread_count" && typeof data.count === "number") {
            setUnreadCount(data.count);
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        if (retryCountRef.current < maxRetries) {
          const delay = Math.min(1000 * 2 ** retryCountRef.current, 30_000);
          retryCountRef.current++;
          retryTimerRef.current = setTimeout(() => connectRef.current?.(), delay);
        }
      };

      es.onopen = () => {
        retryCountRef.current = 0;
      };
    };

    connectRef.current = doConnect;
    doConnect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [enabled]);

  return { unreadCount, setUnreadCount };
}
