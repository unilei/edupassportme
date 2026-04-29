"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useRef, useCallback } from "react";

/**
 * Recommended thresholds (p75) per https://web.dev/vitals/
 *   - LCP: ≤2500ms good, >4000ms poor
 *   - FID: ≤100ms good,  >300ms poor
 *   - CLS: ≤0.1 good,    >0.25 poor
 *   - INP: ≤200ms good,  >500ms poor
 *   - TTFB: ≤800ms good, >1800ms poor
 *   - FCP: ≤1800ms good, >3000ms poor
 */
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  TTFB: { good: 800, poor: 1800 },
  FCP: { good: 1800, poor: 3000 },
};

interface VitalEntry {
  name: string;
  value: number;
  rating: string;
  id: string;
  navigationType: string;
  path: string;
  timestamp: number;
}

const BATCH_SIZE = 5;
const FLUSH_INTERVAL = 10_000; // 10s

export function WebVitals() {
  const queue = useRef<VitalEntry[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (queue.current.length === 0) return;
    const batch = queue.current.splice(0);
    const body = JSON.stringify({ vitals: batch });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/vitals", body);
    } else {
      fetch("/api/vitals", {
        method: "POST",
        body,
        keepalive: true,
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    }
  }, []);

  useReportWebVitals((metric) => {
    const threshold = THRESHOLDS[metric.name];
    const unit = metric.name === "CLS" ? "" : "ms";
    const val = metric.name === "CLS" ? metric.value.toFixed(3) : Math.round(metric.value);

    // Dev logging with color
    if (process.env.NODE_ENV === "development") {
      const color =
        metric.rating === "good"
          ? "color: green"
          : metric.rating === "needs-improvement"
            ? "color: orange"
            : "color: red";

      const thresholdInfo = threshold
        ? ` [good≤${threshold.good}${unit}, poor>${threshold.poor}${unit}]`
        : "";

      console.log(
        `%c[Web Vitals] ${metric.name}: ${val}${unit} (${metric.rating})${thresholdInfo}`,
        color,
      );
    }

    // Queue non-good metrics for production reporting
    if (process.env.NODE_ENV === "production" && metric.rating !== "good") {
      queue.current.push({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
        path: typeof window !== "undefined" ? window.location.pathname : "",
        timestamp: Date.now(),
      });

      if (queue.current.length >= BATCH_SIZE) {
        flush();
      } else if (!timer.current) {
        timer.current = setTimeout(() => {
          flush();
          timer.current = null;
        }, FLUSH_INTERVAL);
      }
    }
  });

  return null;
}
