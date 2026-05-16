import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  organizationFindMany: vi.fn(),
  listingSubmissionCount: vi.fn(),
  listingCount: vi.fn(),
  applicationCount: vi.fn(),
  applicationGroupBy: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findMany: mocks.organizationFindMany,
    },
    listingSubmission: {
      count: mocks.listingSubmissionCount,
    },
    listing: {
      count: mocks.listingCount,
    },
    application: {
      count: mocks.applicationCount,
      groupBy: mocks.applicationGroupBy,
    },
  },
}));

import { GET } from "@/app/api/business/overview/route";

describe("/api/business/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({
      user: { id: "owner_1", role: "user", accountType: "organization" },
    });
    mocks.organizationFindMany.mockResolvedValue([
      {
        id: "org_1",
        name: "Example Employer",
        type: "employer",
        status: "active",
        plan: "business",
        verifiedAt: new Date("2026-05-01T00:00:00.000Z"),
        canPostJobs: true,
        canPostEvents: true,
        canPostDeals: false,
        canSponsor: true,
        jobPostLimit: 10,
        eventPostLimit: 5,
        dealPostLimit: 0,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        _count: { submissions: 4, dealProgramApplications: 1 },
      },
      {
        id: "org_2",
        name: "Example Partner",
        type: "partner",
        status: "active",
        plan: "partner",
        verifiedAt: null,
        canPostJobs: true,
        canPostEvents: true,
        canPostDeals: true,
        canSponsor: true,
        jobPostLimit: 20,
        eventPostLimit: 20,
        dealPostLimit: 20,
        createdAt: new Date("2026-04-15T00:00:00.000Z"),
        _count: { submissions: 2, dealProgramApplications: 0 },
      },
    ]);
    mocks.listingSubmissionCount.mockResolvedValue(6);
    mocks.listingCount.mockResolvedValue(3);
    mocks.applicationCount.mockResolvedValueOnce(5).mockResolvedValueOnce(4);
    mocks.applicationGroupBy.mockResolvedValue([
      { status: "under_review", _count: { status: 2 } },
      { status: "interview_scheduled", _count: { status: 1 } },
      { status: "hired", _count: { status: 1 } },
      { status: "rejected", _count: { status: 1 } },
    ]);
  });

  it("rejects guests and admin sessions", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const guest = await GET();

    expect(guest.status).toBe(401);
    expect(await guest.json()).toEqual({ error: "Unauthorized" });

    mocks.getServerSession.mockResolvedValue({ user: { id: "admin", role: "admin" } });

    const admin = await GET();

    expect(admin.status).toBe(401);
    expect(await admin.json()).toEqual({ error: "Unauthorized" });

    mocks.getServerSession.mockResolvedValue({ user: { id: "student_1", accountType: "student" } });

    const student = await GET();

    expect(student.status).toBe(403);
    expect(await student.json()).toEqual({ error: "Business account required" });
    expect(mocks.organizationFindMany).not.toHaveBeenCalled();
  });

  it("returns organization overview counts scoped to the current owner", async () => {
    const res = await GET();
    const body = await res.json();
    const ownerListingWhere = {
      OR: [
        { organizationId: { in: ["org_1", "org_2"] } },
        { sourceSubmission: { organizationId: { in: ["org_1", "org_2"] } } },
      ],
    };

    expect(res.status).toBe(200);
    expect(body.counts).toEqual({
      organizations: 2,
      submissions: 6,
      publishedListings: 3,
      applications: 5,
      activeApplications: 4,
    });
    expect(body.applicationStatusCounts).toEqual({
      under_review: 2,
      interview_scheduled: 1,
      hired: 1,
      rejected: 1,
    });
    expect(mocks.organizationFindMany).toHaveBeenCalledWith({
      where: { ownerId: "owner_1" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        plan: true,
        verifiedAt: true,
        canPostJobs: true,
        canPostEvents: true,
        canPostDeals: true,
        canSponsor: true,
        jobPostLimit: true,
        eventPostLimit: true,
        dealPostLimit: true,
        createdAt: true,
        _count: { select: { submissions: true, dealProgramApplications: true } },
      },
    });
    expect(mocks.listingSubmissionCount).toHaveBeenCalledWith({
      where: { organizationId: { in: ["org_1", "org_2"] } },
    });
    expect(mocks.listingCount).toHaveBeenCalledWith({ where: ownerListingWhere });
    expect(mocks.applicationCount).toHaveBeenCalledWith({
      where: { listing: ownerListingWhere },
    });
    expect(mocks.applicationCount).toHaveBeenCalledWith({
      where: {
        status: {
          notIn: ["hired", "rejected", "withdrawn", "offer_declined", "position_closed"],
        },
        listing: ownerListingWhere,
      },
    });
    expect(mocks.applicationGroupBy).toHaveBeenCalledWith({
      by: ["status"],
      where: { listing: ownerListingWhere },
      _count: { status: true },
    });
  });

  it("returns empty counts when the user has no organizations", async () => {
    mocks.organizationFindMany.mockResolvedValue([]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      organizations: [],
      counts: {
        organizations: 0,
        submissions: 0,
        publishedListings: 0,
        applications: 0,
        activeApplications: 0,
      },
      applicationStatusCounts: {},
    });
    expect(mocks.listingSubmissionCount).not.toHaveBeenCalled();
    expect(mocks.listingCount).not.toHaveBeenCalled();
    expect(mocks.applicationCount).not.toHaveBeenCalled();
    expect(mocks.applicationGroupBy).not.toHaveBeenCalled();
  });
});
