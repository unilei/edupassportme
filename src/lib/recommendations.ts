import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-visibility";

interface RecommendationOptions {
  userId: string;
  limit?: number;
}

/**
 * Content-based recommendation engine.
 * Scores listings based on user profile interests, education level,
 * saved listing patterns, and click history.
 */
export async function getRecommendations({ userId, limit = 12 }: RecommendationOptions) {
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      savedListings: {
        include: {
          listing: {
            include: {
              category: { select: { slug: true } },
              tags: { include: { tag: { select: { slug: true } } } },
            },
          },
        },
      },
    },
  });

  if (!user) return [];

  const interests = user.profile?.interests ?? [];
  const goals = user.profile?.goals ?? [];
  const targetRegions = user.profile?.targetRegions ?? [];
  const preferredTypes = user.profile?.preferredTypes ?? [];
  const educationLevel = user.profile?.educationLevel ?? "";

  // Build affinity signals from saved listings
  const savedCategorySlugs = new Set<string>();
  const savedTagSlugs = new Set<string>();
  const savedListingIds = new Set<string>();

  for (const saved of user.savedListings) {
    savedListingIds.add(saved.listingId);
    if (saved.listing.category?.slug) savedCategorySlugs.add(saved.listing.category.slug);
    for (const lt of saved.listing.tags) {
      savedTagSlugs.add(lt.tag.slug);
    }
  }

  // Map education level to listing levels
  const levelMap: Record<string, string[]> = {
    "High School": ["Beginner", "All Levels"],
    "Undergraduate": ["Beginner", "Intermediate", "All Levels"],
    "Graduate": ["Intermediate", "Advanced", "All Levels"],
    "PhD": ["Advanced", "All Levels"],
    "Professional": ["Intermediate", "Advanced", "All Levels"],
    "Self-learner": ["Beginner", "Intermediate", "All Levels"],
  };
  const preferredLevels = levelMap[educationLevel] ?? [];

  // Map profile preferences to search keywords.
  // Fetch candidate listings (exclude already saved)
  const candidates = await prisma.listing.findMany({
    where: {
      ...activeListingWhere(),
      id: { notIn: [...savedListingIds] },
    },
    take: 200,
    include: {
      provider: { select: { name: true, slug: true, logo: true } },
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true, slug: true } } } },
    },
  });

  // Score each candidate
  const scored = candidates.map((listing) => {
    let score = 0;
    const reasons = new Set<string>();
    const text = [
      listing.title,
      listing.description,
      listing.location,
      listing.country,
      listing.region,
      listing.companyName,
      ...listing.tags.map((lt) => lt.tag.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    // Category affinity (from saved listings)
    if (listing.category && savedCategorySlugs.has(listing.category.slug)) {
      score += 20;
      reasons.add(`Similar to opportunities you saved`);
    }

    // Tag affinity (from saved listings)
    for (const lt of listing.tags) {
      if (savedTagSlugs.has(lt.tag.slug)) {
        score += 5;
        reasons.add(`Matches saved topic: ${lt.tag.name}`);
      }
    }

    // Interest keyword matching (title + description)
    for (const interest of interests) {
      const keyword = interest.toLowerCase();
      if (text.includes(keyword)) {
        score += 15;
        reasons.add(`Matches interest: ${interest}`);
      }
    }

    for (const goal of goals) {
      const keyword = goal.toLowerCase();
      const goalParts = keyword.split(/\W+/).filter((part) => part.length > 4);
      if (text.includes(keyword) || goalParts.some((part) => text.includes(part))) {
        score += 25;
        reasons.add(`Matches your goal: ${goal}`);
      }
    }

    for (const region of targetRegions) {
      const keyword = region.toLowerCase();
      if (text.includes(keyword)) {
        score += 15;
        reasons.add(`Matches target region: ${region}`);
      }
    }

    if (preferredTypes.includes(listing.type)) {
      score += 18;
      reasons.add(`Preferred opportunity type: ${listing.type}`);
    }

    // Education level matching
    if (listing.level && preferredLevels.includes(listing.level)) {
      score += 10;
      reasons.add(`Fits your education level`);
    }

    // Boost high-rated content
    if (listing.rating) {
      score += listing.rating * 2;
    }

    // Boost popular content
    if (listing.reviewCount && listing.reviewCount > 10000) {
      score += 5;
    }

    if (listing.verified) {
      score += 4;
      reasons.add("Verified opportunity");
    }
    if (listing.expiresAt) {
      score += 3;
      reasons.add("Has a clear deadline");
    }

    return {
      listing: {
        ...listing,
        fitScore: Math.max(0, Math.round(score)),
        fitReasons: reasons.size > 0 ? [...reasons].slice(0, 4) : ["Popular with EDU Passport users"],
      },
      score,
    };
  });

  // Sort by score descending, then by rating
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.listing.rating ?? 0) - (a.listing.rating ?? 0);
  });

  return scored.slice(0, limit).map((s) => s.listing);
}
