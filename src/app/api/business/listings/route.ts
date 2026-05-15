import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = Record<string, unknown>;

type BusinessOrganization = {
  id: string;
  name: string;
  type: string;
  status: string;
  plan?: string | null;
};

type FindManyDelegate<T> = (args: Record<string, unknown>) => Promise<T[]>;

function getBusinessUserId(session: unknown) {
  const user = (session as { user?: SessionUser } | null | undefined)?.user;
  const id = typeof user?.id === "string" ? user.id : undefined;
  const role = typeof user?.role === "string" ? user.role : undefined;

  return id && id !== "admin" && role !== "admin" ? id : null;
}

function ownerListingWhere(organizationIds: string[]) {
  return {
    OR: [
      { organizationId: { in: organizationIds } },
      { sourceSubmission: { organizationId: { in: organizationIds } } },
    ],
  };
}

export async function GET() {
  const userId = getBusinessUserId(await getServerSession(authOptions));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const organizationFindMany = prisma.organization.findMany as unknown as FindManyDelegate<BusinessOrganization>;
  const organizations = await organizationFindMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      plan: true,
    },
  });
  const organizationIds = organizations.map((organization) => organization.id);

  if (organizationIds.length === 0) {
    return NextResponse.json({ organizations: [], submissions: [], listings: [] });
  }

  const listingSubmissionFindMany = prisma.listingSubmission.findMany as unknown as FindManyDelegate<unknown>;
  const listingFindMany = prisma.listing.findMany as unknown as FindManyDelegate<unknown>;
  const [submissions, listings] = await Promise.all([
    listingSubmissionFindMany({
      where: { organizationId: { in: organizationIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        reviewNote: true,
        url: true,
        location: true,
        companyName: true,
        createdAt: true,
        updatedAt: true,
        publishedListing: { select: { id: true, slug: true, status: true } },
        organization: { select: { id: true, name: true, type: true } },
      },
    }),
    listingFindMany({
      where: ownerListingWhere(organizationIds),
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        status: true,
        url: true,
        location: true,
        companyName: true,
        viewCount: true,
        clickCount: true,
        publishedAt: true,
        updatedAt: true,
        organization: { select: { id: true, name: true, type: true } },
        sourceSubmission: {
          select: {
            id: true,
            status: true,
            organization: { select: { id: true, name: true, type: true } },
          },
        },
        _count: { select: { applications: true, savedBy: true } },
      },
    }),
  ]);

  return NextResponse.json({ organizations, submissions, listings });
}
