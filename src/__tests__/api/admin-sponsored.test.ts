import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  sponsoredFindMany: vi.fn(),
  sponsoredCreate: vi.fn(),
  sponsoredDelete: vi.fn(),
  organizationFindUnique: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sponsoredListing: {
      findMany: mocks.sponsoredFindMany,
      create: mocks.sponsoredCreate,
      delete: mocks.sponsoredDelete,
    },
    organization: {
      findUnique: mocks.organizationFindUnique,
    },
  },
}));

import { POST } from "@/app/api/admin/sponsored/route";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/sponsored", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/sponsored", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ user: { id: "admin", role: "admin" } });
    mocks.organizationFindUnique.mockResolvedValue({ id: "org_1" });
    mocks.sponsoredCreate.mockResolvedValue({ id: "sponsored_1" });
  });

  it("requires admin access", async () => {
    mocks.requireAdmin.mockResolvedValue(null);

    const res = await POST(postRequest({ listingId: "listing_1", position: "feed" }));

    expect(res.status).toBe(401);
    expect(mocks.sponsoredCreate).not.toHaveBeenCalled();
  });

  it("creates a sponsored listing tied to an organization", async () => {
    const res = await POST(
      postRequest({
        listingId: "listing_1",
        organizationId: "org_1",
        position: "feed",
        budget: 250,
        cpc: 1.5,
        endDate: "2026-06-01T00:00:00.000Z",
      }),
    );

    expect(res.status).toBe(201);
    expect(mocks.organizationFindUnique).toHaveBeenCalledWith({
      where: { id: "org_1" },
      select: { id: true },
    });
    expect(mocks.sponsoredCreate).toHaveBeenCalledWith({
      data: {
        listingId: "listing_1",
        organizationId: "org_1",
        position: "feed",
        budget: 250,
        cpc: 1.5,
        endDate: new Date("2026-06-01T00:00:00.000Z"),
      },
    });
  });

  it("rejects unknown sponsor organizations", async () => {
    mocks.organizationFindUnique.mockResolvedValue(null);

    const res = await POST(
      postRequest({ listingId: "listing_1", organizationId: "missing", position: "feed" }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Organization not found" });
    expect(mocks.sponsoredCreate).not.toHaveBeenCalled();
  });
});
