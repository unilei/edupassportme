import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeListingSubmissionInput } from "@/lib/marketplace/submissions";
import { rateLimit } from "@/lib/rate-limit";

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const id = user?.id as string | undefined;
  const role = user?.role as string | undefined;

  return id && id !== "admin" && role !== "admin" ? id : null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submissions = await prisma.listingSubmission.findMany({
    where: { submittedById: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      reviewNote: true,
      createdAt: true,
      publishedListing: { select: { slug: true } },
      organization: { select: { name: true, type: true } },
    },
  });

  return NextResponse.json({ submissions });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`marketplace-submissions:${userId}`, { limit: 10, window: 60 * 60 });
  if (!limited.success) {
    return NextResponse.json(
      { error: "Submission limit reached. Please try again later." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const normalized = normalizeListingSubmissionInput(body as Record<string, unknown>);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const data = normalized.data;
  const duplicate = await prisma.listingSubmission.findFirst({
    where: {
      submittedById: userId,
      url: data.url,
      status: { in: ["pending_review", "needs_changes", "published"] },
    },
    select: { id: true, status: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "You already submitted this opportunity." },
      { status: 409 },
    );
  }

  let organizationId: string | null = null;

  if (data.organizationName) {
    const existing = await prisma.organization.findFirst({
      where: {
        ownerId: userId,
        name: data.organizationName,
      },
      select: { id: true },
    });

    const organization =
      existing ??
      (await prisma.organization.create({
        data: {
          name: data.organizationName,
          type: data.organizationType,
          website: data.organizationWebsite ?? null,
          ownerId: userId,
        },
      }));
    organizationId = organization.id;
  }

  const submission = await prisma.listingSubmission.create({
    data: {
      submittedById: userId,
      organizationId,
      type: data.type,
      title: data.title,
      description: data.description,
      url: data.url,
      image: data.image ?? null,
      companyName: data.companyName ?? data.organizationName ?? null,
      location: data.location ?? null,
      country: data.country ?? null,
      region: data.region ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      expiresAt: data.expiresAt ?? null,
      priceLabel: data.priceLabel ?? null,
      couponCode: data.couponCode ?? null,
      metadata: { submittedFrom: "public_form" },
      status: "pending_review",
    },
    select: {
      id: true,
      status: true,
      title: true,
      type: true,
    },
  });

  return NextResponse.json({ submission }, { status: 201 });
}
