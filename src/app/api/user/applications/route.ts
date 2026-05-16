import { NextRequest, NextResponse } from "next/server";
import { isAuthError, requireIndividualUser } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { isProUser } from "@/lib/pro";
import { activeListingWhere } from "@/lib/listing-visibility";
import type { Prisma } from "@/generated/prisma/client";

const userEditableApplicationStatuses = [
  "draft",
  "applied",
  "under_review",
  "shortlisted",
  "screening",
  "interview_scheduled",
  "interviewing",
  "decision_pending",
  "offer_accepted",
  "rejected",
  "offer_declined",
  "withdrawn",
] as const;

const optionalApplicationStringFields = [
  "interviewTimezone",
  "meetingUrl",
  "candidateNote",
] as const;

const employerManagedApplicationFields = [
  "employerNote",
  "offerLetterUrl",
  "contractUrl",
] as const;

type ApplicationPatchBody = {
  applicationId?: unknown;
  status?: unknown;
  interviewAt?: unknown;
} & Partial<Record<(typeof optionalApplicationStringFields)[number], unknown>>;

function hasOwn<T extends string>(body: ApplicationPatchBody, field: T) {
  return Object.prototype.hasOwnProperty.call(body, field);
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// GET: List user's applications
export async function GET() {
  const user = await requireIndividualUser();
  if (isAuthError(user)) return user;
  const userId = user.userId;

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
  const user = await requireIndividualUser();
  if (isAuthError(user)) return user;
  const userId = user.userId;

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
  const user = await requireIndividualUser();
  if (isAuthError(user)) return user;
  const userId = user.userId;

  const body = await request.json() as ApplicationPatchBody;
  const applicationId = typeof body.applicationId === "string" ? body.applicationId : undefined;
  const status = typeof body.status === "string" ? body.status : undefined;

  if (!applicationId || !status) {
    return NextResponse.json({ error: "applicationId and status required" }, { status: 400 });
  }

  if (!userEditableApplicationStatuses.includes(status as (typeof userEditableApplicationStatuses)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  for (const field of employerManagedApplicationFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      return NextResponse.json(
        { error: `${field} is managed by EDU Passport or the employer` },
        { status: 400 },
      );
    }
  }

  const updateData: Record<string, string | Date | null> = { status };

  for (const field of optionalApplicationStringFields) {
    if (hasOwn(body, field)) {
      updateData[field] = normalizeOptionalString(body[field]);
    }
  }

  if (hasOwn(body, "interviewAt")) {
    const value = body.interviewAt;
    if (typeof value === "string" && value.trim()) {
      const interviewAt = new Date(value);
      if (Number.isNaN(interviewAt.getTime())) {
        return NextResponse.json({ error: "Invalid interviewAt" }, { status: 400 });
      }
      updateData.interviewAt = interviewAt;
    } else {
      updateData.interviewAt = null;
    }
  }

  if (status === "withdrawn") {
    updateData.withdrawnAt = new Date();
  }

  const application = await prisma.application.updateMany({
    where: { id: applicationId, userId },
    data: updateData as unknown as Prisma.ApplicationUpdateManyMutationInput,
  });

  if (application.count === 0) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
