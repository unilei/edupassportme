import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createMetadata } from "@/lib/metadata";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { DealCard } from "@/components/home/DealCard";
import { ListingCard } from "@/components/listing/ListingCard";
import { activeListingWhere } from "@/lib/listing-visibility";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createMetadata({
  title: "Education Deals & Discounts",
  description: "Find the best deals, discounts, and free trials on online courses, learning tools, and educational platforms.",
  path: "/deals",
});

export default async function DealsPage() {
  const [dealListings, legacyDeals] = await Promise.all([
    prisma.listing.findMany({
      where: {
        ...activeListingWhere(),
        type: "deal",
      },
      orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
      include: {
        provider: { select: { name: true, slug: true, logo: true } },
        category: { select: { name: true, slug: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
      },
    }),
    prisma.deal.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={[{ label: "Deals" }]} />
      <h1 className="text-3xl font-bold mb-2">Deals & Discounts</h1>
      <p className="text-muted-foreground mb-6">
        {(dealListings.length || legacyDeals.length).toLocaleString()} active deals on courses, tools, and learning platforms. Updated regularly.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dealListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
        {dealListings.length === 0 && legacyDeals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>

      {dealListings.length === 0 && legacyDeals.length === 0 && (
        <p className="text-center py-12 text-muted-foreground">No active deals right now. Check back soon!</p>
      )}
    </div>
  );
}
