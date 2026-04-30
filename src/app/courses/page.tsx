import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createMetadata } from "@/lib/metadata";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ListingCard } from "@/components/listing/ListingCard";
import { ListingFilters } from "@/components/listing/ListingFilters";
import { ItemPagination } from "@/components/shared/Pagination";
import { activeListingWhere } from "@/lib/listing-visibility";

export const revalidate = 3600;
const PER_PAGE = 12;

export const metadata: Metadata = createMetadata({
  title: "Online Courses",
  description: "Compare online courses from Coursera, Udemy, edX, and more. Find the best courses for your learning goals.",
  path: "/courses",
});

interface PageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    provider?: string;
    level?: string;
    priceMax?: string;
  }>;
}

const listingInclude = {
  provider: { select: { name: true, slug: true, logo: true } },
  category: { select: { name: true, slug: true } },
  tags: { include: { tag: { select: { name: true, slug: true } } } },
} as const;

async function CoursesContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const sort = params.sort || "rating";
  const providerSlug = params.provider || "";
  const level = params.level || "";
  const priceMax = params.priceMax || "";

  const activeCourseWhere = {
    ...activeListingWhere(),
    type: "course" as const,
  };
  const where: Record<string, unknown> = { ...activeCourseWhere };
  if (query.trim()) {
    where.AND = [
      ...activeCourseWhere.AND,
      {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
    ];
  }
  if (providerSlug) {
    where.provider = { slug: providerSlug };
  }
  if (level) {
    where.level = level;
  }
  if (priceMax) {
    where.price = { lte: parseFloat(priceMax) };
  }

  const orderBy = sort === "newest"
    ? { createdAt: "desc" as const }
    : sort === "price"
      ? { price: "asc" as const }
      : sort === "reviews"
        ? { reviewCount: "desc" as const }
        : { rating: "desc" as const };

  // Fetch data + filter options in parallel
  const [total, listings, providerCounts, levelCounts] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy,
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
      include: listingInclude,
    }),
    prisma.listing.groupBy({
      by: ["providerId"],
      where: activeCourseWhere,
      _count: true,
    }).then(async (groups) => {
      const providerIds = groups.map((g) => g.providerId);
      const providers = await prisma.provider.findMany({
        where: { id: { in: providerIds } },
        select: { id: true, name: true, slug: true },
      });
      return groups.map((g) => {
        const p = providers.find((pr) => pr.id === g.providerId);
        return { value: p?.slug ?? "", label: p?.name ?? "Unknown", count: g._count };
      }).filter((g) => g.value);
    }),
    prisma.listing.groupBy({
      by: ["level"],
      where: { ...activeCourseWhere, level: { not: null } },
      _count: true,
    }).then((groups) =>
      groups.filter((g) => g.level).map((g) => ({ value: g.level!, label: g.level!, count: g._count }))
    ),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const sp: Record<string, string> = {};
  if (query) sp.q = query;
  if (sort !== "rating") sp.sort = sort;
  if (providerSlug) sp.provider = providerSlug;
  if (level) sp.level = level;
  if (priceMax) sp.priceMax = priceMax;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={[{ label: "Courses" }]} />
      <h1 className="text-3xl font-bold mb-2">Online Courses</h1>
      <p className="text-muted-foreground mb-4">
        Compare {total.toLocaleString()} courses from top platforms. Find the perfect course for your goals.
      </p>

      <ListingFilters
        basePath="/courses"
        searchPlaceholder="Search courses, certifications, programs..."
        providers={providerCounts}
        levels={levelCounts}
        showPriceFilter
        sortOptions={[
          { value: "rating", label: "Top Rated" },
          { value: "reviews", label: "Most Reviewed" },
          { value: "price", label: "Lowest Price" },
          { value: "newest", label: "Newest" },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {listings.length === 0 && (
        <p className="text-center py-12 text-muted-foreground">No courses found matching your filters.</p>
      )}

      <ItemPagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath="/courses"
        searchParams={sp}
      />
    </div>
  );
}

export default function CoursesPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="py-24 text-center text-muted-foreground">Loading courses...</div>}>
      <CoursesContent {...props} />
    </Suspense>
  );
}
