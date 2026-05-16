import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeListingWhere } from "@/lib/listing-visibility";
import { isProUser } from "@/lib/pro";
import { isAuthError, requireIndividualUser } from "@/lib/api-utils";

const FREE_TRACKING_LIMIT = 20;
const VALID_STATUSES = new Set(["saved", "researching", "applying", "applied", "completed", "dismissed"]);
const VALID_PRIORITIES = new Set(["low", "medium", "high"]);

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// GET — list saved listings for current user
export async function GET() {
  const user = await requireIndividualUser();
  if (isAuthError(user)) return user;
  const userId = user.userId;

  const saved = await prisma.savedListing.findMany({
    where: { userId, listing: activeListingWhere() },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: {
          provider: { select: { name: true, slug: true, logo: true } },
          category: { select: { name: true, slug: true } },
          tags: { include: { tag: { select: { name: true, slug: true } } } },
        },
      },
    },
  });

  return NextResponse.json({ saved });
}

// POST — save or unsave a listing
export async function POST(request: NextRequest) {
  const user = await requireIndividualUser();
  if (isAuthError(user)) return user;
  const userId = user.userId;

  const body = await request.json();
  const { listingId } = body as { listingId?: string };

  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  // Toggle: if already saved, remove it; otherwise save it
  const existing = await prisma.savedListing.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });

  if (existing) {
    await prisma.savedListing.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, ...activeListingWhere() },
    select: { id: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const [isPro, savedCount] = await Promise.all([
    isProUser(userId),
    prisma.savedListing.count({ where: { userId } }),
  ]);
  if (!isPro && savedCount >= FREE_TRACKING_LIMIT) {
    return NextResponse.json(
      {
        error: "Free accounts can track up to 20 opportunities. Upgrade to Pro for unlimited tracking.",
        code: "SAVE_LIMIT_REACHED",
      },
      { status: 403 },
    );
  }

  await prisma.savedListing.create({ data: { userId, listingId } });
  return NextResponse.json({ saved: true });
}

// PATCH — update workspace tracking metadata for a saved opportunity
export async function PATCH(request: NextRequest) {
  const user = await requireIndividualUser();
  if (isAuthError(user)) return user;
  const userId = user.userId;

  const body = await request.json();
  const {
    savedId,
    listingId,
    status,
    priority,
    deadlineAt,
    nextActionAt,
    note,
  } = body as {
    savedId?: string;
    listingId?: string;
    status?: string;
    priority?: string;
    deadlineAt?: string | null;
    nextActionAt?: string | null;
    note?: string | null;
  };

  if (!savedId && !listingId) {
    return NextResponse.json({ error: "savedId or listingId required" }, { status: 400 });
  }
  if (status !== undefined && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (priority !== undefined && !VALID_PRIORITIES.has(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  const parsedDeadlineAt = parseOptionalDate(deadlineAt);
  const parsedNextActionAt = parseOptionalDate(nextActionAt);
  if (deadlineAt !== undefined && parsedDeadlineAt === undefined) {
    return NextResponse.json({ error: "Invalid deadlineAt" }, { status: 400 });
  }
  if (nextActionAt !== undefined && parsedNextActionAt === undefined) {
    return NextResponse.json({ error: "Invalid nextActionAt" }, { status: 400 });
  }

  const where = savedId ? { id: savedId, userId } : { listingId: listingId!, userId };
  const data = {
    ...(status !== undefined && { status }),
    ...(priority !== undefined && { priority }),
    ...(deadlineAt !== undefined && { deadlineAt: parsedDeadlineAt }),
    ...(nextActionAt !== undefined && { nextActionAt: parsedNextActionAt }),
    ...(note !== undefined && { note: note?.trim() || null }),
  };

  const updated = await prisma.savedListing.updateMany({ where, data });
  if (updated.count === 0) {
    return NextResponse.json({ error: "Saved opportunity not found" }, { status: 404 });
  }

  const saved = await prisma.savedListing.findFirst({
    where,
    include: {
      listing: {
        include: {
          provider: { select: { name: true, slug: true, logo: true } },
          category: { select: { name: true, slug: true } },
          tags: { include: { tag: { select: { name: true, slug: true } } } },
        },
      },
    },
  });

  return NextResponse.json({ saved });
}
