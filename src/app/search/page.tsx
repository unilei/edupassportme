import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SearchInput } from "@/components/shared/SearchInput";
import { ListingCard } from "@/components/listing/ListingCard";
import { ListingFilters } from "@/components/listing/ListingFilters";
import { ItemPagination } from "@/components/shared/Pagination";

export const metadata: Metadata = {
  title: "Search",
  description: "Search for courses, jobs, events, and deals across all platforms.",
  robots: { index: false, follow: true },
};

const PER_PAGE = 12;

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    sort?: string;
    type?: string;
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

async function SearchResults({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const sort = params.sort || "relevance";
  const typeFilter = params.type || "";
  const providerSlug = params.provider || "";
  const level = params.level || "";
  const priceMax = params.priceMax || "";

  if (!query.trim()) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">
          Enter a search term to find courses, jobs, events, and deals.
        </p>
      </div>
    );
  }

  // Build where clause using Prisma contains (FTS raw query is in the API)
  const where: Record<string, unknown> = {
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  };
  if (typeFilter) where.type = typeFilter;
  if (providerSlug) where.provider = { slug: providerSlug };
  if (level) where.level = level;
  if (priceMax) where.price = { lte: parseFloat(priceMax) };

  const orderBy =
    sort === "newest"
      ? { createdAt: "desc" as const }
      : sort === "price"
        ? { price: "asc" as const }
        : sort === "rating"
          ? { rating: "desc" as const }
          : { rating: "desc" as const }; // relevance fallback

  const [total, listings, providerCounts, levelCounts, typeCounts] = await Promise.all([
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
      _count: true,
    }).then(async (groups) => {
      const providerIds = groups.map((g) => g.providerId);
      const providers = await prisma.provider.findMany({
        where: { id: { in: providerIds } },
        select: { id: true, name: true, slug: true },
      });
      return groups
        .map((g) => {
          const p = providers.find((pr) => pr.id === g.providerId);
          return { value: p?.slug ?? "", label: p?.name ?? "Unknown", count: g._count };
        })
        .filter((g) => g.value);
    }),
    prisma.listing.groupBy({
      by: ["level"],
      where: { level: { not: null } },
      _count: true,
    }).then((groups) =>
      groups.filter((g) => g.level).map((g) => ({ value: g.level!, label: g.level!, count: g._count }))
    ),
    prisma.listing.groupBy({
      by: ["type"],
      _count: true,
    }).then((groups) =>
      groups.map((g) => ({
        value: g.type,
        label: g.type.charAt(0).toUpperCase() + g.type.slice(1),
        count: g._count,
      }))
    ),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const sp: Record<string, string> = {};
  if (query) sp.q = query;
  if (sort !== "relevance") sp.sort = sort;
  if (typeFilter) sp.type = typeFilter;
  if (providerSlug) sp.provider = providerSlug;
  if (level) sp.level = level;
  if (priceMax) sp.priceMax = priceMax;

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">
        {total.toLocaleString()} {total === 1 ? "result" : "results"} for &ldquo;{query}&rdquo;
      </p>

      <ListingFilters
        basePath="/search"
        searchPlaceholder="Refine search..."
        providers={providerCounts}
        levels={levelCounts}
        showPriceFilter
        sortOptions={[
          { value: "relevance", label: "Relevance" },
          { value: "rating", label: "Top Rated" },
          { value: "price", label: "Lowest Price" },
          { value: "newest", label: "Newest" },
        ]}
      />

      {/* Type filter chips */}
      {typeCounts.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4 text-xs">
          <span className="text-muted-foreground mr-1 py-1">Type:</span>
          <a
            href={buildFilterUrl("/search", sp, { type: "" })}
            className={`px-2.5 py-1 rounded-full border transition-colors ${
              !typeFilter ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"
            }`}
          >
            All
          </a>
          {typeCounts.map((t) => (
            <a
              key={t.value}
              href={buildFilterUrl("/search", sp, { type: t.value })}
              className={`px-2.5 py-1 rounded-full border transition-colors ${
                typeFilter === t.value ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"
              }`}
            >
              {t.label} ({t.count})
            </a>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {listings.length === 0 && (
        <p className="text-center py-12 text-muted-foreground">No results found. Try different search terms.</p>
      )}

      <ItemPagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath="/search"
        searchParams={sp}
      />
    </>
  );
}

function buildFilterUrl(
  basePath: string,
  current: Record<string, string>,
  overrides: Record<string, string>,
) {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default function SearchPage(props: SearchPageProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={[{ label: "Search" }]} />
      <h1 className="text-3xl font-bold mb-2">Search</h1>
      <p className="text-muted-foreground mb-6">Find courses, jobs, events, and deals across all platforms.</p>
      <div className="max-w-xl mb-6">
        <SearchInput />
      </div>
      <Suspense
        fallback={
          <div className="py-16 text-center text-muted-foreground">
            Searching...
          </div>
        }
      >
        <SearchResults {...props} />
      </Suspense>
    </div>
  );
}
