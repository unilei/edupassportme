import { prisma } from "@/lib/prisma";

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

  // Map interests to search keywords
  const interestKeywords = interests.map((i) => i.toLowerCase());

  // Fetch candidate listings (exclude already saved)
  const candidates = await prisma.listing.findMany({
    where: {
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

    // Category affinity (from saved listings)
    if (listing.category && savedCategorySlugs.has(listing.category.slug)) {
      score += 20;
    }

    // Tag affinity (from saved listings)
    for (const lt of listing.tags) {
      if (savedTagSlugs.has(lt.tag.slug)) score += 5;
    }

    // Interest keyword matching (title + description)
    const text = `${listing.title} ${listing.description}`.toLowerCase();
    for (const keyword of interestKeywords) {
      if (text.includes(keyword)) score += 15;
    }

    // Education level matching
    if (listing.level && preferredLevels.includes(listing.level)) {
      score += 10;
    }

    // Boost high-rated content
    if (listing.rating) {
      score += listing.rating * 2;
    }

    // Boost popular content
    if (listing.reviewCount && listing.reviewCount > 10000) {
      score += 5;
    }

    return { listing, score };
  });

  // Sort by score descending, then by rating
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.listing.rating ?? 0) - (a.listing.rating ?? 0);
  });

  return scored.slice(0, limit).map((s) => s.listing);
}
