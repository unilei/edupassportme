import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockRequireAdmin,
  mockAuditLog,
  mockListingSubmissionFindMany,
  mockListingSubmissionCount,
  mockListingSubmissionFindUnique,
  mockListingSubmissionUpdate,
  mockListingSubmissionUpdateMany,
  mockProviderUpsert,
  mockListingCreate,
  mockTransaction,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockAuditLog: vi.fn(),
  mockListingSubmissionFindMany: vi.fn(),
  mockListingSubmissionCount: vi.fn(),
  mockListingSubmissionFindUnique: vi.fn(),
  mockListingSubmissionUpdate: vi.fn(),
  mockListingSubmissionUpdateMany: vi.fn(),
  mockProviderUpsert: vi.fn(),
  mockListingCreate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: mockRequireAdmin,
  auditLog: mockAuditLog,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listingSubmission: {
      findMany: mockListingSubmissionFindMany,
      count: mockListingSubmissionCount,
      findUnique: mockListingSubmissionFindUnique,
      update: mockListingSubmissionUpdate,
      updateMany: mockListingSubmissionUpdateMany,
    },
    provider: {
      upsert: mockProviderUpsert,
    },
    listing: {
      create: mockListingCreate,
    },
    $transaction: mockTransaction,
  },
}));

import { GET, PATCH } from "@/app/api/admin/submissions/route";

