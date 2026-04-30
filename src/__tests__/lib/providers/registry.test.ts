import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncResult } from "@/lib/providers/types";

const { mockProviderFindMany, mockProviderFindUnique, mockSyncProvider } = vi.hoisted(() => ({
  mockProviderFindMany: vi.fn(),
  mockProviderFindUnique: vi.fn(),
  mockSyncProvider: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    provider: {
      findMany: (...args: unknown[]) => mockProviderFindMany(...args),
      findUnique: (...args: unknown[]) => mockProviderFindUnique(...args),
    },
  },
}));

vi.mock("@/lib/providers/sync", () => ({
  syncProvider: (...args: unknown[]) => mockSyncProvider(...args),
}));

import { syncAllProviders, syncSingleProvider } from "@/lib/providers/registry";

const remotiveProvider = {
  id: "provider-1",
  name: "Remotive",
  slug: "remotive",
  apiBaseUrl: null,
  apiType: "rest",
  isActive: true,
};

function makeResult(overrides: Partial<SyncResult>): SyncResult {
  return {
    itemsFound: 0,
    itemsAdded: 0,
    itemsUpdated: 0,
    itemsSkipped: 0,
    itemsExpired: 0,
    errors: [],
    ...overrides,
  };
}

describe("provider registry sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.USAJOBS_API_KEY;
    delete process.env.USAJOBS_USER_AGENT;
  });

  it("sets a top-level error for fatal provider sync results", async () => {
    const fatalResult = makeResult({
      itemsFound: 0,
      errors: ["Provider request failed", "HTTP 500"],
    });
    mockProviderFindUnique.mockResolvedValue(remotiveProvider);
    mockSyncProvider.mockResolvedValue(fatalResult);

    const result = await syncSingleProvider("remotive");

    expect(result).toMatchObject({
      providerId: "provider-1",
      providerSlug: "remotive",
      result: fatalResult,
      skipped: false,
      error: "Provider request failed; HTTP 500",
    });
  });

  it("does not set a top-level error for partial item-level sync errors", async () => {
    const partialResult = makeResult({
      itemsFound: 1,
      itemsAdded: 1,
      errors: ["Skipped invalid listing"],
    });
    mockProviderFindUnique.mockResolvedValue(remotiveProvider);
    mockSyncProvider.mockResolvedValue(partialResult);

    const result = await syncSingleProvider("remotive");

    expect(result).toMatchObject({
      result: partialResult,
      skipped: false,
    });
    expect(result.error).toBeUndefined();
  });

  it("keeps unconfigured providers skipped with their missing config reason", async () => {
    mockProviderFindMany.mockResolvedValue([
      {
        id: "provider-2",
        name: "USAJOBS",
        slug: "usajobs",
        apiBaseUrl: null,
        apiType: "rest",
        isActive: true,
      },
    ]);

    const [result] = await syncAllProviders();

    expect(result).toMatchObject({
      providerId: "provider-2",
      providerSlug: "usajobs",
      result: null,
      skipped: true,
      error: "USAJOBS_API_KEY and USAJOBS_USER_AGENT are required",
    });
    expect(mockSyncProvider).not.toHaveBeenCalled();
  });
});
