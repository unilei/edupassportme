import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, auditLog } from "@/lib/admin";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const rating = url.searchParams.get("rating");

  const where: Record<string, unknown> = {};
  if (rating) where.rating = parseInt(rating, 10);

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
        listing: { select: { id: true, title: true, slug: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return NextResponse.json({ reviews, total, page, totalPages: Math.ceil(total / limit) });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const review = await prisma.review.findUnique({
    where: { id },
    include: { user: { select: { email: true } }, listing: { select: { title: true } } },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  await prisma.review.delete({ where: { id } });
  await auditLog("admin", "review.delete", id, {
    userEmail: review.user.email,
    listingTitle: review.listing.title,
    rating: review.rating,
  });

  return NextResponse.json({ ok: true });
}
