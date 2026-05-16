import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  evaluateSubmissionQuota,
  getMarketplacePlanDefaults,
  getOrganizationTypePermission,
} from "@/lib/marketplace/permissions";
import { normalizeListingSubmissionInput } from "@/lib/marketplace/submissions";
import { rateLimit } from "@/lib/rate-limit";
import {
  canSubmitOpportunities,
  getSessionAccountType,
  type AccountType,
} from "@/lib/account-types";

type MarketplaceSessionUser = {
  id: string;
  accountType: AccountType;
};

async function getMarketplaceSessionUser(): Promise<MarketplaceSessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as Record<string, unknown> | undefined;
  const id = user?.id as string | undefined;
  const role = user?.role as string | undefined;

  if (!id || id === "admin" || role === "admin") return null;
  return { id, accountType: getSessionAccountType(user) };
}

export async function GET() {
  const user = await getMarketplaceSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submissions = await prisma.listingSubmission.findMany({
    where: { submittedById: user.id },
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
  const user = await getMarketplaceSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!canSubmitOpportunities(user.accountType)) {
    const error = user.accountType === "partner"
      ? "Use the Deal Program workflow for partner offers."
      : "Use an organization account to submit marketplace opportunities.";
    return NextResponse.json({ error }, { status: 403 });
  }

  const limited = rateLimit(`marketplace-submissions:${user.id}`, { limit: 10, window: 60 * 60 });
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
      submittedById: user.id,
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

  if (data.type === "deal" && !data.organizationName) {
    return NextResponse.json(
      { error: "Organization name is required for deal submissions." },
      { status: 400 },
    );
  }

  let organizationId: string | null = null;

  if (data.organizationName) {
    const organizationSelect = {
      id: true,
      status: true,
      plan: true,
      canPostJobs: true,
      canPostEvents: true,
      canPostDeals: true,
      canSponsor: true,
      jobPostLimit: true,
      eventPostLimit: true,
      dealPostLimit: true,
      sponsoredLimit: true,
    } as const;

    const existing = await prisma.organization.findFirst({
      where: {
        ownerId: user.id,
        name: data.organizationName,
      },
      select: organizationSelect,
    });

    if (!existing) {
      const permission = getOrganizationTypePermission(getMarketplacePlanDefaults("free"), data.type);
      if (!permission.allowed) {
        return NextResponse.json({ error: permission.reason }, { status: 403 });
      }
    }

    const organization =
      existing ??
      (await prisma.organization.create({
        data: {
          name: data.organizationName,
          type: data.organizationType,
          website: data.organizationWebsite ?? null,
          ownerId: user.id,
        },
        select: organizationSelect,
      }));

    const permission = getOrganizationTypePermission(organization, data.type);
    if (!permission.allowed) {
      return NextResponse.json({ error: permission.reason }, { status: 403 });
    }

    const activeSubmissionCount = await prisma.listingSubmission.count({
      where: {
        organizationId: organization.id,
        type: data.type,
        status: { in: ["pending_review", "needs_changes", "approved", "published"] },
      },
    });
    const quota = evaluateSubmissionQuota(organization, data.type, activeSubmissionCount);
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.reason }, { status: 403 });
    }

    organizationId = organization.id;
  }

  const submission = await prisma.listingSubmission.create({
    data: {
      submittedById: user.id,
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
