import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createMetadata } from "@/lib/metadata";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ListingCard } from "@/components/listing/ListingCard";
import { ItemPagination } from "@/components/shared/Pagination";

export const revalidate = 3600;
const PER_PAGE = 12;

export const metadata: Metadata = createMetadata({
  title: "Education Jobs",
  description: "Find teaching positions, curriculum developer roles, EdTech jobs, and more across top education employers.",
  path: "/jobs",
});

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

const listingInclude = {
  provider: { select: { name: true, slug: true, logo: true } },
  category: { select: { name: true, slug: true } },
  tags: { include: { tag: { select: { name: true, slug: true } } } },
} as const;

async function JobsContent({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q || "";
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));

  const where: Record<string, unknown> = { type: "job" as const, status: "active" };
  if (query.trim()) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PER_PAGE,
      take: PER_PAGE,
      include: listingInclude,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const sp: Record<string, string> = {};
  if (query) sp.q = query;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={[{ label: "Jobs" }]} />
      <h1 className="text-3xl font-bold mb-2">Education Jobs</h1>
      <p className="text-muted-foreground mb-6">
        Browse {total.toLocaleString()} education jobs from top employers and job boards.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {listings.length === 0 && (
        <p className="text-center py-12 text-muted-foreground">No jobs found.</p>
      )}

      <ItemPagination currentPage={currentPage} totalPages={totalPages} basePath="/jobs" searchParams={sp} />
    </div>
  );
}

export default function JobsPage(props: PageProps) {
  return (
    <Suspense fallback={<div className="py-24 text-center text-muted-foreground">Loading jobs...</div>}>
      <JobsContent {...props} />
    </Suspense>
  );
}
