import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const position = searchParams.get("position"); // hero | feed | sidebar
  const limit = parseInt(searchParams.get("limit") || "3", 10);

  const now = new Date();

  const sponsored = await prisma.sponsoredListing.findMany({
    where: {
      isActive: true,
      ...(position ? { position } : {}),
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      listing: {
        include: {
          provider: { select: { name: true, slug: true, logo: true } },
          category: { select: { name: true, slug: true } },
        },
      },
    },
  });

  // Increment impressions
  if (sponsored.length > 0) {
    await prisma.sponsoredListing.updateMany({
      where: { id: { in: sponsored.map((s) => s.id) } },
      data: { impressions: { increment: 1 } },
    });
  }

  const res = NextResponse.json({ sponsored });
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res;
}
