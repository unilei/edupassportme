import { BaseProvider } from "./base";
import type { RawListing } from "./types";
import { canonicalizeUrl, normalizeText } from "./normalization";
import { getProviderCompliance } from "./compliance";

const SLICKDEALS_EDUCATION_URL = "https://slickdeals.net/deals/education/";
const DAY_MS = 24 * 60 * 60 * 1000;

function extractFirst(pattern: RegExp, value: string): string | undefined {
  return value.match(pattern)?.[1];
}

function parsePriceAmount(priceLabel?: string): number | undefined {
  const match = priceLabel?.match(/\$([\d,.]+)/);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : undefined;
}

function inferCategory(title: string, store?: string): string {
  const text = `${title} ${store ?? ""}`.toLowerCase();
  if (/(student|prime|microsoft|office|software|app|keyboard|calculator|note|ai|translation|laptop|computer|phone|smartphone|tablet)/.test(text)) {
    return "productivity";
  }
  if (/(book|reading|literacy)/.test(text)) {
    return "books-reading";
  }
  if (/(science|scientific|calculator|anatomy|stem|math)/.test(text)) {
    return "stem-science";
  }
  return "online-courses";
}

export class SlickdealsEducationProvider extends BaseProvider {
  async fetchListings(): Promise<RawListing[]> {
    const res = await this.fetchWithRetry(this.config.apiBaseUrl || SLICKDEALS_EDUCATION_URL, {
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    const html = await res.text();
    const cardRegex = /<li\b[^>]*bp-p-[^>]*DealCard[\s\S]*?<\/li>/gi;
    const listings: RawListing[] = [];
    const now = new Date();
    let match: RegExpExecArray | null;

    while ((match = cardRegex.exec(html)) !== null) {
      const card = match[0];
      const rawHref = extractFirst(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*bp-c-card_title[^"]*"[^>]*>/i, card);
      const rawTitle = extractFirst(/<a[^>]+class="[^"]*bp-c-card_title[^"]*"[^>]*>([\s\S]*?)<\/a>/i, card);
      const threadId = rawHref?.match(/\/f\/(\d+)/)?.[1];
      const title = normalizeText(rawTitle, 180);
      if (!rawHref || !threadId || !title) continue;

      const url = new URL(rawHref, "https://slickdeals.net").toString();
      const priceLabel = normalizeText(extractFirst(/bp-p-dealCard_price[^>]*>([\s\S]*?)<\/span>/i, card), 80) || undefined;
      const store = normalizeText(extractFirst(/bp-c-card_subtitle[^>]*>([\s\S]*?)<\/span>/i, card), 120) || undefined;
      const postedAt = Number(extractFirst(/data-posted-at="(\d+)"/i, card));
      const publishedAt = Number.isFinite(postedAt) ? new Date(postedAt * 1000) : now;

      listings.push({
        externalId: `slickdeals-${threadId}`,
        title,
        type: "deal",
        description: store ? `${title} from ${store}.` : title,
        url,
        canonicalUrl: canonicalizeUrl(url),
        price: parsePriceAmount(priceLabel),
        priceLabel,
        discountText: priceLabel,
        language: "en",
        categorySlug: inferCategory(title, store),
        tagSlugs: ["paid"],
        publishedAt,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + 30 * DAY_MS),
        metadata: {
          source: "slickdeals-education",
          store,
        },
        compliance: getProviderCompliance("slickdeals-education"),
      });
    }

    return listings.slice(0, 40);
  }
}
