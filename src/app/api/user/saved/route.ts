import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  return id && id !== "admin" ? id : null;
}

// GET — list saved listings for current user
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const saved = await prisma.savedListing.findMany({
    where: { userId },
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
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  await prisma.savedListing.create({ data: { userId, listingId } });
  return NextResponse.json({ saved: true });
}
