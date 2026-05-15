import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appUserFindUnique: vi.fn(),
  listingFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: {
      findUnique: mocks.appUserFindUnique,
    },
    listing: {
      findMany: mocks.listingFindMany,
    },
  },
}));

import { getRecommendations } from "@/lib/recommendations";

describe("getRecommendations workspace fit scoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns fit score and reasons from goals, preferred types, regions, and interests", async () => {
    mocks.appUserFindUnique.mockResolvedValue({
      id: "user_1",
      profile: {
        educationLevel: "Undergraduate",
        interests: ["Data Science"],
        goals: ["Internship-ready skills"],
        targetRegions: ["United States"],
        preferredTypes: ["course"],
      },
      savedListings: [],
    });
    mocks.listingFindMany.mockResolvedValue([
      {
        id: "listing_1",
        title: "Data Science Internship Prep",
        description: "Build internship-ready skills for students in the United States.",
        type: "course",
        level: "Beginner",
        rating: 4.8,
        reviewCount: 1200,
        location: "United States",
        category: { slug: "data" },
        tags: [{ tag: { name: "Data Science", slug: "data-science" } }],
      },
    ]);

    const listings = await getRecommendations({ userId: "user_1", limit: 1 });

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      fitScore: expect.any(Number),
      fitReasons: expect.arrayContaining([
        "Matches your goal: Internship-ready skills",
        "Preferred opportunity type: course",
        "Matches target region: United States",
        "Matches interest: Data Science",
      ]),
    });
    expect((listings[0] as { fitScore: number }).fitScore).toBeGreaterThan(40);
  });
});
