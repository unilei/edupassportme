import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, auditLog } from "@/lib/admin";
import { buildListingDataFromSubmission } from "@/lib/marketplace/publish-submission";
import { ListingSubmissionStatus } from "@/generated/prisma/enums";

const ACTIONS = ["approve", "reject", "needs_changes", "archive"] as const;

type SubmissionAction = (typeof ACTIONS)[number];

class AlreadyPublishedError extends Error {}
class StaleSubmissionStateError extends Error {}

function isAction(value: unknown): value is SubmissionAction {
  return typeof value === "string" && ACTIONS.includes(value as SubmissionAction);
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getAdminUserId(session: Awaited<ReturnType<typeof requireAdmin>>) {
  const userId = session?.user && "id" in session.user ? session.user.id : undefined;
  return typeof userId === "string" && userId.length > 0 && userId !== "admin" ? userId : null;
}

function normalizeReviewNote(value: unknown) {
  if (typeof value !== "string") return null;
  const note = value.trim();
  return note.length > 0 ? note : null;
}

function statusForAction(action: Exclude<SubmissionAction, "approve">) {
  if (action === "reject") return "rejected";
  if (action === "needs_changes") return "needs_changes";
  return "archived";
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 20);
  const status = url.searchParams.get("status") || "";
  const type = url.searchParams.get("type") || "";

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const [submissions, total] = await Promise.all([
    prisma.listingSubmission.findMany({
      where,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        url: true,
        organization: { select: { id: true, name: true, type: true, website: true } },
        submittedBy: { select: { id: true, name: true, email: true } },
        status: true,
        reviewNote: true,
        publishedListingId: true,
        publishedListing: { select: { id: true, title: true, slug: true } },
        createdAt: true,
        reviewedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.listingSubmission.count({ where }),
  ]);

  return NextResponse.json({
    submissions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function PATCH(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const { id, action } = body;

  if (typeof id !== "string" || id.length === 0 || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  if (!isAction(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const submission = await prisma.listingSubmission.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      url: true,
      image: true,
      companyName: true,
      location: true,
      country: true,
      region: true,
      startDate: true,
      endDate: true,
      expiresAt: true,
      priceLabel: true,
      couponCode: true,
      metadata: true,
      status: true,
      publishedListingId: true,
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const reviewedAt = new Date();
  const reviewedById = getAdminUserId(adminSession);
  const reviewNote = normalizeReviewNote(body.reviewNote);

  if (action === "approve") {
    if (submission.publishedListingId) {
      return NextResponse.json(
        { error: "Submission is already published" },
        { status: 409 },
      );
    }

    let listing;
    try {
      listing = await prisma.$transaction(async (tx) => {
        const claim = await tx.listingSubmission.updateMany({
          where: {
            id,
            publishedListingId: null,
            status: ListingSubmissionStatus.pending_review,
          },
          data: {
            status: "approved",
            reviewedAt,
            reviewedById,
            reviewNote,
          },
        });

        if (claim.count === 0) {
          throw new StaleSubmissionStateError("Submission state changed");
        }

        const provider = await tx.provider.upsert({
          where: { slug: "manual-submissions" },
          update: { isActive: true },
          create: {
            name: "Manual Submissions",
            slug: "manual-submissions",
            url: "https://edupassport.me",
            description: "EDU Passport reviewed public and partner submissions.",
            apiType: "manual",
            isActive: true,
          },
          select: { id: true },
        });

        const createdListing = await tx.listing.create({
          data: buildListingDataFromSubmission(submission, provider.id),
        });

        await tx.listingSubmission.update({
          where: { id },
          data: {
            status: "published",
            publishedListingId: createdListing.id,
            reviewedAt,
            reviewedById,
            reviewNote,
          },
        });

        return createdListing;
      });
    } catch (error) {
      if (error instanceof AlreadyPublishedError) {
        return NextResponse.json(
          { error: "Submission is already published" },
          { status: 409 },
        );
      }
      if (error instanceof StaleSubmissionStateError) {
        return NextResponse.json(
          { error: "Submission state changed. Reload and try again." },
          { status: 409 },
        );
      }
      throw error;
    }
    await auditLog("admin", "listingSubmission.approve", id, {
      title: submission.title,
      previousStatus: submission.status,
      publishedListingId: listing.id,
    });

    return NextResponse.json({ ok: true, listingId: listing.id });
  }

  const nextStatus = statusForAction(action);
  const transitionWhere =
    action === "archive"
      ? {
          id,
          publishedListingId: null,
          status: {
            in: [
              ListingSubmissionStatus.pending_review,
              ListingSubmissionStatus.needs_changes,
              ListingSubmissionStatus.rejected,
            ],
          },
        }
      : {
          id,
          publishedListingId: null,
          status: ListingSubmissionStatus.pending_review,
        };

  const result = await prisma.listingSubmission.updateMany({
    where: transitionWhere,
    data: {
      status: nextStatus,
      reviewNote,
      reviewedAt,
      reviewedById,
    },
  });
  if (result.count === 0) {
    return NextResponse.json(
      { error: "Submission state changed. Reload and try again." },
      { status: 409 },
    );
  }
  await auditLog("admin", `listingSubmission.${action}`, id, {
    title: submission.title,
    previousStatus: submission.status,
    reviewNote,
  });

  return NextResponse.json({ ok: true });
}
