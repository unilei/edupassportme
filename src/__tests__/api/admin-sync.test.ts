import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireAdmin, mockProviderFindMany, mockSyncLogFindMany } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockProviderFindMany: vi.fn(),
  mockSyncLogFindMany: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    provider: {
      findMany: mockProviderFindMany,
    },
    syncLog: {
      findMany: mockSyncLogFindMany,
    },
  },
}));

import { GET } from "@/app/api/admin/sync/route";

describe("GET /api/admin/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ user: { id: "admin", role: "admin" } });
  });

  it("requires an admin session for provider observability", async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mockProviderFindMany).not.toHaveBeenCalled();
  });

  it("returns provider health and recent sync log observability fields", async () => {
    mockProviderFindMany.mockResolvedValue([
      {
        id: "provider-1",
        name: "Coursera",
        slug: "coursera",
        isActive: true,
        apiType: "api",
        apiBaseUrl: "https://api.coursera.org/api",
        authType: "oauth",
        rateLimitPerMinute: 60,
        syncFrequency: "daily",
        lastSyncAt: new Date("2026-01-01T00:00:00.000Z"),
        lastSuccessfulSyncAt: new Date("2026-01-01T00:00:00.000Z"),
        lastFailedSyncAt: null,
        failureCount: 0,
        complianceNotes: "Public catalog only",
        _count: { listings: 10, syncLogs: 2 },
      },
      {
        id: "provider-2",
        name: "Udemy",
        slug: "udemy-provider",
        isActive: true,
        apiType: "rest",
        apiBaseUrl: "https://www.udemy.com/api-2.0",
        authType: "api_key",
        rateLimitPerMinute: 60,
        syncFrequency: "daily",
        lastSyncAt: null,
        lastSuccessfulSyncAt: null,
        lastFailedSyncAt: null,
        failureCount: 0,
        complianceNotes: null,
        _count: { listings: 0, syncLogs: 0 },
      },
    ]);
    mockSyncLogFindMany.mockResolvedValue([
      {
        id: "sync-log-1",
        providerId: "provider-1",
        status: "success",
        itemsFound: 5,
        itemsAdded: 1,
        itemsUpdated: 2,
        itemsSkipped: 1,
        itemsExpired: 3,
        durationMs: 2500,
        details: { batch: "daily" },
        error: null,
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        completedAt: new Date("2026-01-01T00:00:02.500Z"),
        provider: { name: "Coursera", slug: "coursera" },
      },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.providers[0]).toMatchObject({
      slug: "coursera",
      authType: "oauth",
      rateLimitPerMinute: 60,
      failureCount: 0,
      complianceNotes: "Public catalog only",
      runtimeStatus: {
        implemented: true,
        configured: true,
        canSync: true,
      },
      health: "healthy",
      latestLog: {
        status: "success",
        itemsFound: 5,
        itemsAdded: 1,
        itemsUpdated: 2,
      },
    });
    expect(body.providers[1]).toMatchObject({
      slug: "udemy-provider",
      runtimeStatus: {
        implemented: true,
        configured: false,
        canSync: false,
      },
      health: "needs_configuration",
    });
    expect(body.summary).toMatchObject({
      totalProviders: 2,
      activeProviders: 2,
      syncableProviders: 1,
      healthyProviders: 1,
      actionRequiredProviders: 1,
      totalListings: 10,
    });
    expect(body.recentLogs[0]).toMatchObject({
      id: "sync-log-1",
      itemsSkipped: 1,
      itemsExpired: 3,
      durationMs: 2500,
      details: { batch: "daily" },
    });
    expect(mockProviderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          apiBaseUrl: true,
          authType: true,
          rateLimitPerMinute: true,
          lastSuccessfulSyncAt: true,
          lastFailedSyncAt: true,
          failureCount: true,
          complianceNotes: true,
        }),
      }),
    );
  });
});
