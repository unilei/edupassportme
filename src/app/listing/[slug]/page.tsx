import { notFound } from "next/navigation";
import Link from "next/link";
import { OptimizedImage } from "@/components/shared/OptimizedImage";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createMetadata, jsonLdCourse, jsonLdJobPosting, jsonLdEvent } from "@/lib/metadata";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ListingCard } from "@/components/listing/ListingCard";
import { ExternalLink, Star, Clock, MapPin, Tag, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReviewSectionWrapper } from "@/components/listing/ReviewSectionWrapper";
import { ShareButton } from "@/components/listing/ShareButton";
import { AiSummaryButton } from "@/components/ai/AiSummaryButton";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const listings = await prisma.listing.findMany({ select: { slug: true } });
  return listings.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await prisma.listing.findUnique({ where: { slug } });
  if (!listing) return {};
  return createMetadata({
    title: listing.title,
    description: listing.description,
    path: `/listing/${listing.slug}`,
  });
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const listing = await prisma.listing.findUnique({
    where: { slug },
    include: {
      provider: true,
      category: true,
      tags: { include: { tag: true } },
      offers: {
        include: { provider: true },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!listing) notFound();

  // Related listings (same type + category)
  const related = await prisma.listing.findMany({
    where: {
      type: listing.type,
      categoryId: listing.categoryId,
      id: { not: listing.id },
    },
    take: 3,
    orderBy: { rating: "desc" },
    include: {
      provider: { select: { name: true, slug: true, logo: true } },
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true, slug: true } } } },
    },
  });

  const breadcrumbs = [
    { label: listing.type.charAt(0).toUpperCase() + listing.type.slice(1) + "s", href: `/${listing.type}s` },
    ...(listing.category
      ? [{ label: listing.category.name, href: `/category/${listing.category.slug}` }]
      : []),
    { label: listing.title },
  ];

  const typeLabel = listing.type.charAt(0).toUpperCase() + listing.type.slice(1);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={breadcrumbs} />

      <article className="mt-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          {listing.provider.logo && (
            <OptimizedImage
              src={listing.provider.logo}
              alt={`${listing.provider.name} logo`}
              width={48}
              height={48}
              className="rounded-lg shrink-0"
            />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold">{listing.title}</h1>
              <Badge variant="outline" className="uppercase text-xs">
                {typeLabel}
              </Badge>
              <ShareButton title={listing.title} slug={listing.slug} description={listing.description} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>by {listing.provider.name}</span>
              {listing.category && (
                <>
                  <span>·</span>
                  <Link href={`/category/${listing.category.slug}`} className="hover:text-primary">
                    {listing.category.name}
                  </Link>
                </>
              )}
              {listing.rating && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {listing.rating.toFixed(1)}
                    {listing.reviewCount && ` (${listing.reviewCount.toLocaleString()} reviews)`}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {listing.duration && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" /> {listing.duration}
            </Badge>
          )}
          {listing.level && (
            <Badge variant="secondary" className="gap-1">
              <Tag className="h-3 w-3" /> {listing.level}
            </Badge>
          )}
          {listing.location && (
            <Badge variant="secondary" className="gap-1">
              <MapPin className="h-3 w-3" /> {listing.location}
            </Badge>
          )}
          {listing.startDate && (
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(listing.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {listing.endDate && ` — ${new Date(listing.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-muted-foreground mb-6 max-w-3xl leading-relaxed">
          {listing.description}
        </p>
        {listing.content && (
          <div className="prose prose-sm dark:prose-invert max-w-3xl mb-8">
            {listing.content}
          </div>
        )}

        {/* AI Summary */}
        <div className="mb-8">
          <AiSummaryButton slug={listing.slug} />
        </div>

        {/* Price comparison table (Trivago-style) */}
        {listing.offers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-3">Compare Prices</h2>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Provider</th>
                    <th className="text-left px-4 py-3 font-medium">Price</th>
                    <th className="text-right px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.offers.map((offer, i) => (
                    <tr key={offer.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {offer.provider.logo && (
                            <OptimizedImage
                              src={offer.provider.logo}
                              alt={offer.provider.name}
                              width={20}
                              height={20}
                              className="rounded"
                            />
                          )}
                          <span className="font-medium">{offer.provider.name}</span>
                          {!offer.isAvailable && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0">Unavailable</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        {offer.priceLabel || (offer.price === 0 || offer.price === null ? "Free" : `$${offer.price}`)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={offer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
                        >
                          Go to site <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Direct link if no offers */}
        {listing.offers.length === 0 && (
          <div className="mb-8">
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Visit {listing.provider.name} <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Tags */}
        {listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {listing.tags.map(({ tag }) => (
              <Link key={tag.slug} href={`/tag/${tag.slug}`}>
                <Badge variant="secondary" className="hover:bg-secondary/80 cursor-pointer">
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </article>

      {/* Reviews */}
      <ReviewSectionWrapper slug={listing.slug} />

      {/* JSON-LD Structured Data */}
      {listing.type === "course" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdCourse({
              title: listing.title,
              description: listing.description,
              url: listing.url,
              slug: listing.slug,
              provider: listing.provider.name,
              rating: listing.rating,
              reviewCount: listing.reviewCount,
              price: listing.price,
              duration: listing.duration,
              level: listing.level,
              image: listing.image,
            })),
          }}
        />
      )}
      {listing.type === "job" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdJobPosting({
              title: listing.title,
              description: listing.description,
              url: listing.url,
              slug: listing.slug,
              provider: listing.provider.name,
              location: listing.location,
              priceLabel: listing.priceLabel,
              createdAt: listing.createdAt,
            })),
          }}
        />
      )}
      {listing.type === "event" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdEvent({
              title: listing.title,
              description: listing.description,
              url: listing.url,
              slug: listing.slug,
              location: listing.location,
              startDate: listing.startDate,
              endDate: listing.endDate,
              price: listing.price,
              priceLabel: listing.priceLabel,
            })),
          }}
        />
      )}

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12 pt-8 border-t">
          <h2 className="text-lg font-bold mb-4">Related {typeLabel}s</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {related.map((r) => (
              <ListingCard key={r.id} listing={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
