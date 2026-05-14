import { BaseProvider } from "./base";
import { getProviderCompliance } from "./compliance";
import { canonicalizeUrl, normalizeText, parseOptionalDate } from "./normalization";
import type { RawListing } from "./types";

interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  info?: string;
  description?: string;
  images?: Array<{ url: string; width?: number }>;
  classifications?: Array<{
    segment?: { name?: string };
    genre?: { name?: string };
    subGenre?: { name?: string };
    type?: { name?: string };
    subType?: { name?: string };
  }>;
  dates?: { start?: { dateTime?: string; localDate?: string } };
  priceRanges?: Array<{ min?: number; max?: number; currency?: string }>;
  _embedded?: {
    venues?: Array<{
      name?: string;
      city?: { name?: string };
      state?: { stateCode?: string };
      country?: { countryCode?: string };
    }>;
  };
}

interface TicketmasterResponse {
  _embedded?: { events?: TicketmasterEvent[] };
}

const SEARCH_TERMS = [
  "education",
  "student",
  "workshop",
  "conference",
] as const;

const MAX_EVENTS_PER_TITLE = 3;

const EDUCATION_RELEVANCE_PATTERNS = [
  /\beducation\b/i,
  /\beducator(s)?\b/i,
  /\bstudent(s)?\b/i,
  /\bschool(s)?\b/i,
  /\bteacher(s)?\b/i,
  /\bworkshop(s)?\b/i,
  /\bconference(s)?\b/i,
  /\bseminar(s)?\b/i,
  /\blecture(s)?\b/i,
  /\btraining\b/i,
  /\bcareer\b/i,
  /\bcollege\b/i,
  /\buniversity\b/i,
  /\bclass(es)?\b/i,
  /\blearning\b/i,
  /\bacadem(y|ic)\b/i,
  /\bscience\b/i,
  /\btechnology\b/i,
] as const;

const EXCLUDED_TITLE_PATTERNS = [
  /ticket\s*\+\s*hotel deals/i,
  /\bstudent('s)?\b.*\b(concert|recital|showcase)\b/i,
] as const;

const EXCLUDED_SEGMENTS = new Set(["Sports"]);

function formatPriceLabel(price?: { min?: number; max?: number }): string | undefined {
  if (price?.min === undefined && price?.max === undefined) return undefined;
  if (price.min !== undefined && price.max !== undefined) return `$${price.min}-$${price.max}`;
  if (price.min !== undefined) return `$${price.min}`;
  return `$${price.max}`;
}

function buildSearchText(event: TicketmasterEvent): string {
  return [
    event.name,
    event.info,
    event.description,
  ].filter(Boolean).join(" ");
}

function isRelevantEducationEvent(event: TicketmasterEvent): boolean {
  if (EXCLUDED_TITLE_PATTERNS.some((pattern) => pattern.test(event.name))) return false;

  const segments = event.classifications
    ?.map((classification) => classification.segment?.name)
    .filter((segment): segment is string => Boolean(segment)) ?? [];
  if (segments.some((segment) => EXCLUDED_SEGMENTS.has(segment))) return false;

  const searchText = buildSearchText(event);
  return EDUCATION_RELEVANCE_PATTERNS.some((pattern) => pattern.test(searchText));
}

function getTitleKey(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

export class TicketmasterProvider extends BaseProvider {
  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  getMissingConfigReason(): string | null {
    return this.isConfigured() ? null : "TICKETMASTER_API_KEY is required";
  }

  async fetchListings(): Promise<RawListing[]> {
    const events = new Map<string, { event: TicketmasterEvent; searchTerm: string }>();

    for (const searchTerm of SEARCH_TERMS) {
      const params = new URLSearchParams({
        apikey: this.config.apiKey || "",
        keyword: searchTerm,
        countryCode: "US",
        size: "25",
        sort: "date,asc",
      });
      const res = await this.fetchWithRetry(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
      const data = (await res.json()) as TicketmasterResponse;

      for (const event of data._embedded?.events ?? []) {
        if (events.has(event.id)) continue;
        if (!isRelevantEducationEvent(event)) continue;
        events.set(event.id, { event, searchTerm });
      }
    }

    const now = new Date();

    const titleCounts = new Map<string, number>();
    const uniqueEvents = [...events.values()].sort((a, b) => {
      const aDate = parseOptionalDate(a.event.dates?.start?.dateTime || a.event.dates?.start?.localDate)?.getTime();
      const bDate = parseOptionalDate(b.event.dates?.start?.dateTime || b.event.dates?.start?.localDate)?.getTime();
      return (aDate ?? Number.MAX_SAFE_INTEGER) - (bDate ?? Number.MAX_SAFE_INTEGER);
    }).filter(({ event }) => {
      const titleKey = getTitleKey(event.name);
      const count = titleCounts.get(titleKey) ?? 0;
      if (count >= MAX_EVENTS_PER_TITLE) return false;
      titleCounts.set(titleKey, count + 1);
      return true;
    });

    return uniqueEvents.map(({ event, searchTerm }) => {
      const venue = event._embedded?.venues?.[0];
      const startDate = parseOptionalDate(event.dates?.start?.dateTime || event.dates?.start?.localDate);
      const price = event.priceRanges?.[0];
      const image = [...(event.images ?? [])].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url;

      return {
        externalId: `ticketmaster-${event.id}`,
        title: normalizeText(event.name, 180),
        type: "event",
        description: normalizeText(event.info || event.description || event.name),
        url: event.url,
        canonicalUrl: canonicalizeUrl(event.url),
        image,
        price: price?.min,
        currency: price?.currency || "USD",
        priceLabel: formatPriceLabel(price),
        location: [venue?.city?.name, venue?.state?.stateCode, venue?.country?.countryCode].filter(Boolean).join(", "),
        venueName: venue?.name,
        startDate,
        endDate: startDate,
        expiresAt: startDate,
        publishedAt: now,
        sourceUpdatedAt: now,
        lastSeenAt: now,
        country: venue?.country?.countryCode,
        region: venue?.state?.stateCode,
        categorySlug: "community-forums",
        tagSlugs: ["community", "professional"],
        metadata: { source: "ticketmaster", searchTerm },
        compliance: getProviderCompliance("ticketmaster"),
      };
    });
  }
}
