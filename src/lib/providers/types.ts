import type { ListingType } from "@/generated/prisma/enums";

export interface RawListing {
  externalId: string;
  title: string;
  type: ListingType;
  description: string;
  content?: string;
  url: string;
  image?: string;
  price?: number;
  currency?: string;
  priceLabel?: string;
  rating?: number;
  reviewCount?: number;
  duration?: string;
  level?: string;
  language?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  expiresAt?: Date;
  categorySlug?: string;
  tagSlugs?: string[];
}

export interface SyncResult {
  itemsFound: number;
  itemsAdded: number;
  itemsUpdated: number;
  errors: string[];
}

export interface ProviderConfig {
  slug: string;
  name: string;
  apiBaseUrl?: string;
  apiKey?: string;
  rateLimit?: number; // requests per minute
}
