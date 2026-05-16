import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mockLearningProgressFindMany = vi.fn();
const mockLearningProgressFindUnique = vi.fn();
const mockLearningProgressCreate = vi.fn();
const mockLearningProgressUpdate = vi.fn();
const mockLearningProgressDeleteMany = vi.fn();
const mockListingFindFirst = vi.fn();
const mockUserActivityCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    learningProgress: {
      findMany: (...args: unknown[]) => mockLearningProgressFindMany(...args),
      findUnique: (...args: unknown[]) => mockLearningProgressFindUnique(...args),
      create: (...args: unknown[]) => mockLearningProgressCreate(...args),
      update: (...args: unknown[]) => mockLearningProgressUpdate(...args),
      deleteMany: (...args: unknown[]) => mockLearningProgressDeleteMany(...args),
      count: vi.fn().mockResolvedValue(0),
    },
    listing: {
      findFirst: (...args: unknown[]) => mockListingFindFirst(...args),
    },
    userActivity: {
      create: (...args: unknown[]) => mockUserActivityCreate(...args),
    },
    // For checkAndAwardBadges
    userBadge: { create: vi.fn().mockRejectedValue(new Error("skip")) },
    review: {
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _sum: { helpful: 0 } }),
    },
    savedListing: { count: vi.fn().mockResolvedValue(0) },
    follow: { count: vi.fn().mockResolvedValue(0) },
    appUser: { findUnique: vi.fn().mockResolvedValue({ emailVerified: false, tier: "free" }) },
  },
}));

vi.mock("@/lib/api-utils", () => ({
  requireIndividualUser: vi.fn(),
  isAuthError: vi.fn((r: unknown) => !(r && typeof r === "object" && "userId" in r)),
}));

import { GET, POST, DELETE as DELETE_HANDLER } from "@/app/api/user/progress/route";
import { requireIndividualUser } from "@/lib/api-utils";

const mockRequireIndividualUser = vi.mocked(requireIndividualUser);

describe("/api/user/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireIndividualUser.mockResolvedValue({ userId: "user1", isAdmin: false });
  });

  describe("GET", () => {
    it("should return 401 when not authenticated", async () => {
      mockRequireIndividualUser.mockResolvedValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

      const res = await GET(new NextRequest("http://localhost:3000/api/user/progress"));
      expect(res.status).toBe(401);
    });

    it("should return progress items and stats", async () => {
      mockLearningProgressFindMany.mockResolvedValue([
        { id: "lp1", status: "enrolled", progress: 0, listing: { id: "l1", title: "Test", slug: "test", type: "course", image: null, provider: { name: "Udemy" } } },
        { id: "lp2", status: "completed", progress: 100, listing: { id: "l2", title: "Done", slug: "done", type: "course", image: null, provider: { name: "Coursera" } } },
      ]);

      const res = await GET(new NextRequest("http://localhost:3000/api/user/progress"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.items).toHaveLength(2);
      expect(data.stats.enrolled).toBe(1);
      expect(data.stats.completed).toBe(1);
      expect(data.stats.total).toBe(2);
    });
  });

  describe("POST", () => {
    it("should return 400 when listingId is missing", async () => {
      const res = await POST(new NextRequest("http://localhost:3000/api/user/progress", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("listingId");
    });

    it("should return 404 when listing does not exist", async () => {
      mockListingFindFirst.mockResolvedValue(null);

      const res = await POST(new NextRequest("http://localhost:3000/api/user/progress", {
        method: "POST",
        body: JSON.stringify({ listingId: "nonexistent" }),
        headers: { "Content-Type": "application/json" },
      }));
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain("not found");
    });

    it("should create new progress entry for first enrollment", async () => {
      mockListingFindFirst.mockResolvedValue({ title: "React Course", slug: "react-course" });
      mockLearningProgressFindUnique.mockResolvedValue(null);
      mockLearningProgressCreate.mockResolvedValue({
        id: "lp1", userId: "user1", listingId: "l1", status: "enrolled", progress: 0,
      });
      mockUserActivityCreate.mockResolvedValue({});

      const res = await POST(new NextRequest("http://localhost:3000/api/user/progress", {
        method: "POST",
        body: JSON.stringify({ listingId: "l1" }),
        headers: { "Content-Type": "application/json" },
      }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("enrolled");
      expect(mockListingFindFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: "l1", status: "active" }),
        select: { title: true, slug: true },
      });
      expect(mockLearningProgressCreate).toHaveBeenCalled();
      expect(mockUserActivityCreate).toHaveBeenCalled();
    });

    it("should update existing progress", async () => {
      mockListingFindFirst.mockResolvedValue({ title: "React Course", slug: "react-course" });
      mockLearningProgressFindUnique.mockResolvedValue({
        id: "lp1", status: "in_progress", progress: 50,
      });
      mockLearningProgressUpdate.mockResolvedValue({
        id: "lp1", status: "in_progress", progress: 75,
      });

      const res = await POST(new NextRequest("http://localhost:3000/api/user/progress", {
        method: "POST",
        body: JSON.stringify({ listingId: "l1", progress: 75 }),
        headers: { "Content-Type": "application/json" },
      }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.progress).toBe(75);
      expect(mockLearningProgressUpdate).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("should return 400 when listingId is missing", async () => {
      const res = await DELETE_HANDLER(new NextRequest("http://localhost:3000/api/user/progress"));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("listingId");
    });

    it("should delete progress entry", async () => {
      mockLearningProgressDeleteMany.mockResolvedValue({ count: 1 });

      const res = await DELETE_HANDLER(new NextRequest("http://localhost:3000/api/user/progress?listingId=l1"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockLearningProgressDeleteMany).toHaveBeenCalledWith({
        where: { userId: "user1", listingId: "l1" },
      });
    });
  });
});
