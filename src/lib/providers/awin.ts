import { BaseProvider } from "./base";
import { getProviderCompliance } from "./compliance";
import { canonicalizeUrl, normalizeText, parseOptionalDate } from "./normalization";
import type { RawListing } from "./types";

interface AwinPromotion {
  promotionId?: number | string;
  id?: number | string;
  type?: "promotion" | "voucher" | string;
  title?: string;
  description?: string;
  terms?: string;
  voucher?: { code?: string };
  advertiser?: { id?: number | string; name?: string; joined?: boolean };
  startDate?: string;
  endDate?: string;
  url?: string;
  regions?: AwinRegions;
}

interface AwinResponse {
  promotions?: AwinPromotion[];
}

type AwinRegionEntry = { countryCode?: string } | string;

type AwinRegions =
  | string[]
  | {
      all?: boolean;
      list?: AwinRegionEntry[];
    };

function getPromotionId(promotion: AwinPromotion): string {
  return String(promotion.promotionId ?? promotion.id ?? promotion.title ?? "unknown");
}

function getFirstCountryCode(regions?: AwinRegions): string | undefined {
  if (!regions) return undefined;
  const entries = Array.isArray(regions) ? regions : regions.list;
  for (const entry of entries ?? []) {
    if (typeof entry === "string" && entry) return entry;
    if (typeof entry === "object" && entry.countryCode) return entry.countryCode;
  }
  return undefined;
}

export class AwinOffersProvider extends BaseProvider {
  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.publisherId);
  }

  getMissingConfigReason(): string | null {
    return this.isConfigured() ? null : "AWIN_ACCESS_TOKEN and AWIN_PUBLISHER_ID are required";
  }

  async fetchListings(): Promise<RawListing[]> {
    const body = {
      filters: {
        membership: "joined",
        status: "active",
        type: "all",
      },
      pagination: { page: 1, pageSize: 100 },
    };

    const res = await this.fetchWithRetry(`https://api.awin.com/publisher/${this.config.publisherId}/promotions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as AwinResponse;
    const now = new Date();

    return (data.promotions ?? []).map((promotion) => {
      const startsAt = parseOptionalDate(promotion.startDate);
      const expiresAt = parseOptionalDate(promotion.endDate);
      const url = promotion.url || "https://www.awin.com";
      const title = promotion.title || promotion.description || "Awin promotion";

      return {
        externalId: `awin-${getPromotionId(promotion)}`,
        title: normalizeText(title, 180),
        type: "deal",
        description: normalizeText(promotion.description || promotion.terms || title),
        content: normalizeText(promotion.terms, 2000),
        url,
        canonicalUrl: canonicalizeUrl(url),
        companyName: promotion.advertiser?.name,
        couponCode: promotion.voucher?.code,
        discountText: title,
        startDate: startsAt,
        expiresAt,
        publishedAt: startsAt,
        sourceUpdatedAt: now,
        lastSeenAt: now,
        country: getFirstCountryCode(promotion.regions),
        categorySlug: "online-courses",
        tagSlugs: promotion.type === "voucher" ? ["paid"] : ["freemium"],
        metadata: {
          promotionType: promotion.type,
          advertiserId: promotion.advertiser?.id,
          joined: promotion.advertiser?.joined,
        },
        compliance: getProviderCompliance("awin"),
      };
    });
  }
}
