import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockRequireAdmin,
  mockAuditLog,
  mockOrganizationFindMany,
  mockOrganizationCount,
  mockOrganizationFindUnique,
  mockOrganizationUpdate,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockAuditLog: vi.fn(),
  mockOrganizationFindMany: vi.fn(),
  mockOrganizationCount: vi.fn(),
  mockOrganizationFindUnique: vi.fn(),
  mockOrganizationUpdate: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: mockRequireAdmin,
  auditLog: mockAuditLog,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findMany: mockOrganizationFindMany,
      count: mockOrganizationCount,
      findUnique: mockOrganizationFindUnique,
      update: mockOrganizationUpdate,
    },
  },
}));

import { GET, PATCH } from "@/app/api/admin/organizations/route";

function getRequest(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/organizations", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/organizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-user", role: "admin" } });
    mockAuditLog.mockResolvedValue(undefined);
  });

  it("rejects non-admin sessions", async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const res = await GET(getRequest("/api/admin/organizations"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockOrganizationFindMany).not.toHaveBeenCalled();
  });

  it("lists organizations with filters, owner details, and marketplace counts", async () => {
    const createdAt = new Date("2026-05-16T00:00:00.000Z");
    mockOrganizationFindMany.mockResolvedValue([
      {
        id: "org_1",
        name: "Campus Partners",
        type: "partner",
        status: "active",
        plan: "partner",
        owner: { id: "user_1", email: "owner@example.com", name: "Owner" },
        _count: { submissions: 2, listings: 1, dealProgramApplications: 1 },
        createdAt,
      },
    ]);
    mockOrganizationCount.mockResolvedValue(1);

    const res = await GET(
      getRequest(
        "/api/admin/organizations?status=active&type=partner&plan=partner&search=campus&page=2&limit=10",
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockOrganizationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "active",
          type: "partner",
          plan: "partner",
          OR: [
            { name: { contains: "campus", mode: "insensitive" } },
            { website: { contains: "campus", mode: "insensitive" } },
            { owner: { email: { contains: "campus", mode: "insensitive" } } },
            { owner: { name: { contains: "campus", mode: "insensitive" } } },
          ],
        }),
        select: expect.objectContaining({
          owner: { select: { id: true, name: true, email: true } },
          _count: {
            select: {
              submissions: true,
              listings: true,
              dealProgramApplications: true,
            },
          },
        }),
        skip: 10,
        take: 10,
      }),
    );
    expect(body).toMatchObject({
      total: 1,
      page: 2,
      totalPages: 1,
      organizations: [{ id: "org_1", plan: "partner" }],
    });
  });

  it("rejects invalid filters before querying", async () => {
    const invalidStatus = await GET(getRequest("/api/admin/organizations?status=deleted"));
    const invalidType = await GET(getRequest("/api/admin/organizations?type=agency"));
    const invalidPlan = await GET(getRequest("/api/admin/organizations?plan=starter"));

    expect(invalidStatus.status).toBe(400);
    expect(await invalidStatus.json()).toEqual({ error: "Invalid status filter" });
    expect(invalidType.status).toBe(400);
    expect(await invalidType.json()).toEqual({ error: "Invalid type filter" });
    expect(invalidPlan.status).toBe(400);
    expect(await invalidPlan.json()).toEqual({ error: "Invalid plan filter" });
    expect(mockOrganizationFindMany).not.toHaveBeenCalled();
    expect(mockOrganizationCount).not.toHaveBeenCalled();
  });

  it("rejects invalid patch actions and update fields before lookup", async () => {
    const invalidAction = await PATCH(patchRequest({ id: "org_1", action: "delete" }));
    const invalidUpdates = await PATCH(
      patchRequest({ id: "org_1", action: "update", updates: { canPostDeals: "yes" } }),
    );
    const invalidLimit = await PATCH(
      patchRequest({ id: "org_1", action: "update", updates: { dealPostLimit: -1 } }),
    );

    expect(invalidAction.status).toBe(400);
    expect(await invalidAction.json()).toEqual({ error: "Invalid action" });
    expect(invalidUpdates.status).toBe(400);
    expect(await invalidUpdates.json()).toEqual({ error: "Invalid canPostDeals" });
    expect(invalidLimit.status).toBe(400);
    expect(await invalidLimit.json()).toEqual({ error: "Invalid dealPostLimit" });
    expect(mockOrganizationFindUnique).not.toHaveBeenCalled();
    expect(mockOrganizationUpdate).not.toHaveBeenCalled();
  });

  it("updates governance fields and writes an audit log", async () => {
    mockOrganizationFindUnique.mockResolvedValue({
      id: "org_1",
      name: "Campus Partners",
      status: "pending",
      plan: "free",
      canPostDeals: false,
      verifiedAt: null,
    });
    mockOrganizationUpdate.mockResolvedValue({
      id: "org_1",
      name: "Campus Partners",
      status: "active",
      plan: "partner",
      canPostDeals: true,
      verifiedAt: expect.any(Date),
    });

    const res = await PATCH(
      patchRequest({
        id: "org_1",
        action: "update",
        updates: {
          status: "active",
          plan: "partner",
          canPostDeals: true,
          canSponsor: true,
          jobPostLimit: 10,
          eventPostLimit: 8,
          dealPostLimit: 6,
          sponsoredLimit: 2,
          verify: true,
        },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, organization: { id: "org_1" } });
    expect(mockOrganizationUpdate).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: expect.objectContaining({
        status: "active",
        plan: "partner",
        canPostDeals: true,
        canSponsor: true,
        jobPostLimit: 10,
        eventPostLimit: 8,
        dealPostLimit: 6,
        sponsoredLimit: 2,
        verifiedAt: expect.any(Date),
      }),
      select: expect.any(Object),
    });
    expect(mockAuditLog).toHaveBeenCalledWith("admin", "organization.update", "org_1", {
      organizationName: "Campus Partners",
      previousStatus: "pending",
      previousPlan: "free",
      changes: expect.objectContaining({
        status: "active",
        plan: "partner",
        canPostDeals: true,
      }),
    });
  });

  it("toggles verification with explicit verify actions", async () => {
    mockOrganizationFindUnique.mockResolvedValue({
      id: "org_1",
      name: "Campus Partners",
      status: "active",
      plan: "partner",
      verifiedAt: null,
    });
    mockOrganizationUpdate.mockResolvedValue({ id: "org_1", verifiedAt: new Date() });

    const res = await PATCH(patchRequest({ id: "org_1", action: "verify" }));

    expect(res.status).toBe(200);
    expect(mockOrganizationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { verifiedAt: expect.any(Date) },
      }),
    );
    expect(mockAuditLog).toHaveBeenCalledWith(
      "admin",
      "organization.verify",
      "org_1",
      expect.objectContaining({ organizationName: "Campus Partners" }),
    );
  });

  it("returns 404 for missing organizations", async () => {
    mockOrganizationFindUnique.mockResolvedValue(null);

    const res = await PATCH(
      patchRequest({ id: "missing", action: "update", updates: { status: "active" } }),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Organization not found" });
    expect(mockOrganizationUpdate).not.toHaveBeenCalled();
    expect(mockAuditLog).not.toHaveBeenCalled();
  });
});
