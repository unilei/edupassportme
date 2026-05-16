import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  organizationFindFirst: vi.fn(),
  organizationCreate: vi.fn(),
  dealProgramApplicationFindMany: vi.fn(),
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
    organization: {
      findFirst: mocks.organizationFindFirst,
      create: mocks.organizationCreate,
    },
    dealProgramApplication: {
      findMany: mocks.dealProgramApplicationFindMany,
      findFirst: mocks.dealProgramApplicationFindFirst,
      create: mocks.dealProgramApplicationCreate,
    },
  },
}));

import { GET, POST } from "@/app/api/marketplace/deal-program/route";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/marketplace/deal-program", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  organizationName: " Example Partner ",
  organizationWebsite: " https://partner.example/deals ",
  contactName: "  Maya Chen  ",
  contactEmail: " MAYA@PARTNER.EXAMPLE ",
  proposedOffer: "  20% off verified student plans.  ",
  targetAudience: "  College students in the US and Canada. ",
};

describe("/api/marketplace/deal-program", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1", accountType: "partner" } });
    mocks.organizationFindFirst.mockResolvedValue(null);
    mocks.organizationCreate.mockResolvedValue({
      id: "org_1",
      name: "Example Partner",
      website: "https://partner.example/deals",
      type: "partner",
      status: "pending",
    });
    mocks.dealProgramApplicationFindMany.mockResolvedValue([]);
    mocks.dealProgramApplicationFindFirst.mockResolvedValue(null);
    mocks.dealProgramApplicationCreate.mockResolvedValue({
      id: "app_1",
      status: "pending",
      contactName: "Maya Chen",
      contactEmail: "maya@partner.example",
      proposedOffer: "20% off verified student plans.",
      targetAudience: "College students in the US and Canada.",
      organization: {
        id: "org_1",
        name: "Example Partner",
        website: "https://partner.example/deals",
      },
    });
  });

  it("rejects guests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const res = await POST(postRequest(validPayload));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.dealProgramApplicationCreate).not.toHaveBeenCalled();
  });

  it("rejects admin sessions", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "admin", role: "admin" } });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mocks.dealProgramApplicationFindMany).not.toHaveBeenCalled();
  });

  it("rejects individual accounts from partner deal applications", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "individual_1", accountType: "individual" } });

    const res = await POST(postRequest(validPayload));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Use a partner account to apply for the Deal Program.",
    });
    expect(mocks.dealProgramApplicationCreate).not.toHaveBeenCalled();
  });

  it("rejects organization accounts from partner deal applications", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "owner_1", accountType: "organization" } });

    const res = await POST(postRequest(validPayload));

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "Use a partner account to apply for the Deal Program.",
    });
    expect(mocks.dealProgramApplicationCreate).not.toHaveBeenCalled();
  });

  it("lists only the current user's deal program applications", async () => {
    const createdAt = new Date("2026-05-16T09:00:00.000Z");
    mocks.dealProgramApplicationFindMany.mockResolvedValue([
      {
        id: "app_1",
        status: "pending",
        contactName: "Maya Chen",
        contactEmail: "maya@partner.example",
        proposedOffer: "20% off verified student plans.",
        targetAudience: "College students in the US and Canada.",
        reviewNote: null,
        createdAt,
        updatedAt: createdAt,
        organization: {
          id: "org_1",
          name: "Example Partner",
          type: "partner",
          status: "pending",
          website: "https://partner.example/deals",
        },
      },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.applications).toHaveLength(1);
    expect(mocks.dealProgramApplicationFindMany).toHaveBeenCalledWith({
      where: { submittedById: "user_1" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        contactName: true,
        contactEmail: true,
        proposedOffer: true,
        targetAudience: true,
        reviewNote: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: { id: true, name: true, type: true, status: true, website: true },
        },
      },
    });
  });

  it("requires the core application fields", async () => {
    const res = await POST(
      postRequest({
        ...validPayload,
        proposedOffer: "   ",
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "Organization name, website, contact name, contact email, and proposed offer are required.",
    });
    expect(mocks.organizationCreate).not.toHaveBeenCalled();
    expect(mocks.dealProgramApplicationCreate).not.toHaveBeenCalled();
  });

  it("creates an owned organization and pending application with normalized fields", async () => {
    const res = await POST(postRequest(validPayload));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({
      application: {
        id: "app_1",
        status: "pending",
        contactName: "Maya Chen",
        contactEmail: "maya@partner.example",
        proposedOffer: "20% off verified student plans.",
        targetAudience: "College students in the US and Canada.",
        organization: {
          id: "org_1",
          name: "Example Partner",
          website: "https://partner.example/deals",
        },
      },
    });
    expect(mocks.organizationFindFirst).toHaveBeenCalledWith({
      where: {
        ownerId: "user_1",
        OR: [
          { name: "Example Partner" },
          { website: "https://partner.example/deals" },
        ],
      },
      select: { id: true },
    });
    expect(mocks.organizationCreate).toHaveBeenCalledWith({
      data: {
        name: "Example Partner",
        website: "https://partner.example/deals",
        type: "partner",
        ownerId: "user_1",
      },
      select: { id: true },
    });
    expect(mocks.dealProgramApplicationFindFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org_1",
        status: { in: ["pending", "approved", "invited", "active"] },
      },
      select: { id: true, status: true },
    });
    expect(mocks.dealProgramApplicationCreate).toHaveBeenCalledWith({
      data: {
        organizationId: "org_1",
        submittedById: "user_1",
        contactName: "Maya Chen",
        contactEmail: "maya@partner.example",
        proposedOffer: "20% off verified student plans.",
        targetAudience: "College students in the US and Canada.",
        status: "pending",
      },
      select: expect.objectContaining({
        id: true,
        status: true,
        organization: { select: { id: true, name: true, website: true } },
      }),
    });
  });

  it("reuses an owned organization before creating the application", async () => {
    mocks.organizationFindFirst.mockResolvedValue({ id: "org_existing" });

    const res = await POST(postRequest(validPayload));

    expect(res.status).toBe(201);
    expect(mocks.organizationCreate).not.toHaveBeenCalled();
    expect(mocks.dealProgramApplicationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org_existing" }),
      }),
    );
  });

  it("blocks duplicate active deal program applications for the same organization", async () => {
    mocks.organizationFindFirst.mockResolvedValue({ id: "org_existing" });
    mocks.dealProgramApplicationFindFirst.mockResolvedValue({
      id: "app_existing",
      status: "approved",
    });

    const res = await POST(postRequest(validPayload));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "This organization already has an active deal program application.",
    });
    expect(mocks.dealProgramApplicationCreate).not.toHaveBeenCalled();
  });
});
