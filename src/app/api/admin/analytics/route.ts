import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalUsers,
    proUsers,
    newUsersThisMonth,
    totalListings,
    totalClicks,
    clicksThisMonth,
    clicksThisWeek,
    totalApplications,
    totalSponsored,
    sponsoredActive,
    affiliateClicks,
    listingsByType,
    topListings,
    topProviders,
    recentUsers,
    clicksByDay,
  ] = await Promise.all([
    // Users
    prisma.appUser.count(),
    prisma.appUser.count({ where: { tier: "pro" } }),
    prisma.appUser.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

    // Listings
    prisma.listing.count(),

    // Clicks
    prisma.clickEvent.count(),
    prisma.clickEvent.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.clickEvent.count({ where: { createdAt: { gte: sevenDaysAgo } } }),

    // Applications
    prisma.application.count(),

    // Sponsored
    prisma.sponsoredListing.count(),
    prisma.sponsoredListing.count({ where: { isActive: true } }),

    // Affiliate
    prisma.clickEvent.count({ where: { affiliateTag: { not: null } } }),

    // Listings by type
    prisma.listing.groupBy({
      by: ["type"],
      _count: true,
    }),

    // Top listings by clicks
    prisma.listing.findMany({
      orderBy: { clickCount: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        clickCount: true,
        provider: { select: { name: true } },
      },
    }),

    // Top providers by listing count
    prisma.provider.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { listings: true } },
      },
      orderBy: { listings: { _count: "desc" } },
      take: 7,
    }),

    // Recent users
    prisma.appUser.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        createdAt: true,
      },
    }),

    // Clicks per day (last 30 days) — raw query via groupBy on date
    prisma.clickEvent.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Aggregate clicks by day
  const clickDayMap: Record<string, number> = {};
  for (const c of clicksByDay) {
    const day = c.createdAt.toISOString().slice(0, 10);
    clickDayMap[day] = (clickDayMap[day] || 0) + 1;
  }
  const clickTrend = Object.entries(clickDayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Type distribution
  const typeDistribution = listingsByType.map((g) => ({
    type: g.type,
    count: g._count,
  }));

  return NextResponse.json({
    overview: {
      totalUsers,
      proUsers,
      newUsersThisMonth,
      totalListings,
      totalClicks,
      clicksThisMonth,
      clicksThisWeek,
      totalApplications,
      totalSponsored,
      sponsoredActive,
      affiliateClicks,
    },
    typeDistribution,
    topListings,
    topProviders: topProviders.map((p) => ({
      ...p,
      listingCount: p._count.listings,
    })),
    recentUsers,
    clickTrend,
  });
}
