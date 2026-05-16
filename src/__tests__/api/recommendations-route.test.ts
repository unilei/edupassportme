import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireIndividualUser: vi.fn(),
  getRecommendations: vi.fn(),
}));

vi.mock("@/lib/api-utils", () => ({
  requireIndividualUser: mocks.requireIndividualUser,
  isAuthError: vi.fn((r: unknown) => !(r && typeof r === "object" && "userId" in r)),
}));

vi.mock("@/lib/recommendations", () => ({
  getRecommendations: mocks.getRecommendations,
}));

import { GET } from "@/app/api/user/recommendations/route";

describe("/api/user/recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireIndividualUser.mockResolvedValue({ userId: "user_1", isAdmin: false });
    mocks.getRecommendations.mockResolvedValue([{ id: "listing_1" }]);
  });

  it("returns recommendations for individual accounts", async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.listings).toEqual([{ id: "listing_1" }]);
    expect(mocks.getRecommendations).toHaveBeenCalledWith({ userId: "user_1", limit: 12 });
  });

  it("rejects non-individual accounts before loading recommendations", async () => {
    mocks.requireIndividualUser.mockResolvedValue(
      NextResponse.json({ error: "Individual account required" }, { status: 403 }),
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ error: "Individual account required" });
    expect(mocks.getRecommendations).not.toHaveBeenCalled();
  });
});
