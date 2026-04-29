import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as Record<string, unknown> | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Aggregate click data by provider with affiliate info
  const providers = await prisma.provider.findMany({
    where: { affiliateTag: { not: null } },
    select: {
      id: true,
      name: true,
      slug: true,
      affiliateTag: true,
      commissionRate: true,
    },
  });

  const stats = await Promise.all(
    providers.map(async (p) => {
      const clicks = await prisma.clickEvent.aggregate({
        where: { providerId: p.id, affiliateTag: { not: null } },
        _count: true,
        _sum: { commission: true },
      });
      return {
        ...p,
        totalClicks: clicks._count,
        estimatedRevenue: clicks._sum.commission ?? 0,
      };
    })
  );

  // Overall totals
  const totals = await prisma.clickEvent.aggregate({
    where: { affiliateTag: { not: null } },
    _count: true,
    _sum: { commission: true },
  });

  // Recent affiliate clicks (last 50)
  const recentClicks = await prisma.clickEvent.findMany({
    where: { affiliateTag: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      affiliateTag: true,
      commission: true,
      createdAt: true,
      listing: { select: { title: true, slug: true } },
    },
  });

  // Daily clicks for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dailyClicks = await prisma.clickEvent.groupBy({
    by: ["createdAt"],
    where: {
      affiliateTag: { not: null },
      createdAt: { gte: thirtyDaysAgo },
    },
    _count: true,
  });

  return NextResponse.json({
    providers: stats,
    totals: {
      clicks: totals._count,
      estimatedRevenue: totals._sum.commission ?? 0,
    },
    recentClicks,
    dailyClickCount: dailyClicks.length,
  });
}
