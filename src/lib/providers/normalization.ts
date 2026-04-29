import type { ListingType } from "@/generated/prisma/enums";
import type { RawListing } from "./types";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
]);

export function normalizeText(value: string | null | undefined, maxLength = 500): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function canonicalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function parseOptionalDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function slugifyListingTitle(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
  return slug || "listing";
}

export function computeListingFingerprint(input: {
  type: ListingType;
  title: string;
  canonicalUrl?: string;
  providerName?: string;
  location?: string | null;
  startDate?: Date;
}): string {
  const normalizedUrl = input.canonicalUrl ? canonicalizeUrl(input.canonicalUrl) : "";
  const datePart = input.startDate ? input.startDate.toISOString().slice(0, 10) : "";
  return [
    input.type,
    normalizeText(input.title, 160).toLowerCase(),
    normalizedUrl.toLowerCase(),
    normalizeText(input.providerName, 120).toLowerCase(),
    normalizeText(input.location, 120).toLowerCase(),
    datePart,
  ].join("|");
}

export function scoreListingQuality(raw: Partial<RawListing>): number {
  let score = 0;
  if (raw.title && normalizeText(raw.title).length >= 8) score += 15;
  if (raw.description && normalizeText(raw.description).length >= 40) score += 20;
  if (raw.url) score += 15;
  if (raw.image) score += 8;
  if (raw.categorySlug) score += 8;
  if (raw.tagSlugs && raw.tagSlugs.length > 0) score += 8;
  if (raw.priceLabel || typeof raw.price === "number") score += 5;
  if (typeof raw.rating === "number" && raw.rating > 0) score += 7;
  if (raw.location || raw.type === "course" || raw.type === "deal") score += 4;
  if (raw.startDate || raw.publishedAt || raw.sourceUpdatedAt) score += 5;
  if (raw.expiresAt || raw.type === "course") score += 5;
  return Math.min(100, score);
}
