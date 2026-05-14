import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockRequireAdmin,
  mockAuditLog,
  mockListingFindMany,
  mockListingCount,
  mockListingGroupBy,
  mockListingFindUnique,
  mockListingUpdate,
  mockListingUpdateMany,
  mockProviderFindMany,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockAuditLog: vi.fn(),
  mockListingFindMany: vi.fn(),
  mockListingCount: vi.fn(),
  mockListingGroupBy: vi.fn(),
  mockListingFindUnique: vi.fn(),
  mockListingUpdate: vi.fn(),
  mockListingUpdateMany: vi.fn(),
  mockProviderFindMany: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: mockRequireAdmin,
  auditLog: mockAuditLog,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findMany: mockListingFindMany,
      count: mockListingCount,
      groupBy: mockListingGroupBy,
      findUnique: mockListingFindUnique,
      update: mockListingUpdate,
      updateMany: mockListingUpdateMany,
    },
    provider: {
      findMany: mockProviderFindMany,
    },
  },
}));

import { GET, PATCH } from "@/app/api/admin/listings/route";

function getRequest(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/listings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(true);
    mockAuditLog.mockResolvedValue(undefined);
  });

  it("returns listings with provider, status, quality filters and moderation summary", async () => {
    mockListingFindMany.mockResolvedValue([
      {
        id: "listing-1",
        title: "Data workshop",
        slug: "data-workshop",
        type: "event",
        verified: false,
        featured: false,
        status: "needs_review",
        qualityScore: 0.25,
        viewCount: 12,
        clickCount: 3,
        externalId: "tm-123",
        lastSeenAt: new Date("2026-05-01T00:00:00.000Z"),
        expiresAt: new Date("2026-06-01T00:00:00.000Z"),
        provider: { name: "Ticketmaster", slug: "ticketmaster" },
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
      },
    ]);
    mockListingCount.mockResolvedValue(1);
    mockProviderFindMany.mockResolvedValue([
      { name: "Ticketmaster", slug: "ticketmaster", _count: { listings: 4 } },
    ]);
    mockListingGroupBy.mockResolvedValue([
      { status: "active", _count: { _all: 4 } },
      { status: "needs_review", _count: { _all: 1 } },
    ]);

    const res = await GET(
      getRequest(
        "/api/admin/listings?page=2&limit=10&search=workshop&type=event&verified=false&status=needs_review&provider=ticketmaster&quality=low",
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockListingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          title: { contains: "workshop", mode: "insensitive" },
          type: "event",
          verified: false,
          status: "needs_review",
          provider: { slug: "ticketmaster" },
          qualityScore: { lt: 0.4 },
        },
        select: expect.objectContaining({
          status: true,
          qualityScore: true,
          externalId: true,
          lastSeenAt: true,
          expiresAt: true,
          provider: { select: { name: true, slug: true } },
        }),
        skip: 10,
        take: 10,
      }),
    );
    expect(body.listings[0]).toMatchObject({
      id: "listing-1",
      status: "needs_review",
      qualityScore: 0.25,
      provider: { slug: "ticketmaster" },
    });
    expect(body.providers).toEqual([
      { name: "Ticketmaster", slug: "ticketmaster", count: 4 },
    ]);
    expect(body.summary).toMatchObject({
      statusCounts: { active: 4, needs_review: 1 },
      lowQualityCount: 1,
    });
  });

  it("hides one listing and removes public trust flags", async () => {
    mockListingFindUnique.mockResolvedValue({
      title: "Outdated scholarship",
      status: "active",
    });
    mockListingUpdate.mockResolvedValue({ id: "listing-1" });

    const res = await PATCH(patchRequest({ id: "listing-1", action: "hide" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockListingUpdate).toHaveBeenCalledWith({
      where: { id: "listing-1" },
      data: { status: "hidden", verified: false, featured: false },
    });
    expect(mockAuditLog).toHaveBeenCalledWith("admin", "listing.hide", "listing-1", {
      title: "Outdated scholarship",
      previousStatus: "active",
    });
  });

  it("supports batch marking listings as needs review", async () => {
    mockListingUpdateMany.mockResolvedValue({ count: 2 });

    const res = await PATCH(
      patchRequest({ ids: ["listing-1", "listing-2"], action: "needs_review" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, count: 2 });
    expect(mockListingUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["listing-1", "listing-2"] } },
      data: { status: "needs_review", verified: false, featured: false },
    });
    expect(mockAuditLog).toHaveBeenCalledWith("admin", "listing.batch.needs_review", undefined, {
      count: 2,
      ids: ["listing-1", "listing-2"],
    });
  });

  it("rejects unknown moderation actions", async () => {
    const res = await PATCH(patchRequest({ id: "listing-1", action: "archive" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Invalid action" });
    expect(mockListingUpdate).not.toHaveBeenCalled();
    expect(mockListingUpdateMany).not.toHaveBeenCalled();
  });
});
