"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import type { ListingType } from "@/generated/prisma/enums";
import { ListingCard } from "./ListingCard";

interface SponsoredListing {
  id: string;
  label: string;
  position: string;
  listing: {
    id: string;
    slug: string;
    title: string;
    type: string;
    description: string;
    url: string;
    image: string | null;
    price: number | null;
    priceLabel: string | null;
    rating: number | null;
    reviewCount: number | null;
    duration: string | null;
    level: string | null;
    location: string | null;
    provider: { name: string; slug: string; logo: string | null };
    category: { name: string; slug: string } | null;
  };
}

interface SponsoredCardProps {
  position: "hero" | "feed" | "sidebar";
  limit?: number;
  className?: string;
}

export function SponsoredCard({ position, limit = 1, className = "" }: SponsoredCardProps) {
  const [items, setItems] = useState<SponsoredListing[]>([]);

  useEffect(() => {
    fetch(`/api/sponsored?position=${position}&limit=${limit}`)
      .then((r) => r.json())
      .then((data) => setItems(data.sponsored || []))
      .catch(() => {});
  }, [position, limit]);

  if (items.length === 0) return null;

  return (
    <div className={className}>
      {items.map((s) => (
        <div key={s.id} className="relative">
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded-full">
            <Megaphone className="h-3 w-3" />
            {s.label}
          </div>
          <ListingCard
            listing={{
              id: s.listing.id,
              slug: s.listing.slug,
              title: s.listing.title,
              type: s.listing.type as ListingType,
              description: s.listing.description,
              url: s.listing.url,
              image: s.listing.image,
              price: s.listing.price,
              priceLabel: s.listing.priceLabel,
              rating: s.listing.rating,
              reviewCount: s.listing.reviewCount,
              duration: s.listing.duration,
              level: s.listing.level,
              location: s.listing.location,
              provider: s.listing.provider,
              category: s.listing.category,
            }}
          />
        </div>
      ))}
    </div>
  );
}
