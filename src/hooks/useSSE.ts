"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseSSEOptions<T> {
  url: string;
  enabled?: boolean;
  maxRetries?: number;
  onMessage?: (data: T) => void;
}

interface UseSSEReturn<T> {
  lastEvent: T | null;
  connected: boolean;
  error: boolean;
  reconnect: () => void;
}

/**
 * Generic SSE hook with auto-reconnect and exponential backoff.
 */
export function useSSE<T = unknown>(opts: UseSSEOptions<T>): UseSSEReturn<T> {
  const { url, enabled = true, maxRetries = 5, onMessage } = opts;
  const [lastEvent, setLastEvent] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  const connectRef = useRef<() => void>(null);

  useEffect(() => {
    const doConnect = () => {
      if (!enabled || typeof window === "undefined") return;

      esRef.current?.close();

      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        setError(false);
        retryRef.current = 0;
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as T;
          setLastEvent(data);
          onMessageRef.current?.(data);
        } catch {
          // ignore parse errors (heartbeats)
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setConnected(false);

        if (retryRef.current < maxRetries) {
          const delay = Math.min(1000 * 2 ** retryRef.current, 30_000);
          retryRef.current++;
          setError(false);
          timerRef.current = setTimeout(() => connectRef.current?.(), delay);
        } else {
          setError(true);
        }
      };
    };

    connectRef.current = doConnect;
    doConnect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [url, enabled, maxRetries]);

  const reconnect = useCallback(() => {
    retryRef.current = 0;
    setError(false);
    connectRef.current?.();
  }, []);

  return { lastEvent, connected, error, reconnect };
}
