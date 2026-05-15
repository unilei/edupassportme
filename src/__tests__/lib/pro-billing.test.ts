import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appUserFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: {
      findUnique: mocks.appUserFindUnique,
    },
  },
}));

import { isProUser } from "@/lib/pro";

describe("isProUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false for expired Pro access", async () => {
    mocks.appUserFindUnique.mockResolvedValue({
      tier: "pro",
      proExpiresAt: new Date(Date.now() - 60_000),
    });

    await expect(isProUser("user_1")).resolves.toBe(false);
  });

  it("returns true for active Pro access", async () => {
    mocks.appUserFindUnique.mockResolvedValue({
      tier: "pro",
      proExpiresAt: new Date(Date.now() + 60_000),
    });

    await expect(isProUser("user_1")).resolves.toBe(true);
  });

  it("returns false for free users", async () => {
    mocks.appUserFindUnique.mockResolvedValue({
      tier: "free",
      proExpiresAt: null,
    });

    await expect(isProUser("user_1")).resolves.toBe(false);
  });
});
