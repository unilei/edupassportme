import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProUser } from "@/lib/pro";
import { activeListingWhere } from "@/lib/listing-visibility";

// GET: List user's applications
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  if (!userId || userId === "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await prisma.application.findMany({
    where: { userId },
    orderBy: { appliedAt: "desc" },
    include: {
      listing: {
        select: {
          title: true,
          slug: true,
          type: true,
          url: true,
          location: true,
          priceLabel: true,
          provider: { select: { name: true, logo: true } },
        },
      },
    },
  });

  return NextResponse.json({ applications });
}

// POST: Quick-apply to a job listing
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  if (!userId || userId === "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check pro status
  const isPro = await isProUser(userId);
  if (!isPro) {
    return NextResponse.json({ error: "Pro subscription required for Quick Apply" }, { status: 403 });
  }

  const body = await request.json();
  const { listingId, coverNote } = body as { listingId?: string; coverNote?: string };

  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  // Verify the listing is a job
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, type: "job", ...activeListingWhere() },
    select: { type: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Can only apply to job listings" }, { status: 400 });
  }

  // Check if already applied
  const existing = await prisma.application.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already applied to this listing" }, { status: 409 });
  }

  // Get user's resume URL from profile
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { resumeUrl: true },
  });

  const application = await prisma.application.create({
    data: {
      userId,
      listingId,
      coverNote: coverNote || null,
      resumeUrl: profile?.resumeUrl || null,
    },
  });

  return NextResponse.json({ application }, { status: 201 });
}

// PATCH: Update application status
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  if (!userId || userId === "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { applicationId, status } = body as { applicationId?: string; status?: string };

  if (!applicationId || !status) {
    return NextResponse.json({ error: "applicationId and status required" }, { status: 400 });
  }

  const validStatuses = ["draft", "applied", "viewed", "interview", "offered", "rejected", "withdrawn"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const application = await prisma.application.updateMany({
    where: { id: applicationId, userId },
    data: { status: status as "draft" | "applied" | "viewed" | "interview" | "offered" | "rejected" | "withdrawn" },
  });

  if (application.count === 0) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
