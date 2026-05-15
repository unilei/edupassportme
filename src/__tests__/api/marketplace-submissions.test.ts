import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  organizationFindFirst: vi.fn(),
  organizationCreate: vi.fn(),
  listingSubmissionCreate: vi.fn(),
  listingSubmissionFindMany: vi.fn(),
  listingSubmissionFindFirst: vi.fn(),
  rateLimit: vi.fn(),
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
      findFirst: mocks.organizationFindFirst,
      create: mocks.organizationCreate,
    },
    listingSubmission: {
      create: mocks.listingSubmissionCreate,
      findMany: mocks.listingSubmissionFindMany,
      findFirst: mocks.listingSubmissionFindFirst,
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}));

import { GET, POST } from "@/app/api/marketplace/submissions/route";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/marketplace/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/marketplace/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    mocks.organizationFindFirst.mockResolvedValue(null);
    mocks.organizationCreate.mockResolvedValue({ id: "org_1", name: "Example School" });
    mocks.listingSubmissionCreate.mockResolvedValue({ id: "sub_1", status: "pending_review" });
    mocks.listingSubmissionFindMany.mockResolvedValue([]);
    mocks.listingSubmissionFindFirst.mockResolvedValue(null);
    mocks.rateLimit.mockReturnValue({ success: true, remaining: 9 });
  });

  it("rejects guests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const res = await POST(postRequest({}));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.listingSubmissionCreate).not.toHaveBeenCalled();
  });

  it("rejects admin sessions", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_admin", role: "admin" } });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.listingSubmissionFindMany).not.toHaveBeenCalled();
  });

  it("creates an organization and pending submission for the current user", async () => {
    const res = await POST(
      postRequest({
        type: "job",
        title: "STEM Program Manager",
        description: "Lead STEM programming for high school students.",
        url: "https://example.org/jobs/stem-manager",
        organizationName: "Example School",
        organizationType: "school",
        organizationWebsite: "https://example.edu",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({ submission: { id: "sub_1", status: "pending_review" } });
    expect(mocks.rateLimit).toHaveBeenCalledWith("marketplace-submissions:user_1", {
      limit: 10,
      window: 3600,
    });
    expect(mocks.listingSubmissionFindFirst).toHaveBeenCalledWith({
      where: {
        submittedById: "user_1",
        url: "https://example.org/jobs/stem-manager",
        status: { in: ["pending_review", "needs_changes", "published"] },
      },
      select: { id: true, status: true },
    });
    expect(mocks.organizationFindFirst).toHaveBeenCalledWith({
      where: {
        ownerId: "user_1",
        name: "Example School",
      },
      select: { id: true },
    });
    expect(mocks.organizationCreate).toHaveBeenCalledWith({
      data: {
        name: "Example School",
        type: "school",
        website: "https://example.edu/",
        ownerId: "user_1",
      },
    });
    expect(mocks.listingSubmissionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submittedById: "user_1",
        organizationId: "org_1",
        type: "job",
        title: "STEM Program Manager",
        description: "Lead STEM programming for high school students.",
        url: "https://example.org/jobs/stem-manager",
        status: "pending_review",
        metadata: { submittedFrom: "public_form" },
      }),
      select: expect.objectContaining({ id: true, status: true }),
    });
  });

  it("rate limits submission spam", async () => {
    mocks.rateLimit.mockReturnValue({ success: false, remaining: 0 });

    const res = await POST(
      postRequest({
        type: "job",
        title: "STEM Program Manager",
        description: "Lead STEM programming for high school students.",
        url: "https://example.org/jobs/stem-manager",
      }),
    );

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: "Submission limit reached. Please try again later.",
    });
    expect(mocks.listingSubmissionCreate).not.toHaveBeenCalled();
  });

  it("rejects duplicate active submissions for the same URL", async () => {
    mocks.listingSubmissionFindFirst.mockResolvedValue({
      id: "sub_existing",
      status: "pending_review",
    });

    const res = await POST(
      postRequest({
        type: "job",
        title: "STEM Program Manager",
        description: "Lead STEM programming for high school students.",
        url: "https://example.org/jobs/stem-manager",
      }),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "You already submitted this opportunity." });
    expect(mocks.listingSubmissionCreate).not.toHaveBeenCalled();
  });

  it("lists only the current user's submissions", async () => {
    mocks.listingSubmissionFindMany.mockResolvedValue([
      {
        id: "sub_1",
        title: "STEM Program Manager",
        type: "job",
        status: "pending_review",
        reviewNote: null,
        createdAt: new Date("2026-05-15T00:00:00.000Z"),
        publishedListing: null,
        organization: { name: "Example School", type: "school" },
      },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.submissions).toHaveLength(1);
    expect(mocks.listingSubmissionFindMany).toHaveBeenCalledWith({
      where: { submittedById: "user_1" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        reviewNote: true,
        createdAt: true,
        publishedListing: { select: { slug: true } },
        organization: { select: { name: true, type: true } },
      },
    });
  });
});
