import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import { withPublicCache, withPrivateCache, withNoCache } from "@/lib/cache";

describe("cache utilities", () => {
  describe("withPublicCache", () => {
    it("should set default public cache headers", () => {
      const res = withPublicCache(NextResponse.json({ ok: true }));
      expect(res.headers.get("Cache-Control")).toBe(
        "public, s-maxage=60, stale-while-revalidate=120",
      );
    });

    it("should accept custom sMaxAge and staleWhileRevalidate", () => {
      const res = withPublicCache(NextResponse.json({}), {
        sMaxAge: 30,
        staleWhileRevalidate: 60,
      });
      expect(res.headers.get("Cache-Control")).toBe(
        "public, s-maxage=30, stale-while-revalidate=60",
      );
    });
  });

  describe("withPrivateCache", () => {
    it("should set default private cache headers", () => {
      const res = withPrivateCache(NextResponse.json({ ok: true }));
      expect(res.headers.get("Cache-Control")).toBe(
        "private, max-age=60, stale-while-revalidate=300",
      );
    });

    it("should accept custom maxAge and staleWhileRevalidate", () => {
      const res = withPrivateCache(NextResponse.json({}), {
        maxAge: 120,
        staleWhileRevalidate: 600,
      });
      expect(res.headers.get("Cache-Control")).toBe(
        "private, max-age=120, stale-while-revalidate=600",
      );
    });
  });

  describe("withNoCache", () => {
    it("should set no-store cache headers", () => {
      const res = withNoCache(NextResponse.json({ ok: true }));
      expect(res.headers.get("Cache-Control")).toBe(
        "no-store, no-cache, must-revalidate",
      );
    });
  });
});
