import { describe, expect, it, vi, beforeEach } from "vitest";

const mockItemFindMany = vi.fn();
const mockCategoryFindMany = vi.fn();
const mockTagFindMany = vi.fn();
const mockListingFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      findMany: (...args: unknown[]) => mockItemFindMany(...args),
    },
    category: {
      findMany: (...args: unknown[]) => mockCategoryFindMany(...args),
    },
    tag: {
      findMany: (...args: unknown[]) => mockTagFindMany(...args),
    },
    listing: {
      findMany: (...args: unknown[]) => mockListingFindMany(...args),
    },
  },
}));

import { GET } from "@/app/sitemap.xml/route";

describe("GET /sitemap.xml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns XML sitemap entries and only queries public active listings", async () => {
    mockItemFindMany.mockResolvedValue([
      { slug: "student-tools", updatedAt: new Date("2026-04-01T00:00:00.000Z") },
    ]);
    mockCategoryFindMany.mockResolvedValue([
      { slug: "courses", updatedAt: new Date("2026-04-02T00:00:00.000Z") },
    ]);
    mockTagFindMany.mockResolvedValue([
      { slug: "stem", createdAt: new Date("2026-04-03T00:00:00.000Z") },
    ]);
    mockListingFindMany.mockResolvedValue([
      { slug: "active-course", updatedAt: new Date("2026-04-04T00:00:00.000Z") },
    ]);

    const res = await GET();
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(res.headers.get("cache-control")).toContain("s-maxage=3600");
    expect(text).toContain(`<loc>http://localhost:3000/courses</loc>`);
    expect(text).toContain(`<loc>http://localhost:3000/listing/active-course</loc>`);
    expect(text).toContain(`<loc>http://localhost:3000/item/student-tools</loc>`);
    expect(text).toContain(`<loc>http://localhost:3000/category/courses</loc>`);
    expect(text).toContain(`<loc>http://localhost:3000/tag/stem</loc>`);
    expect(mockListingFindMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: "active",
        AND: expect.arrayContaining([
          { OR: [{ expiresAt: null }, { expiresAt: { gte: expect.any(Date) } }] },
          { OR: [{ endDate: null }, { endDate: { gte: expect.any(Date) } }] },
        ]),
      }),
      select: { slug: true, updatedAt: true },
    });
  });
});
