import { test, expect } from "@playwright/test";

test.describe("Health API", () => {
  test("should return healthy status", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });
});
