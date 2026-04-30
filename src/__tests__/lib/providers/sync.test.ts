import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BaseProvider } from "@/lib/providers/base";
import type { RawListing } from "@/lib/providers/types";

const mockCreateLog = vi.fn();
const mockUpdateLog = vi.fn();
const mockFindListing = vi.fn();
const mockCreateListing = vi.fn();
const mockUpdateListing = vi.fn();
const mockUpdateManyListing = vi.fn();
const mockFindCategory = vi.fn();
const mockFindTag = vi.fn();
const mockDeleteTags = vi.fn();
const mockCreateTags = vi.fn();
const mockUpdateProvider = vi.fn();
const mockTransaction = vi.fn();

const mockPrismaClientLike = {
  listing: {
    findUnique: (...args: unknown[]) => mockFindListing(...args),
    create: (...args: unknown[]) => mockCreateListing(...args),
    update: (...args: unknown[]) => mockUpdateListing(...args),
    updateMany: (...args: unknown[]) => mockUpdateManyListing(...args),
  },
  category: {
    findUnique: (...args: unknown[]) => mockFindCategory(...args),
  },
  tag: {
    findUnique: (...args: unknown[]) => mockFindTag(...args),
  },
  listingTag: {
    deleteMany: (...args: unknown[]) => mockDeleteTags(...args),
    createMany: (...args: unknown[]) => mockCreateTags(...args),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    syncLog: {
      create: (...args: unknown[]) => mockCreateLog(...args),
      update: (...args: unknown[]) => mockUpdateLog(...args),
    },
    listing: {
      findUnique: (...args: unknown[]) => mockFindListing(...args),
      create: (...args: unknown[]) => mockCreateListing(...args),
      update: (...args: unknown[]) => mockUpdateListing(...args),
      updateMany: (...args: unknown[]) => mockUpdateManyListing(...args),
    },
    category: {
      findUnique: (...args: unknown[]) => mockFindCategory(...args),
    },
    tag: {
      findUnique: (...args: unknown[]) => mockFindTag(...args),
    },
    listingTag: {
      deleteMany: (...args: unknown[]) => mockDeleteTags(...args),
      createMany: (...args: unknown[]) => mockCreateTags(...args),
    },
    provider: {
      update: (...args: unknown[]) => mockUpdateProvider(...args),
    },
  },
}));

import { syncProvider } from "@/lib/providers/sync";

function makeProvider(items: RawListing[]): BaseProvider {
  return {
    slug: "test-provider",
    name: "Test Provider",
    isConfigured: () => true,
    getMissingConfigReason: () => null,
    fetchListings: vi.fn().mockResolvedValue(items),
  } as unknown as BaseProvider;
}

const raw: RawListing = {
  externalId: "external-1",
  title: "Intro to Python",
  type: "course",
  description: "A complete beginner course for Python programming.",
  url: "https://example.com/course?utm_source=test",
  categorySlug: "coding-tech",
  tagSlugs: ["free"],
};

describe("syncProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateLog.mockResolvedValue({ id: "log1" });
    mockFindCategory.mockResolvedValue({ id: "cat1" });
    mockFindTag.mockResolvedValue({ id: "tag1" });
    mockCreateTags.mockResolvedValue({ count: 1 });
    mockUpdateManyListing.mockResolvedValue({ count: 0 });
    mockUpdateProvider.mockResolvedValue({});
    mockUpdateLog.mockResolvedValue({});
    mockTransaction.mockImplementation(async (fn) => fn(mockPrismaClientLike));
  });

  it("counts created listings as added", async () => {
    mockFindListing.mockResolvedValue(null);
    mockCreateListing.mockResolvedValue({ id: "listing1" });

    const result = await syncProvider(makeProvider([raw]), "provider1");

    expect(result.itemsFound).toBe(1);
    expect(result.itemsAdded).toBe(1);
    expect(result.itemsUpdated).toBe(0);
    expect(mockCreateListing).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        title: "Intro to Python",
        status: "active",
        providerId: "provider1",
        externalId: "external-1",
        lastSeenAt: expect.any(Date),
      }),
    }));
  });

  it("counts existing listings as updated", async () => {
    mockFindListing.mockResolvedValue({ id: "existing1", slug: "intro-to-python" });

    const result = await syncProvider(makeProvider([raw]), "provider1");

    expect(result.itemsAdded).toBe(0);
    expect(result.itemsUpdated).toBe(1);
    expect(mockUpdateListing).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "existing1" },
      data: expect.objectContaining({
        status: "active",
        lastSeenAt: expect.any(Date),
      }),
    }));
  });

  it("expires stale provider listings after a successful sync", async () => {
    mockFindListing.mockResolvedValue(null);
    mockCreateListing.mockResolvedValue({ id: "listing1" });
    mockUpdateManyListing.mockResolvedValue({ count: 2 });

    const result = await syncProvider(makeProvider([raw]), "provider1");

    expect(result.itemsExpired).toBe(2);
    expect(mockUpdateManyListing).toHaveBeenCalledWith({
      where: {
        providerId: "provider1",
        status: "active",
        externalId: { notIn: ["external-1"] },
        OR: [
          { expiresAt: { lt: expect.any(Date) } },
          { endDate: { lt: expect.any(Date) } },
        ],
      },
      data: { status: "expired" },
    });
  });

  it("clears nullable fields on update when raw listing omits them", async () => {
    mockFindListing.mockResolvedValue({ id: "existing1", slug: "intro-to-python" });

    await syncProvider(makeProvider([{
      ...raw,
      categorySlug: undefined,
      tagSlugs: [],
    }]), "provider1");

    expect(mockUpdateListing).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "existing1" },
      data: expect.objectContaining({
        sourceUpdatedAt: null,
        publishedAt: null,
        companyName: null,
        compliance: null,
        categoryId: null,
        metadata: {},
      }),
    }));
  });

  it("does not expire stale listings when provider returns an empty successful fetch", async () => {
    const result = await syncProvider(makeProvider([]), "provider1");

    expect(result.itemsFound).toBe(0);
    expect(result.itemsExpired).toBe(0);
    expect(mockUpdateManyListing).not.toHaveBeenCalled();
  });

  it("does not count or mark a listing as seen when tag writes fail", async () => {
    mockFindListing.mockResolvedValue(null);
    mockCreateListing.mockResolvedValue({ id: "listing1" });
    mockCreateTags.mockRejectedValue(new Error("tag write failed"));

    const result = await syncProvider(makeProvider([raw]), "provider1");

    expect(result.itemsAdded).toBe(0);
    expect(result.itemsUpdated).toBe(0);
    expect(result.errors).toEqual(["Intro to Python: tag write failed"]);
    expect(mockUpdateManyListing).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        externalId: { notIn: [] },
      }),
    }));
  });
});
