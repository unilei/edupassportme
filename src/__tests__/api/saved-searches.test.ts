import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  requireIndividualUser: vi.fn(),
  savedSearchFindMany: vi.fn(),
  savedSearchCreate: vi.fn(),
  savedSearchFindUnique: vi.fn(),
  savedSearchDelete: vi.fn(),
}));

vi.mock("@/lib/api-utils", () => ({
  requireIndividualUser: mocks.requireIndividualUser,
  isAuthError: vi.fn((r: unknown) => !(r && typeof r === "object" && "userId" in r)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedSearch: {
      findMany: mocks.savedSearchFindMany,
      create: mocks.savedSearchCreate,
      findUnique: mocks.savedSearchFindUnique,
      delete: mocks.savedSearchDelete,
    },
  },
}));

import { GET, POST, DELETE } from "@/app/api/user/searches/route";

describe("/api/user/searches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireIndividualUser.mockResolvedValue({ userId: "user_1", isAdmin: false });
    mocks.savedSearchFindMany.mockResolvedValue([]);
    mocks.savedSearchCreate.mockResolvedValue({ id: "search_1", name: "Teaching jobs" });
  });

  it("lists saved searches for individual accounts", async () => {
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.searches).toEqual([]);
    expect(mocks.savedSearchFindMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("rejects organization accounts from personal saved searches", async () => {
    mocks.requireIndividualUser.mockResolvedValue(
      NextResponse.json({ error: "Individual account required" }, { status: 403 }),
    );

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ error: "Individual account required" });
    expect(mocks.savedSearchFindMany).not.toHaveBeenCalled();
  });

  it("creates a saved search for the current individual user", async () => {
    const res = await POST(new NextRequest("http://localhost:3000/api/user/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Teaching jobs", query: "teacher", filters: { type: "job" } }),
    }));

    expect(res.status).toBe(201);
    expect(mocks.savedSearchCreate).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        name: "Teaching jobs",
        query: "teacher",
        filters: { type: "job" },
      },
    });
  });

  it("deletes only the current individual user's saved search", async () => {
    mocks.savedSearchFindUnique.mockResolvedValue({ id: "search_1", userId: "user_1" });
    mocks.savedSearchDelete.mockResolvedValue({ id: "search_1" });

    const res = await DELETE(new NextRequest("http://localhost:3000/api/user/searches?id=search_1"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mocks.savedSearchDelete).toHaveBeenCalledWith({ where: { id: "search_1" } });
  });
});
