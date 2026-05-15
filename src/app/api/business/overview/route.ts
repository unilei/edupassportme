import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const inactiveApplicationStatuses = ["hired", "rejected", "withdrawn", "offer_declined", "position_closed"];

type SessionUser = Record<string, unknown>;

type OrganizationOverview = {
  id: string;
  name: string;
  type: string;
  status: string;
  plan?: string | null;
  verifiedAt?: Date | string | null;
  canPostJobs?: boolean | null;
  canPostEvents?: boolean | null;
  canPostDeals?: boolean | null;
  canSponsor?: boolean | null;
  jobPostLimit?: number | null;
  eventPostLimit?: number | null;
  dealPostLimit?: number | null;
  createdAt: Date | string;
  _count?: {
    submissions?: number;
    dealProgramApplications?: number;
  };
};

type ApplicationStatusCount = {
  status: string;
  _count: { status: number };
};

type FindManyDelegate<T> = (args: Record<string, unknown>) => Promise<T[]>;
type CountDelegate = (args: Record<string, unknown>) => Promise<number>;
type GroupByDelegate<T> = (args: Record<string, unknown>) => Promise<T[]>;

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

function emptyOverview() {
  return {
    organizations: [],
    counts: {
      organizations: 0,
      submissions: 0,
      publishedListings: 0,
      applications: 0,
      activeApplications: 0,
    },
    applicationStatusCounts: {},
  };
}

export async function GET() {
  const userId = getBusinessUserId(await getServerSession(authOptions));
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const organizationFindMany = prisma.organization.findMany as unknown as FindManyDelegate<OrganizationOverview>;
  const organizations = await organizationFindMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      plan: true,
      verifiedAt: true,
      canPostJobs: true,
      canPostEvents: true,
      canPostDeals: true,
      canSponsor: true,
      jobPostLimit: true,
      eventPostLimit: true,
      dealPostLimit: true,
      createdAt: true,
      _count: { select: { submissions: true, dealProgramApplications: true } },
    },
  });

  const organizationIds = organizations.map((organization) => organization.id);
  if (organizationIds.length === 0) {
    return NextResponse.json(emptyOverview());
  }

  const listingWhere = ownerListingWhere(organizationIds);
  const listingSubmissionCount = prisma.listingSubmission.count as unknown as CountDelegate;
  const listingCount = prisma.listing.count as unknown as CountDelegate;
  const applicationCount = prisma.application.count as unknown as CountDelegate;
  const applicationGroupBy = prisma.application.groupBy as unknown as GroupByDelegate<ApplicationStatusCount>;

  const [
    submissions,
    publishedListings,
    applications,
    activeApplications,
    applicationStatusGroups,
  ] = await Promise.all([
    listingSubmissionCount({ where: { organizationId: { in: organizationIds } } }),
    listingCount({ where: listingWhere }),
    applicationCount({ where: { listing: listingWhere } }),
    applicationCount({
      where: {
        status: { notIn: inactiveApplicationStatuses },
        listing: listingWhere,
      },
    }),
    applicationGroupBy({
      by: ["status"],
      where: { listing: listingWhere },
      _count: { status: true },
    }),
  ]);

  const applicationStatusCounts = Object.fromEntries(
    applicationStatusGroups.map((group) => [group.status, group._count.status]),
  );

  return NextResponse.json({
    organizations,
    counts: {
      organizations: organizations.length,
      submissions,
      publishedListings,
      applications,
      activeApplications,
    },
    applicationStatusCounts,
  });
}
