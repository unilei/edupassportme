import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  appUserFindUnique: vi.fn(),
  appUserUpdate: vi.fn(),
  userProfileUpsert: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: {
      findUnique: mocks.appUserFindUnique,
      update: mocks.appUserUpdate,
    },
    userProfile: {
      upsert: mocks.userProfileUpsert,
    },
  },
}));

import { PUT } from "@/app/api/user/profile/route";

describe("/api/user/profile workspace preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    mocks.appUserUpdate.mockResolvedValue({});
    mocks.userProfileUpsert.mockResolvedValue({});
  });

  it("saves onboarding goals, target regions, preferred opportunity types, and completion timestamp", async () => {
    const res = await PUT(new NextRequest("http://localhost:3000/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alex Student",
        educationLevel: "Undergraduate",
        interests: ["Data Science", "UX Design"],
        goals: ["Internship-ready skills", "Scholarship planning"],
        targetRegions: ["United States", "Remote"],
        preferredTypes: ["course", "job", "event"],
        completeOnboarding: true,
      }),
    }));

    expect(res.status).toBe(200);
    expect(mocks.userProfileUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "user_1" },
      update: expect.objectContaining({
        goals: ["Internship-ready skills", "Scholarship planning"],
        targetRegions: ["United States", "Remote"],
        preferredTypes: ["course", "job", "event"],
        onboardingCompletedAt: expect.any(Date),
      }),
      create: expect.objectContaining({
        goals: ["Internship-ready skills", "Scholarship planning"],
        targetRegions: ["United States", "Remote"],
        preferredTypes: ["course", "job", "event"],
        onboardingCompletedAt: expect.any(Date),
      }),
    }));
  });
});
