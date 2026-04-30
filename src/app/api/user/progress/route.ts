import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthError } from "@/lib/api-utils";
import { checkAndAwardBadges } from "@/lib/badges";
import type { Prisma } from "@/generated/prisma/client";
import { activeListingWhere } from "@/lib/listing-visibility";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (isAuthError(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.userId;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";

  const where: Record<string, unknown> = { userId: uid };
  if (status) where.status = status;

  const items = await prisma.learningProgress.findMany({
    where,
    include: {
      listing: {
        select: { id: true, title: true, slug: true, type: true, image: true, provider: { select: { name: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const stats = {
    enrolled: items.filter((i) => i.status === "enrolled").length,
    inProgress: items.filter((i) => i.status === "in_progress").length,
    completed: items.filter((i) => i.status === "completed").length,
    dropped: items.filter((i) => i.status === "dropped").length,
    total: items.length,
  };

  return NextResponse.json({ items, stats });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (isAuthError(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.userId;
  const body = await req.json();
  const { listingId, status, progress, notes } = body as {
    listingId?: string;
    status?: string;
    progress?: number;
    notes?: string;
  };

  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, ...activeListingWhere() },
    select: { title: true, slug: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Upsert progress
  const existing = await prisma.learningProgress.findUnique({
    where: { userId_listingId: { userId: uid, listingId } },
  });

  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (progress !== undefined) data.progress = Math.min(100, Math.max(0, progress));
  if (notes !== undefined) data.notes = notes;
  if (status === "completed") {
    data.completedAt = new Date();
    data.progress = 100;
  }

  let record;
  if (existing) {
    record = await prisma.learningProgress.update({
      where: { id: existing.id },
      data,
    });
  } else {
    record = await prisma.learningProgress.create({
      data: {
        userId: uid,
        listingId,
        status: status || "enrolled",
        progress: progress ?? 0,
        notes,
      },
    });

    // Record activity for enrollment
    await prisma.userActivity.create({
      data: {
        userId: uid,
        type: "enroll",
        message: `Enrolled in "${listing.title}"`,
        link: `/listing/${listing.slug}`,
        meta: { listingId } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // Record completion activity
  if (status === "completed" && existing?.status !== "completed") {
    await prisma.userActivity.create({
      data: {
        userId: uid,
        type: "complete",
        message: `Completed "${listing.title}" 🎉`,
        link: `/listing/${listing.slug}`,
        meta: { listingId } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  await checkAndAwardBadges(uid);

  return NextResponse.json(record);
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  if (isAuthError(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.userId;
  const url = new URL(req.url);
  const listingId = url.searchParams.get("listingId");

  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  await prisma.learningProgress.deleteMany({ where: { userId: uid, listingId } });

  return NextResponse.json({ ok: true });
}