function getRequest(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/submissions", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-user", role: "admin" } });
    mockAuditLog.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (callback) =>
      callback({
        provider: { upsert: mockProviderUpsert },
        listing: { create: mockListingCreate },
        listingSubmission: {
          update: mockListingSubmissionUpdate,
          updateMany: mockListingSubmissionUpdateMany,
        },
      }),
    );
    mockListingSubmissionUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects non-admin users", async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const res = await GET(getRequest("/api/admin/submissions"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockListingSubmissionFindMany).not.toHaveBeenCalled();
  });

  it("lists submissions by status and type", async () => {
    mockListingSubmissionFindMany.mockResolvedValue([
      { id: "sub_1", status: "pending_review", type: "job" },
    ]);
    mockListingSubmissionCount.mockResolvedValue(1);

    const res = await GET(
      getRequest("/api/admin/submissions?status=pending_review&type=job&page=2&limit=10"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockListingSubmissionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "pending_review", type: "job" },
        skip: 10,
        take: 10,
      }),
    );
    expect(body).toEqual({
      submissions: [{ id: "sub_1", status: "pending_review", type: "job" }],
      total: 1,
      page: 2,
      totalPages: 1,
    });
  });

  it("rejects a submission with review note", async () => {
    mockListingSubmissionFindUnique.mockResolvedValue({
      id: "sub_1",
      title: "Unverified fellowship",
      status: "pending_review",
    });
    mockListingSubmissionUpdate.mockResolvedValue({ id: "sub_1", status: "rejected" });

    const res = await PATCH(
      patchRequest({ id: "sub_1", action: "reject", reviewNote: "Missing official URL" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockListingSubmissionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "sub_1",
          publishedListingId: null,
          status: "pending_review",
        },
        data: expect.objectContaining({
          status: "rejected",
          reviewNote: "Missing official URL",
          reviewedAt: expect.any(Date),
          reviewedById: "admin-user",
        }),
      }),
    );
    expect(mockAuditLog).toHaveBeenCalledWith("admin", "listingSubmission.reject", "sub_1", {
      title: "Unverified fellowship",
      previousStatus: "pending_review",
      reviewNote: "Missing official URL",
    });
  });

  it("returns 404 when rejecting a non-existing submission", async () => {
    mockListingSubmissionFindUnique.mockResolvedValue(null);

    const res = await PATCH(patchRequest({ id: "missing", action: "reject" }));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "Submission not found" });
    expect(mockListingSubmissionUpdate).not.toHaveBeenCalled();
    expect(mockAuditLog).not.toHaveBeenCalled();
  });

  it("stores a null reviewer id for the built-in admin session", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin", role: "admin" } });
    mockListingSubmissionFindUnique.mockResolvedValue({
      id: "sub_1",
      title: "Unverified fellowship",
      status: "pending_review",
    });
    mockListingSubmissionUpdate.mockResolvedValue({ id: "sub_1", status: "rejected" });

    const res = await PATCH(
      patchRequest({ id: "sub_1", action: "reject", reviewNote: "Missing official URL" }),
    );

    expect(res.status).toBe(200);
    expect(mockListingSubmissionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewedById: null,
        }),
      }),
    );
  });

  it("approves and publishes a listing from a submission", async () => {
    mockListingSubmissionFindUnique.mockResolvedValue({
      id: "sub_123",
      type: "job",
      title: "STEM Program Manager",
      description: "Lead STEM programming for high school students.",
      url: "https://example.org/jobs/stem-manager",
      image: null,
      companyName: "Example School",
      location: "New York, NY",
      country: "US",
      region: "NY",
      startDate: null,
      endDate: null,
      expiresAt: null,
      priceLabel: null,
      couponCode: null,
      metadata: { submittedFrom: "public_form" },
      status: "pending_review",
      publishedListingId: null,
    });
    mockProviderUpsert.mockResolvedValue({ id: "provider_1" });
    mockListingCreate.mockResolvedValue({ id: "listing_1", title: "STEM Program Manager" });
    mockListingSubmissionUpdate.mockResolvedValue({
      id: "sub_123",
      status: "published",
      publishedListingId: "listing_1",
    });

    const res = await PATCH(
      patchRequest({ id: "sub_123", action: "approve", reviewNote: "Looks good" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, listingId: "listing_1" });
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockListingSubmissionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "sub_123",
        publishedListingId: null,
        status: "pending_review",
      },
      data: expect.objectContaining({
        status: "approved",
        reviewedAt: expect.any(Date),
        reviewedById: "admin-user",
        reviewNote: "Looks good",
      }),
    });
    expect(mockProviderUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "manual-submissions" },
        create: expect.objectContaining({
          name: "Manual Submissions",
          slug: "manual-submissions",
          apiType: "manual",
          isActive: true,
        }),
        select: { id: true },
      }),
    );
    expect(mockListingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "STEM Program Manager",
        slug: "stem-program-manager-sub-123",
        type: "job",
        providerId: "provider_1",
        status: "active",
        verified: true,
        qualityScore: 0.8,
      }),
    });
    expect(mockListingSubmissionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub_123" },
        data: expect.objectContaining({
          status: "published",
          publishedListingId: "listing_1",
          reviewedAt: expect.any(Date),
          reviewedById: "admin-user",
          reviewNote: "Looks good",
        }),
      }),
    );
    expect(mockAuditLog).toHaveBeenCalledWith("admin", "listingSubmission.approve", "sub_123", {
      title: "STEM Program Manager",
      previousStatus: "pending_review",
      publishedListingId: "listing_1",
    });
  });

  it("does not publish a submission that already has a published listing", async () => {
    mockListingSubmissionFindUnique.mockResolvedValue({
      id: "sub_123",
      type: "job",
      title: "STEM Program Manager",
      description: "Lead STEM programming for high school students.",
      url: "https://example.org/jobs/stem-manager",
      image: null,
      companyName: "Example School",
      location: "New York, NY",
      country: "US",
      region: "NY",
      startDate: null,
      endDate: null,
      expiresAt: null,
      priceLabel: null,
      couponCode: null,
      metadata: { submittedFrom: "public_form" },
      status: "published",
      publishedListingId: "listing_1",
    });

    const res = await PATCH(patchRequest({ id: "sub_123", action: "approve" }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toEqual({ error: "Submission is already published" });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockListingCreate).not.toHaveBeenCalled();
  });

  it("rejects stale non-publish transitions after submission state changes", async () => {
    mockListingSubmissionFindUnique.mockResolvedValue({
      id: "sub_1",
      title: "Already reviewed fellowship",
      status: "published",
      publishedListingId: "listing_1",
    });
    mockListingSubmissionUpdateMany.mockResolvedValue({ count: 0 });

    const res = await PATCH(
      patchRequest({ id: "sub_1", action: "reject", reviewNote: "Too late" }),
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toEqual({ error: "Submission state changed. Reload and try again." });
    expect(mockAuditLog).not.toHaveBeenCalled();
  });

  it("rejects stale approve claims after submission state changes", async () => {
    mockListingSubmissionFindUnique.mockResolvedValue({
      id: "sub_123",
      type: "job",
      title: "STEM Program Manager",
      description: "Lead STEM programming for high school students.",
      url: "https://example.org/jobs/stem-manager",
      image: null,
      companyName: "Example School",
      location: "New York, NY",
      country: "US",
      region: "NY",
      startDate: null,
      endDate: null,
      expiresAt: null,
      priceLabel: null,
      couponCode: null,
      metadata: { submittedFrom: "public_form" },
      status: "needs_changes",
      publishedListingId: null,
    });
    mockListingSubmissionUpdateMany.mockResolvedValue({ count: 0 });

    const res = await PATCH(patchRequest({ id: "sub_123", action: "approve" }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toEqual({ error: "Submission state changed. Reload and try again." });
    expect(mockProviderUpsert).not.toHaveBeenCalled();
    expect(mockListingCreate).not.toHaveBeenCalled();
  });
});
