import { NextResponse } from "next/server";

/**
 * Apply public caching headers to a response.
 * Use for public, non-personalized data (search results, listings, reviews).
 */
export function withPublicCache(
  response: NextResponse,
  opts: { sMaxAge?: number; staleWhileRevalidate?: number } = {},
): NextResponse {
  const { sMaxAge = 60, staleWhileRevalidate = 120 } = opts;
  response.headers.set(
    "Cache-Control",
    `public, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  );
  return response;
}

/**
 * Apply private caching headers to a response.
 * Use for personalized data (user recommendations, saved items).
 */
export function withPrivateCache(
  response: NextResponse,
  opts: { maxAge?: number; staleWhileRevalidate?: number } = {},
): NextResponse {
  const { maxAge = 60, staleWhileRevalidate = 300 } = opts;
  response.headers.set(
    "Cache-Control",
    `private, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  );
  return response;
}

/**
 * No-cache headers for mutations or real-time data.
 */
export function withNoCache(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
