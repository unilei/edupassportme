import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockProviderFindMany, mockSyncLogFindMany } = vi.hoisted(() => ({
  mockProviderFindMany: vi.fn(),
  mockSyncLogFindMany: vi.fn(),
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
  });

  it("returns provider health and recent sync log observability fields", async () => {
    mockProviderFindMany.mockResolvedValue([
      {
        id: "provider-1",
        name: "Coursera",
        slug: "coursera",
        isActive: true,
        apiType: "api",
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
