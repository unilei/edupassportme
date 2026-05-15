import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockRequireAdmin,
  mockAuditLog,
  mockAppUserFindMany,
  mockAppUserCount,
  mockAppUserFindUnique,
  mockAppUserUpdate,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockAuditLog: vi.fn(),
  mockAppUserFindMany: vi.fn(),
  mockAppUserCount: vi.fn(),
  mockAppUserFindUnique: vi.fn(),
  mockAppUserUpdate: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: mockRequireAdmin,
  auditLog: mockAuditLog,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: {
      findMany: mockAppUserFindMany,
      count: mockAppUserCount,
      findUnique: mockAppUserFindUnique,
      update: mockAppUserUpdate,
    },
  },
}));

import { GET, PATCH } from "@/app/api/admin/users/route";

function getRequest(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin", role: "admin" } });
    mockAuditLog.mockResolvedValue(undefined);
  });

  it("rejects non-admin sessions", async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const res = await GET(getRequest("/api/admin/users"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockAppUserFindMany).not.toHaveBeenCalled();
  });

  it("returns users with validated role and banned filters", async () => {
    const createdAt = new Date("2026-05-01T00:00:00.000Z");
    mockAppUserFindMany.mockResolvedValue([
      {
        id: "user-1",
        email: "pro@example.com",
        name: "Pro User",
        role: "pro",
        tier: "free",
        banned: false,
        bannedAt: null,
        bannedReason: null,
        emailVerified: true,
        createdAt,
        _count: { reviews: 1, applications: 0, savedListings: 2 },
      },
    ]);
    mockAppUserCount.mockResolvedValue(1);

    const res = await GET(
      getRequest("/api/admin/users?page=2&limit=10&search=pro&role=pro&banned=false"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockAppUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { email: { contains: "pro", mode: "insensitive" } },
            { name: { contains: "pro", mode: "insensitive" } },
          ],
          role: "pro",
          banned: false,
        },
        skip: 10,
        take: 10,
      }),
    );
    expect(body).toMatchObject({
      total: 1,
      page: 2,
      totalPages: 1,
      users: [{ id: "user-1", role: "pro", tier: "free" }],
    });
  });

  it("rejects invalid list filters", async () => {
    const roleRes = await GET(getRequest("/api/admin/users?role=owner"));
    const bannedRes = await GET(getRequest("/api/admin/users?banned=yes"));

    expect(roleRes.status).toBe(400);
    expect(await roleRes.json()).toEqual({ error: "Invalid role filter" });
    expect(bannedRes.status).toBe(400);
    expect(await bannedRes.json()).toEqual({ error: "Invalid banned filter" });
    expect(mockAppUserFindMany).not.toHaveBeenCalled();
    expect(mockAppUserCount).not.toHaveBeenCalled();
  });

  it("rejects invalid patch actions and inputs before mutating", async () => {
    const invalidAction = await PATCH(patchRequest({ id: "user-1", action: "delete" }));
    const invalidRole = await PATCH(
      patchRequest({ id: "user-1", action: "role", role: "owner" }),
    );
    const invalidReason = await PATCH(
      patchRequest({ id: "user-1", action: "ban", reason: { text: "spam" } }),
    );

    expect(invalidAction.status).toBe(400);
    expect(await invalidAction.json()).toEqual({ error: "Invalid action" });
    expect(invalidRole.status).toBe(400);
    expect(await invalidRole.json()).toEqual({ error: "Invalid role" });
    expect(invalidReason.status).toBe(400);
    expect(await invalidReason.json()).toEqual({ error: "Invalid ban reason" });
    expect(mockAppUserFindUnique).not.toHaveBeenCalled();
    expect(mockAppUserUpdate).not.toHaveBeenCalled();
  });

  it("rejects invalid manual Pro expiration before mutating", async () => {
    const missingExpiry = await PATCH(patchRequest({ id: "user-1", action: "grant_pro" }));
    const invalidExpiry = await PATCH(
      patchRequest({ id: "user-1", action: "grant_pro", proExpiresAt: "not-a-date" }),
    );
    const pastExpiry = await PATCH(
      patchRequest({ id: "user-1", action: "grant_pro", proExpiresAt: "2020-01-01T00:00:00.000Z" }),
    );

    expect(missingExpiry.status).toBe(400);
    expect(await missingExpiry.json()).toEqual({ error: "Valid future Pro expiration is required" });
    expect(invalidExpiry.status).toBe(400);
    expect(await invalidExpiry.json()).toEqual({ error: "Valid future Pro expiration is required" });
    expect(pastExpiry.status).toBe(400);
    expect(await pastExpiry.json()).toEqual({ error: "Valid future Pro expiration is required" });
    expect(mockAppUserFindUnique).not.toHaveBeenCalled();
    expect(mockAppUserUpdate).not.toHaveBeenCalled();
  });

  it("bans and unbans users with audited validated inputs", async () => {
    mockAppUserFindUnique.mockResolvedValue({
      email: "user@example.com",
      role: "user",
      tier: "free",
      proExpiresAt: null,
    });
    mockAppUserUpdate.mockResolvedValue({ id: "user-1" });

    const banRes = await PATCH(
      patchRequest({ id: "user-1", action: "ban", reason: "  Spam abuse  " }),
    );
    const unbanRes = await PATCH(patchRequest({ id: "user-1", action: "unban" }));

    expect(banRes.status).toBe(200);
    expect(unbanRes.status).toBe(200);
    expect(mockAppUserUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "user-1" },
      data: {
        banned: true,
        bannedAt: expect.any(Date),
        bannedReason: "Spam abuse",
      },
    });
    expect(mockAppUserUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "user-1" },
      data: { banned: false, bannedAt: null, bannedReason: null },
    });
    expect(mockAuditLog).toHaveBeenCalledWith("admin", "user.ban", "user-1", {
      email: "user@example.com",
      reason: "Spam abuse",
    });
    expect(mockAuditLog).toHaveBeenCalledWith("admin", "user.unban", "user-1", {
      email: "user@example.com",
    });
  });

  it("changes role without changing paid tier fields", async () => {
    const proExpiresAt = new Date("2026-06-01T00:00:00.000Z");
    mockAppUserFindUnique.mockResolvedValue({
      email: "user@example.com",
      role: "user",
      tier: "free",
      proExpiresAt,
    });
    mockAppUserUpdate.mockResolvedValue({ id: "user-1", role: "pro" });

    const res = await PATCH(patchRequest({ id: "user-1", action: "role", role: "pro" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockAppUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: "pro" },
    });
    expect(mockAppUserUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tier: "pro" }),
      }),
    );
    expect(mockAuditLog).toHaveBeenCalledWith("admin", "user.role", "user-1", {
      email: "user@example.com",
      previousRole: "user",
      role: "pro",
      tier: "free",
      proExpiresAt: "2026-06-01T00:00:00.000Z",
    });
  });

  it("grants manual Pro access with a future expiration", async () => {
    const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
    mockAppUserFindUnique.mockResolvedValue({
      email: "user@example.com",
      role: "user",
      tier: "free",
      proExpiresAt: null,
    });
    mockAppUserUpdate.mockResolvedValue({ id: "user-1", tier: "pro", role: "pro" });

    const res = await PATCH(
      patchRequest({ id: "user-1", action: "grant_pro", proExpiresAt: expiresAt }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockAppUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { tier: "pro", role: "pro", proExpiresAt: new Date(expiresAt) },
    });
    expect(mockAuditLog).toHaveBeenCalledWith("admin", "user.pro.grant", "user-1", {
      email: "user@example.com",
      previousTier: "free",
      previousRole: "user",
      proExpiresAt: expiresAt,
    });
  });

  it("revokes manual Pro access without downgrading admin role", async () => {
    const previousExpiry = new Date("2026-06-01T00:00:00.000Z");
    mockAppUserFindUnique.mockResolvedValue({
      email: "admin-user@example.com",
      role: "admin",
      tier: "pro",
      proExpiresAt: previousExpiry,
    });
    mockAppUserUpdate.mockResolvedValue({ id: "user-1", tier: "free", role: "admin" });

    const res = await PATCH(patchRequest({ id: "user-1", action: "revoke_pro" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockAppUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { tier: "free", role: "admin", proExpiresAt: null },
    });
    expect(mockAuditLog).toHaveBeenCalledWith("admin", "user.pro.revoke", "user-1", {
      email: "admin-user@example.com",
      previousTier: "pro",
      previousRole: "admin",
      previousProExpiresAt: "2026-06-01T00:00:00.000Z",
    });
  });
});
