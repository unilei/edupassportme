import Link from "next/link";
import { Star, Clock, MapPin, Tag, ArrowUpRight } from "lucide-react";
import { OptimizedImage } from "@/components/shared/OptimizedImage";
import type { ListingType } from "@/generated/prisma/enums";
import { SaveButtonWrapper } from "./SaveButtonWrapper";
import { QuickApplyWrapper } from "./QuickApplyWrapper";

interface ListingCardProps {
  listing: {
    id: string;
    slug: string;
    title: string;
    type: ListingType;
    description: string;
    url: string;
    image?: string | null;
    price?: number | null;
    priceLabel?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    duration?: string | null;
    level?: string | null;
    location?: string | null;
    provider: { name: string; slug: string; logo?: string | null };
    category?: { name: string; slug: string } | null;
    tags?: { tag: { name: string; slug: string } }[];
  };
}

const typeColors: Record<ListingType, string> = {
  course: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  job: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  event: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  deal: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
};

const typeDotColors: Record<ListingType, string> = {
  course: "bg-blue-500",
  job: "bg-emerald-500",
  event: "bg-purple-500",
  deal: "bg-orange-500",
};

export function ListingCard({ listing }: ListingCardProps) {
  const detailHref = `/listing/${listing.slug}`;

  return (
    <article className="group relative rounded-xl border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:border-primary/20 hover:-translate-y-0.5">
      {/* Subtle top accent */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${typeDotColors[listing.type]} opacity-0 group-hover:opacity-100 transition-opacity`} />

      <div className="p-5">
        {/* Header: provider logo + title + type badge */}
        <div className="flex items-start gap-3 mb-3">
          {listing.provider.logo && (
            <div className="relative shrink-0">
              <OptimizedImage
                src={listing.provider.logo}
                alt={`${listing.provider.name} logo`}
                width={36}
                height={36}
                className="rounded-lg ring-1 ring-border"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <Link
                href={detailHref}
                className="font-semibold text-sm leading-tight hover:text-primary transition-colors line-clamp-2 flex-1"
              >
                {listing.title}
              </Link>
              <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border ${typeColors[listing.type]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${typeDotColors[listing.type]}`} />
                {listing.type}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">{listing.provider.name}</span>
              {listing.category && (
                <>
                  <span className="text-border">|</span>
                  <Link href={`/category/${listing.category.slug}`} className="hover:text-primary transition-colors">
                    {listing.category.name}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <Link href={detailHref}>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
            {listing.description}
          </p>
        </Link>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground mb-4">
          {listing.rating && (
            <span className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-950/30 px-2 py-1 rounded-md">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-yellow-700 dark:text-yellow-300">{listing.rating.toFixed(1)}</span>
              {listing.reviewCount && (
                <span className="text-yellow-600/60 dark:text-yellow-400/60">({listing.reviewCount.toLocaleString()})</span>
              )}
            </span>
          )}
          {listing.duration && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground/60" />
              {listing.duration}
            </span>
          )}
          {listing.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-muted-foreground/60" />
              {listing.location}
            </span>
          )}
          {listing.level && (
            <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-md">
              <Tag className="h-3 w-3" />
              {listing.level}
            </span>
          )}
        </div>

        {/* Footer: price + CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-dashed">
          <span className="font-bold text-base text-primary">
            {listing.priceLabel || (listing.price === 0 || listing.price === null ? "Free" : `$${listing.price}`)}
          </span>
          <div className="flex items-center gap-3">
            <Link
              href={detailHref}
              className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Details
            </Link>
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors group/link"
            >
              Visit
              <ArrowUpRight className="h-3 w-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
            </a>
            <QuickApplyWrapper listingId={listing.id} listingType={listing.type} />
            <SaveButtonWrapper listingId={listing.id} />
          </div>
        </div>
      </div>
    </article>
  );
}
