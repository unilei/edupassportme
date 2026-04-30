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

function formatPriceLabel(price?: { min?: number; max?: number }): string | undefined {
  if (price?.min === undefined && price?.max === undefined) return undefined;
  if (price.min !== undefined && price.max !== undefined) return `$${price.min}-$${price.max}`;
  if (price.min !== undefined) return `$${price.min}`;
  return `$${price.max}`;
}

export class TicketmasterProvider extends BaseProvider {
  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  getMissingConfigReason(): string | null {
    return this.isConfigured() ? null : "TICKETMASTER_API_KEY is required";
  }

  async fetchListings(): Promise<RawListing[]> {
    const params = new URLSearchParams({
      apikey: this.config.apiKey || "",
      keyword: "education OR edtech OR learning",
      countryCode: "US",
      size: "50",
      sort: "date,asc",
    });
    const res = await this.fetchWithRetry(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
    const data = (await res.json()) as TicketmasterResponse;
    const now = new Date();

    return (data._embedded?.events ?? []).map((event) => {
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
        metadata: { source: "ticketmaster" },
        compliance: getProviderCompliance("ticketmaster"),
      };
    });
  }
}
