import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

import { GET } from "@/app/api/search/route";
import { prisma } from "@/lib/prisma";

const mockedPrisma = vi.mocked(prisma);

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/search");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty results when no query provided", async () => {
    const res = await GET(makeRequest({}));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.listings).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("should return empty results for empty query string", async () => {
    const res = await GET(makeRequest({ q: "  " }));
    const body = await res.json();

    expect(body.listings).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("should query database and return formatted results", async () => {
    const mockListing = {
      id: "1",
      title: "Intro to Python",
      slug: "intro-to-python",
      type: "course",
      description: "Learn Python basics",
      image: null,
      price: 29.99,
      currency: "USD",
      priceLabel: "$29.99",
      rating: 4.5,
      reviewCount: 100,
      level: "beginner",
      duration: "10h",
      location: null,
      featured: false,
      createdAt: new Date("2025-01-01"),
      providerName: "Udemy",
      providerSlug: "udemy",
      providerLogo: null,
      rank: 0.8,
    };

    // Mock count query
    mockedPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ count: BigInt(1) }]);
    // Mock listings query
    mockedPrisma.$queryRawUnsafe.mockResolvedValueOnce([mockListing]);

    const res = await GET(makeRequest({ q: "python" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.listings).toHaveLength(1);
    expect(body.listings[0].title).toBe("Intro to Python");
    expect(body.listings[0].provider.name).toBe("Udemy");
    expect(body.listings[0].rank).toBe(0.8);

    expect(mockedPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(`"status" = $2`),
      "python:*",
      "active"
    );
    expect(mockedPrisma.$queryRawUnsafe).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(`l."status" = $2`),
      "python:*",
      "active",
      12,
      0
    );
  });

  it("should respect page parameter", async () => {
    mockedPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ count: BigInt(0) }]);
    mockedPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

    const res = await GET(makeRequest({ q: "test", page: "2" }));
    const body = await res.json();

    expect(body.page).toBe(2);
  });

  it("should clamp page to minimum 1", async () => {
    mockedPrisma.$queryRawUnsafe.mockResolvedValueOnce([{ count: BigInt(0) }]);
    mockedPrisma.$queryRawUnsafe.mockResolvedValueOnce([]);

    const res = await GET(makeRequest({ q: "test", page: "-5" }));
    const body = await res.json();

    expect(body.page).toBe(1);
  });
});
