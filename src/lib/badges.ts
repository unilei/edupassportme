import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface BadgeDefinition {
  slug: string;
  name: string;
  description: string;
  icon: string; // emoji
}

export const BADGES: BadgeDefinition[] = [
  { slug: "first_review", name: "First Review", description: "Wrote your first review", icon: "✍️" },
  { slug: "five_reviews", name: "Reviewer", description: "Wrote 5 reviews", icon: "📝" },
  { slug: "twenty_reviews", name: "Critic", description: "Wrote 20 reviews", icon: "🏆" },
  { slug: "first_save", name: "Bookworm", description: "Saved your first listing", icon: "🔖" },
  { slug: "ten_saves", name: "Collector", description: "Saved 10 listings", icon: "📚" },
  { slug: "first_follow", name: "Social", description: "Followed your first user", icon: "🤝" },
  { slug: "ten_followers", name: "Influencer", description: "Gained 10 followers", icon: "⭐" },
  { slug: "first_enroll", name: "Learner", description: "Enrolled in your first course", icon: "🎓" },
  { slug: "first_complete", name: "Graduate", description: "Completed your first course", icon: "🎉" },
  { slug: "five_complete", name: "Scholar", description: "Completed 5 courses", icon: "🏅" },
  { slug: "explorer", name: "Explorer", description: "Viewed 50 listings", icon: "🧭" },
  { slug: "helpful", name: "Helpful", description: "Received 10 upvotes on reviews", icon: "👍" },
  { slug: "verified_email", name: "Verified", description: "Verified your email address", icon: "✅" },
  { slug: "pro_member", name: "Pro Member", description: "Subscribed to Pro", icon: "💎" },
];

export const BADGE_MAP = new Map(BADGES.map((b) => [b.slug, b]));

/**
 * Award a badge to a user (idempotent — skips if already awarded).
 * Returns true if newly awarded, false if already had it.
 */
export async function awardBadge(userId: string, badge: string): Promise<boolean> {
  try {
    await prisma.userBadge.create({ data: { userId, badge } });

    // Record activity
    const def = BADGE_MAP.get(badge);
    await prisma.userActivity.create({
      data: {
        userId,
        type: "badge",
        message: `Earned the "${def?.name || badge}" badge ${def?.icon || "🏅"}`,
        meta: { badge } as unknown as Prisma.InputJsonValue,
      },
    });

    return true;
  } catch {
    // Unique constraint violation = already has badge
    return false;
  }
}

/**
 * Check and award badges based on user stats.
 * Call this after relevant actions (review, save, follow, etc.)
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const awarded: string[] = [];

  const [reviewCount, saveCount, followingCount, followerCount, completedCount, enrolledCount, helpfulSum, user] =
    await Promise.all([
      prisma.review.count({ where: { userId } }),
      prisma.savedListing.count({ where: { userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.learningProgress.count({ where: { userId, status: "completed" } }),
      prisma.learningProgress.count({ where: { userId } }),
      prisma.review.aggregate({ where: { userId }, _sum: { helpful: true } }),
      prisma.appUser.findUnique({ where: { id: userId }, select: { emailVerified: true, tier: true } }),
    ]);

  const checks: [boolean, string][] = [
    [reviewCount >= 1, "first_review"],
    [reviewCount >= 5, "five_reviews"],
    [reviewCount >= 20, "twenty_reviews"],
    [saveCount >= 1, "first_save"],
    [saveCount >= 10, "ten_saves"],
    [followingCount >= 1, "first_follow"],
    [followerCount >= 10, "ten_followers"],
    [enrolledCount >= 1, "first_enroll"],
    [completedCount >= 1, "first_complete"],
    [completedCount >= 5, "five_complete"],
    [(helpfulSum._sum.helpful ?? 0) >= 10, "helpful"],
    [user?.emailVerified === true, "verified_email"],
    [user?.tier === "pro", "pro_member"],
  ];

  for (const [condition, badge] of checks) {
    if (condition) {
      const isNew = await awardBadge(userId, badge);
      if (isNew) awarded.push(badge);
    }
  }

  return awarded;
}
