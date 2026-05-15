import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockRequireAdmin,
  mockCategoryFindMany,
  mockItemFindMany,
  mockTagFindMany,
  mockSponsoredFindMany,
  mockProviderFindMany,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockCategoryFindMany: vi.fn(),
  mockItemFindMany: vi.fn(),
  mockTagFindMany: vi.fn(),
  mockSponsoredFindMany: vi.fn(),
  mockProviderFindMany: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: { count: vi.fn() },
    appUser: { count: vi.fn(), findMany: vi.fn() },
    category: {
      findMany: mockCategoryFindMany,
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    clickEvent: {
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    item: {
      findMany: mockItemFindMany,
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    itemTag: { deleteMany: vi.fn() },
    listing: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    provider: {
      findMany: mockProviderFindMany,
    },
    sponsoredListing: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: mockSponsoredFindMany,
    },
    tag: {
      findMany: mockTagFindMany,
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { GET as analyticsGET } from "@/app/api/admin/analytics/route";
import { GET as affiliatesGET } from "@/app/api/admin/affiliates/route";
import {
  DELETE as categoriesDELETE,
  GET as categoriesGET,
  POST as categoriesPOST,
  PUT as categoriesPUT,
} from "@/app/api/admin/categories/route";
import {
  DELETE as itemsDELETE,
  GET as itemsGET,
  POST as itemsPOST,
  PUT as itemsPUT,
} from "@/app/api/admin/items/route";
import {
  DELETE as sponsoredDELETE,
  GET as sponsoredGET,
  POST as sponsoredPOST,
} from "@/app/api/admin/sponsored/route";
import {
  DELETE as tagsDELETE,
  GET as tagsGET,
  POST as tagsPOST,
  PUT as tagsPUT,
} from "@/app/api/admin/tags/route";

function request(method: string, body: unknown = {}, url = "http://localhost/api/admin/test") {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

async function expectUnauthorized(responsePromise: Promise<Response>) {
  const res = await responsePromise;
  expect(res.status).toBe(401);
  await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
}

describe("admin API authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue(null);
  });

  it("blocks dashboard read endpoints without the canonical admin session", async () => {
    await expectUnauthorized(analyticsGET());
    await expectUnauthorized(affiliatesGET());
    await expectUnauthorized(sponsoredGET());
    await expectUnauthorized(categoriesGET());
    await expectUnauthorized(itemsGET());
    await expectUnauthorized(tagsGET());

    expect(mockCategoryFindMany).not.toHaveBeenCalled();
    expect(mockItemFindMany).not.toHaveBeenCalled();
    expect(mockTagFindMany).not.toHaveBeenCalled();
    expect(mockSponsoredFindMany).not.toHaveBeenCalled();
    expect(mockProviderFindMany).not.toHaveBeenCalled();
  });

  it("blocks admin mutation endpoints before parsing or mutating data", async () => {
    await expectUnauthorized(categoriesPOST(request("POST", { name: "Category" })));
    await expectUnauthorized(categoriesPUT(request("PUT", { id: "cat-1" })));
    await expectUnauthorized(categoriesDELETE(request("DELETE", {}, "http://localhost/api/admin/categories?id=cat-1")));
    await expectUnauthorized(itemsPOST(request("POST", { name: "Item" })));
    await expectUnauthorized(itemsPUT(request("PUT", { id: "item-1" })));
    await expectUnauthorized(itemsDELETE(request("DELETE", {}, "http://localhost/api/admin/items?id=item-1")));
    await expectUnauthorized(tagsPOST(request("POST", { name: "Tag" })));
    await expectUnauthorized(tagsPUT(request("PUT", { id: "tag-1" })));
    await expectUnauthorized(tagsDELETE(request("DELETE", {}, "http://localhost/api/admin/tags?id=tag-1")));
    await expectUnauthorized(sponsoredPOST(request("POST", { listingId: "listing-1", position: "hero" })));
    await expectUnauthorized(sponsoredDELETE(request("DELETE", {}, "http://localhost/api/admin/sponsored?id=sponsored-1")));
  });
});
