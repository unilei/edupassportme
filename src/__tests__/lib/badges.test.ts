import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUserBadgeCreate = vi.fn();
const mockUserActivityCreate = vi.fn();
const mockReviewCount = vi.fn();
const mockSavedListingCount = vi.fn();
const mockFollowCount = vi.fn();
const mockLearningProgressCount = vi.fn();
const mockReviewAggregate = vi.fn();
const mockAppUserFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userBadge: { create: (...args: unknown[]) => mockUserBadgeCreate(...args) },
    userActivity: { create: (...args: unknown[]) => mockUserActivityCreate(...args) },
    review: {
      count: (...args: unknown[]) => mockReviewCount(...args),
      aggregate: (...args: unknown[]) => mockReviewAggregate(...args),
    },
    savedListing: { count: (...args: unknown[]) => mockSavedListingCount(...args) },
    follow: { count: (...args: unknown[]) => mockFollowCount(...args) },
    learningProgress: { count: (...args: unknown[]) => mockLearningProgressCount(...args) },
    appUser: { findUnique: (...args: unknown[]) => mockAppUserFindUnique(...args) },
  },
}));

import { BADGES, BADGE_MAP, awardBadge, checkAndAwardBadges } from "@/lib/badges";

describe("badges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("BADGES definitions", () => {
    it("should have 14 badge definitions", () => {
      expect(BADGES).toHaveLength(14);
    });

    it("each badge should have slug, name, description, icon", () => {
      for (const badge of BADGES) {
        expect(badge.slug).toBeTruthy();
        expect(badge.name).toBeTruthy();
        expect(badge.description).toBeTruthy();
        expect(badge.icon).toBeTruthy();
      }
    });

    it("all slugs should be unique", () => {
      const slugs = BADGES.map((b) => b.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });

  describe("BADGE_MAP", () => {
    it("should map all badges by slug", () => {
      expect(BADGE_MAP.size).toBe(14);
      expect(BADGE_MAP.get("first_review")?.name).toBe("First Review");
      expect(BADGE_MAP.get("pro_member")?.name).toBe("Pro Member");
    });
  });

  describe("awardBadge", () => {
    it("should create badge and activity, return true on new award", async () => {
      mockUserBadgeCreate.mockResolvedValue({ id: "b1", userId: "u1", badge: "first_review" });
      mockUserActivityCreate.mockResolvedValue({});

      const result = await awardBadge("u1", "first_review");

      expect(result).toBe(true);
      expect(mockUserBadgeCreate).toHaveBeenCalledWith({
        data: { userId: "u1", badge: "first_review" },
      });
      expect(mockUserActivityCreate).toHaveBeenCalledTimes(1);
    });

    it("should return false if badge already exists (unique constraint)", async () => {
      mockUserBadgeCreate.mockRejectedValue(new Error("Unique constraint failed"));

      const result = await awardBadge("u1", "first_review");

      expect(result).toBe(false);
      expect(mockUserActivityCreate).not.toHaveBeenCalled();
    });
  });

  describe("checkAndAwardBadges", () => {
    function setupCounts(overrides: {
      reviews?: number;
      saves?: number;
      following?: number;
      followers?: number;
      completed?: number;
      enrolled?: number;
      helpful?: number;
      emailVerified?: boolean;
      tier?: string;
    } = {}) {
      mockReviewCount.mockResolvedValue(overrides.reviews ?? 0);
      mockSavedListingCount.mockResolvedValue(overrides.saves ?? 0);
      mockFollowCount.mockResolvedValue(overrides.following ?? 0);
      mockLearningProgressCount.mockResolvedValue(overrides.completed ?? 0);
      mockReviewAggregate.mockResolvedValue({ _sum: { helpful: overrides.helpful ?? 0 } });
      mockAppUserFindUnique.mockResolvedValue({
        emailVerified: overrides.emailVerified ?? false,
        tier: overrides.tier ?? "free",
      });
      // awardBadge will succeed for all
      mockUserBadgeCreate.mockResolvedValue({});
      mockUserActivityCreate.mockResolvedValue({});
    }

    it("should award first_review when review count >= 1", async () => {
      setupCounts({ reviews: 1 });

      const awarded = await checkAndAwardBadges("u1");

      expect(awarded).toContain("first_review");
    });

    it("should award multiple badges at once", async () => {
      setupCounts({ reviews: 5, saves: 1, following: 1 });

      const awarded = await checkAndAwardBadges("u1");

      expect(awarded).toContain("first_review");
      expect(awarded).toContain("five_reviews");
      expect(awarded).toContain("first_save");
      expect(awarded).toContain("first_follow");
    });

    it("should award no badges when all counts are zero", async () => {
      setupCounts();

      const awarded = await checkAndAwardBadges("u1");

      expect(awarded).toHaveLength(0);
    });

    it("should award verified_email when emailVerified is true", async () => {
      setupCounts({ emailVerified: true });

      const awarded = await checkAndAwardBadges("u1");

      expect(awarded).toContain("verified_email");
    });

    it("should award pro_member when tier is pro", async () => {
      setupCounts({ tier: "pro" });

      const awarded = await checkAndAwardBadges("u1");

      expect(awarded).toContain("pro_member");
    });

    it("should skip already-awarded badges gracefully", async () => {
      setupCounts({ reviews: 1 });
      // awardBadge will fail (already exists)
      mockUserBadgeCreate.mockRejectedValue(new Error("Unique constraint"));

      const awarded = await checkAndAwardBadges("u1");

      expect(awarded).toHaveLength(0);
    });
  });
});
