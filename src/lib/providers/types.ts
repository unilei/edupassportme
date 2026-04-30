import type { ListingType } from "@/generated/prisma/enums";
import type { ProviderCompliance } from "./compliance";

export interface RawListing {
  externalId: string;
  title: string;
  type: ListingType;
  description: string;
  content?: string;
  url: string;
  canonicalUrl?: string;
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
  sourceUpdatedAt?: Date;
  publishedAt?: Date;
  lastSeenAt?: Date;
  companyName?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  couponCode?: string;
  discountText?: string;
  venueName?: string;
  country?: string;
  region?: string;
  categorySlug?: string;
  tagSlugs?: string[];
  metadata?: Record<string, unknown>;
  compliance?: ProviderCompliance;
}

export interface SyncResult {
  itemsFound: number;
  itemsAdded: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsExpired: number;
  errors: string[];
}

export interface ProviderConfig {
  slug: string;
  name: string;
  apiBaseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  appId?: string;
  userAgent?: string;
  publisherId?: string;
  rateLimit?: number;
}
