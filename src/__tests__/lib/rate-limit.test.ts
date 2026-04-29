import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests within limit", () => {
    const key = "test-allow-" + Date.now();
    const opts = { limit: 5, window: 60 };

    for (let i = 0; i < 5; i++) {
      const result = rateLimit(key, opts);
      expect(result.success).toBe(true);
    }
  });

  it("blocks requests over limit", () => {
    const key = "test-block-" + Date.now();
    const opts = { limit: 3, window: 60 };

    rateLimit(key, opts);
    rateLimit(key, opts);
    rateLimit(key, opts);

    const result = rateLimit(key, opts);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns remaining count", () => {
    const key = "test-remaining-" + Date.now();
    const opts = { limit: 5, window: 60 };

    const r1 = rateLimit(key, opts);
    expect(r1.remaining).toBe(4);

    const r2 = rateLimit(key, opts);
    expect(r2.remaining).toBe(3);
  });
});
