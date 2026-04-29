import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

// GET — list reviews for a listing
export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 10;

  const listing = await prisma.listing.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { listingId: listing.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    }),
    prisma.review.count({ where: { listingId: listing.id } }),
  ]);

  // Aggregate stats
  const stats = await prisma.review.aggregate({
    where: { listingId: listing.id },
    _avg: { rating: true },
    _count: true,
  });

  // Rating distribution
  const distribution = await prisma.review.groupBy({
    by: ["rating"],
    where: { listingId: listing.id },
    _count: true,
  });

  const ratingDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of distribution) {
    ratingDist[d.rating] = d._count;
  }

  // Check if current user already reviewed
  let userReview = null;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  if (userId && userId !== "admin") {
    userReview = await prisma.review.findUnique({
      where: { userId_listingId: { userId, listingId: listing.id } },
    });
  }

  const res = NextResponse.json({
    reviews,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    stats: {
      average: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : null,
      count: stats._count,
      distribution: ratingDist,
    },
    userReview,
  });
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res;
}

// POST — create a review
export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  if (!userId || userId === "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listing = await prisma.listing.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const body = await request.json();
  const { rating, title, body: reviewBody } = body as {
    rating?: number;
    title?: string;
    body?: string;
  };

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  // Check for existing review
  const existing = await prisma.review.findUnique({
    where: { userId_listingId: { userId, listingId: listing.id } },
  });

  if (existing) {
    return NextResponse.json({ error: "You have already reviewed this listing" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      userId,
      listingId: listing.id,
      rating: Math.round(rating),
      title: title || null,
      body: reviewBody || null,
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } },
    },
  });

  // Update listing aggregate rating
  const agg = await prisma.review.aggregate({
    where: { listingId: listing.id },
    _avg: { rating: true },
    _count: true,
  });

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      rating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : null,
      reviewCount: agg._count,
    },
  });

  return NextResponse.json({ review }, { status: 201 });
}
