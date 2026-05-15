import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockRequireAdmin,
  mockAuditLog,
  mockDealProgramFindMany,
  mockDealProgramCount,
  mockDealProgramFindUnique,
  mockDealProgramUpdate,
  mockOrganizationUpdate,
  mockTransaction,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockAuditLog: vi.fn(),
  mockDealProgramFindMany: vi.fn(),
  mockDealProgramCount: vi.fn(),
  mockDealProgramFindUnique: vi.fn(),
  mockDealProgramUpdate: vi.fn(),
  mockOrganizationUpdate: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: mockRequireAdmin,
  auditLog: mockAuditLog,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dealProgramApplication: {
      findMany: mockDealProgramFindMany,
      count: mockDealProgramCount,
      findUnique: mockDealProgramFindUnique,
      update: mockDealProgramUpdate,
    },
    organization: {
      update: mockOrganizationUpdate,
    },
    $transaction: mockTransaction,
  },
}));

import { GET, PATCH } from "@/app/api/admin/deal-program/route";

function getRequest(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/deal-program", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/deal-program", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin-user", role: "admin" } });
    mockAuditLog.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (callback) =>
      callback({
        dealProgramApplication: {
          update: mockDealProgramUpdate,
        },
        organization: {
          update: mockOrganizationUpdate,
        },
      }),
    );
  });

  it("rejects non-admin sessions", async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const res = await GET(getRequest("/api/admin/deal-program"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockDealProgramFindMany).not.toHaveBeenCalled();
  });

  it("lists applications with status and search filters", async () => {
    mockDealProgramFindMany.mockResolvedValue([
      {
        id: "deal_app_1",
        contactName: "Pat Partner",
        status: "pending",
        organization: { id: "org_1", name: "Campus Deals" },
      },
    ]);
    mockDealProgramCount.mockResolvedValue(1);

    const res = await GET(
      getRequest("/api/admin/deal-program?status=pending&search=campus&page=2&limit=10"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockDealProgramFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "pending",
          OR: [
            { contactName: { contains: "campus", mode: "insensitive" } },
            { contactEmail: { contains: "campus", mode: "insensitive" } },
            { proposedOffer: { contains: "campus", mode: "insensitive" } },
            { organization: { name: { contains: "campus", mode: "insensitive" } } },
            { organization: { owner: { email: { contains: "campus", mode: "insensitive" } } } },
          ],
        }),
        select: expect.objectContaining({
          organization: expect.objectContaining({
            select: expect.objectContaining({
              owner: { select: { id: true, name: true, email: true } },
              canPostDeals: true,
            }),
          }),
          submittedBy: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { id: true, name: true, email: true } },
        }),
        skip: 10,
        take: 10,
      }),
    );
    expect(body).toMatchObject({
      total: 1,
      page: 2,
      totalPages: 1,
      applications: [{ id: "deal_app_1", status: "pending" }],
    });
  });

  it("rejects invalid status filters and patch actions", async () => {
    const invalidStatus = await GET(getRequest("/api/admin/deal-program?status=deleted"));
    const invalidAction = await PATCH(patchRequest({ id: "deal_app_1", action: "delete" }));

    expect(invalidStatus.status).toBe(400);
    expect(await invalidStatus.json()).toEqual({ error: "Invalid status filter" });
    expect(invalidAction.status).toBe(400);
    expect(await invalidAction.json()).toEqual({ error: "Invalid action" });
    expect(mockDealProgramFindMany).not.toHaveBeenCalled();
    expect(mockDealProgramFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing application", async () => {
    mockDealProgramFindUnique.mockResolvedValue(null);

    const res = await PATCH(patchRequest({ id: "missing", action: "approve" }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Deal Program application not found" });
    expect(mockDealProgramUpdate).not.toHaveBeenCalled();
    expect(mockOrganizationUpdate).not.toHaveBeenCalled();
  });

  it("approves an application and grants organization deal posting permission", async () => {
    mockDealProgramFindUnique.mockResolvedValue({
      id: "deal_app_1",
      status: "pending",
      organizationId: "org_1",
      contactEmail: "partner@example.com",
      organization: {
        id: "org_1",
        name: "Campus Deals",
        status: "pending",
        plan: "free",
        canPostDeals: false,
      },
    });
    mockDealProgramUpdate.mockResolvedValue({ id: "deal_app_1", status: "approved" });
    mockOrganizationUpdate.mockResolvedValue({ id: "org_1", canPostDeals: true });

    const res = await PATCH(
      patchRequest({ id: "deal_app_1", action: "approve", reviewNote: "Approved for launch" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, application: { id: "deal_app_1", status: "approved" } });
    expect(mockTransaction).toHaveBeenCalled();
    expect(mockDealProgramUpdate).toHaveBeenCalledWith({
      where: { id: "deal_app_1" },
      data: expect.objectContaining({
        status: "approved",
        reviewNote: "Approved for launch",
        reviewedAt: expect.any(Date),
        reviewedById: "admin-user",
      }),
      select: expect.any(Object),
    });
    expect(mockOrganizationUpdate).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: expect.objectContaining({
        plan: "partner",
        canPostDeals: true,
        dealPostLimit: 100,
      }),
    });
    expect(mockAuditLog).toHaveBeenCalledWith("admin", "dealProgram.approve", "deal_app_1", {
      organizationId: "org_1",
      organizationName: "Campus Deals",
      previousStatus: "pending",
      status: "approved",
      reviewNote: "Approved for launch",
      grantedDealPermission: true,
    });
  });

  it("activates an application and activates the organization", async () => {
    mockDealProgramFindUnique.mockResolvedValue({
      id: "deal_app_1",
      status: "approved",
      organizationId: "org_1",
      organization: { id: "org_1", name: "Campus Deals" },
    });
    mockDealProgramUpdate.mockResolvedValue({ id: "deal_app_1", status: "active" });
    mockOrganizationUpdate.mockResolvedValue({ id: "org_1", status: "active", canPostDeals: true });

    const res = await PATCH(patchRequest({ id: "deal_app_1", action: "activate" }));

    expect(res.status).toBe(200);
    expect(mockOrganizationUpdate).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: expect.objectContaining({
        plan: "partner",
        canPostDeals: true,
        dealPostLimit: 100,
        status: "active",
      }),
    });
    expect(mockAuditLog).toHaveBeenCalledWith(
      "admin",
      "dealProgram.activate",
      "deal_app_1",
      expect.objectContaining({
        status: "active",
        grantedDealPermission: true,
      }),
    );
  });

  it("invites an application with token and reviewer metadata", async () => {
    mockDealProgramFindUnique.mockResolvedValue({
      id: "deal_app_1",
      status: "pending",
      organizationId: "org_1",
      organization: { id: "org_1", name: "Campus Deals" },
    });
    mockDealProgramUpdate.mockResolvedValue({ id: "deal_app_1", status: "invited" });

    const res = await PATCH(patchRequest({ id: "deal_app_1", action: "invite" }));

    expect(res.status).toBe(200);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockDealProgramUpdate).toHaveBeenCalledWith({
      where: { id: "deal_app_1" },
      data: expect.objectContaining({
        status: "invited",
        reviewedAt: expect.any(Date),
        reviewedById: "admin-user",
        invitationToken: expect.any(String),
        invitedAt: expect.any(Date),
      }),
      select: expect.any(Object),
    });
    expect(mockOrganizationUpdate).not.toHaveBeenCalled();
  });

  it("stores a null reviewer id for the built-in admin session", async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin", role: "admin" } });
    mockDealProgramFindUnique.mockResolvedValue({
      id: "deal_app_1",
      status: "pending",
      organizationId: "org_1",
      organization: { id: "org_1", name: "Campus Deals" },
    });
    mockDealProgramUpdate.mockResolvedValue({ id: "deal_app_1", status: "rejected" });

    const res = await PATCH(patchRequest({ id: "deal_app_1", action: "reject" }));

    expect(res.status).toBe(200);
    expect(mockDealProgramUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "rejected",
          reviewedById: null,
        }),
      }),
    );
  });
});
