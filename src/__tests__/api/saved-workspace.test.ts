import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  savedListingFindMany: vi.fn(),
  savedListingFindUnique: vi.fn(),
  savedListingFindFirst: vi.fn(),
  savedListingCreate: vi.fn(),
  savedListingDelete: vi.fn(),
  savedListingUpdateMany: vi.fn(),
  savedListingCount: vi.fn(),
  listingFindFirst: vi.fn(),
  isProUser: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/pro", () => ({
  isProUser: mocks.isProUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedListing: {
      findMany: mocks.savedListingFindMany,
      findUnique: mocks.savedListingFindUnique,
      findFirst: mocks.savedListingFindFirst,
      create: mocks.savedListingCreate,
      delete: mocks.savedListingDelete,
      updateMany: mocks.savedListingUpdateMany,
      count: mocks.savedListingCount,
    },
    listing: {
      findFirst: mocks.listingFindFirst,
    },
  },
}));

import * as savedRoute from "@/app/api/user/saved/route";

const routeWithPatch = savedRoute as Record<string, (request: NextRequest) => Promise<Response>>;

describe("/api/user/saved workspace tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    mocks.isProUser.mockResolvedValue(false);
    mocks.savedListingFindUnique.mockResolvedValue(null);
    mocks.savedListingCount.mockResolvedValue(0);
    mocks.listingFindFirst.mockResolvedValue({ id: "listing_1" });
  });

  it("updates opportunity tracking fields only for the current user's saved item", async () => {
    expect(typeof routeWithPatch.PATCH).toBe("function");

    const deadlineAt = "2026-06-01T12:00:00.000Z";
    const nextActionAt = "2026-05-20T09:30:00.000Z";
    mocks.savedListingUpdateMany.mockResolvedValue({ count: 1 });
    mocks.savedListingFindFirst.mockResolvedValue({
      id: "saved_1",
      userId: "user_1",
      listingId: "listing_1",
      status: "applying",
      priority: "high",
      deadlineAt: new Date(deadlineAt),
      nextActionAt: new Date(nextActionAt),
      note: "Prepare transcript",
    });

    const res = await routeWithPatch.PATCH(new NextRequest("http://localhost:3000/api/user/saved", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        savedId: "saved_1",
        status: "applying",
        priority: "high",
        deadlineAt,
        nextActionAt,
        note: "Prepare transcript",
      }),
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.saved.status).toBe("applying");
    expect(mocks.savedListingUpdateMany).toHaveBeenCalledWith({
      where: { id: "saved_1", userId: "user_1" },
      data: expect.objectContaining({
        status: "applying",
        priority: "high",
        deadlineAt: new Date(deadlineAt),
        nextActionAt: new Date(nextActionAt),
        note: "Prepare transcript",
      }),
    });
  });

  it("limits free users to 20 tracked opportunities while allowing Pro users to save more", async () => {
    mocks.savedListingCount.mockResolvedValue(20);

    const freeRes = await savedRoute.POST(new NextRequest("http://localhost:3000/api/user/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "listing_1" }),
    }));
    const freeBody = await freeRes.json();

    expect(freeRes.status).toBe(403);
    expect(freeBody.code).toBe("SAVE_LIMIT_REACHED");

    mocks.isProUser.mockResolvedValue(true);
    mocks.savedListingCreate.mockResolvedValue({ id: "saved_2" });

    const proRes = await savedRoute.POST(new NextRequest("http://localhost:3000/api/user/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "listing_1" }),
    }));

    expect(proRes.status).toBe(200);
    expect(mocks.savedListingCreate).toHaveBeenCalledWith({
      data: { userId: "user_1", listingId: "listing_1" },
    });
  });

  it("rejects organization accounts from personal saved workspace APIs", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "org_1", accountType: "organization" } });

    const res = await savedRoute.POST(new NextRequest("http://localhost:3000/api/user/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: "listing_1" }),
    }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ error: "Individual account required" });
    expect(mocks.savedListingFindUnique).not.toHaveBeenCalled();
  });
});
