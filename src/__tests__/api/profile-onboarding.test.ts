import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  appUserFindUnique: vi.fn(),
  appUserUpdate: vi.fn(),
  userProfileUpsert: vi.fn(),
  organizationFindFirst: vi.fn(),
  organizationCreate: vi.fn(),
  organizationUpdate: vi.fn(),
  dealProgramApplicationFindFirst: vi.fn(),
  dealProgramApplicationCreate: vi.fn(),
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
    organization: {
      findFirst: mocks.organizationFindFirst,
      create: mocks.organizationCreate,
      update: mocks.organizationUpdate,
    },
    dealProgramApplication: {
      findFirst: mocks.dealProgramApplicationFindFirst,
      create: mocks.dealProgramApplicationCreate,
    },
  },
}));

import { PUT } from "@/app/api/user/profile/route";

describe("/api/user/profile account onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    mocks.appUserUpdate.mockResolvedValue({});
    mocks.userProfileUpsert.mockResolvedValue({});
    mocks.organizationFindFirst.mockResolvedValue(null);
    mocks.organizationCreate.mockResolvedValue({ id: "org_1" });
    mocks.organizationUpdate.mockResolvedValue({ id: "org_1" });
    mocks.dealProgramApplicationFindFirst.mockResolvedValue(null);
    mocks.dealProgramApplicationCreate.mockResolvedValue({ id: "deal_app_1" });
  });

  it("creates an organization identity during organization onboarding", async () => {
    mocks.appUserFindUnique.mockResolvedValue({ id: "user_1", accountType: "organization" });

    const res = await PUT(new NextRequest("http://localhost:3000/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Campus Employer",
        organizationName: "Campus Employer",
        organizationWebsite: "https://employer.example",
        organizationType: "employer",
        organizationDescription: "We publish early career opportunities.",
        completeOnboarding: true,
      }),
    }));

    expect(res.status).toBe(200);
    expect(mocks.organizationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        ownerId: "user_1",
        name: "Campus Employer",
        website: "https://employer.example/",
        type: "employer",
        description: "We publish early career opportunities.",
      }),
    }));
    expect(mocks.userProfileUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ onboardingCompletedAt: expect.any(Date) }),
      create: expect.objectContaining({ onboardingCompletedAt: expect.any(Date) }),
    }));
  });

  it("creates a partner organization and deal program application during partner onboarding", async () => {
    mocks.appUserFindUnique.mockResolvedValue({
      id: "partner_1",
      email: "partner@example.com",
      accountType: "partner",
    });

    const res = await PUT(new NextRequest("http://localhost:3000/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationName: "Student Deals Co",
        organizationWebsite: "https://deals.example",
        organizationDescription: "Student discounts and benefits.",
        contactName: "Pat Partner",
        contactEmail: "Partnerships@Deals.Example",
        proposedOffer: "20% off verified education purchases.",
        targetAudience: "US learners and early career professionals",
        completeOnboarding: true,
      }),
    }));

    expect(res.status).toBe(200);
    expect(mocks.organizationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        ownerId: "partner_1",
        name: "Student Deals Co",
        type: "partner",
        website: "https://deals.example/",
      }),
    }));
    expect(mocks.dealProgramApplicationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: "org_1",
        submittedById: "partner_1",
        contactName: "Pat Partner",
        contactEmail: "partnerships@deals.example",
        proposedOffer: "20% off verified education purchases.",
        targetAudience: "US learners and early career professionals",
        status: "pending",
      }),
    }));
  });
});
