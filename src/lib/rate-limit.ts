/**
 * In-memory sliding-window rate limiter.
 * For production, swap the Map store with Redis (e.g. @upstash/ratelimit).
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimiterOptions {
  /** Max requests in the window */
  limit: number;
  /** Window duration in seconds */
  window: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup every 5 minutes to prevent memory leak
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now - entry.lastRefill > windowMs * 2) {
      store.delete(key);
    }
  }
}

export function rateLimit(key: string, options: RateLimiterOptions): { success: boolean; remaining: number } {
  const { limit, window } = options;
  const windowMs = window * 1000;
  const now = Date.now();

  cleanup(windowMs);

  const entry = store.get(key);

  if (!entry) {
    store.set(key, { tokens: limit - 1, lastRefill: now });
    return { success: true, remaining: limit - 1 };
  }

  // Refill tokens based on elapsed time
  const elapsed = now - entry.lastRefill;
  const refill = Math.floor((elapsed / windowMs) * limit);

  if (refill > 0) {
    entry.tokens = Math.min(limit, entry.tokens + refill);
    entry.lastRefill = now;
  }

  if (entry.tokens <= 0) {
    return { success: false, remaining: 0 };
  }

  entry.tokens -= 1;
  return { success: true, remaining: entry.tokens };
}

// Pre-configured limiters for common use cases
export const API_LIMITS = {
  /** General API: 60 req / 60s per IP */
  general: { limit: 60, window: 60 },
  /** Auth endpoints: 10 req / 60s per IP */
  auth: { limit: 10, window: 60 },
  /** AI endpoints: 10 req / 60s per user */
  ai: { limit: 10, window: 60 },
  /** Webhook: 100 req / 60s */
  webhook: { limit: 100, window: 60 },
} as const;
