import { BaseProvider } from "./base";
import type { RawListing } from "./types";
import { canonicalizeUrl, normalizeText, parseOptionalDate } from "./normalization";

interface MicrosoftLearnCatalogItem {
  uid: string;
  title: string;
  summary?: string;
  url: string;
  duration_in_minutes?: number;
  levels?: string[];
  last_modified?: string;
  icon_url?: string;
  products?: string[];
  roles?: string[];
}

interface MicrosoftLearnCatalogResponse {
  modules?: MicrosoftLearnCatalogItem[];
  learningPaths?: MicrosoftLearnCatalogItem[];
}

const DEFAULT_LIMIT = 40;
const CATALOG_URL = "https://learn.microsoft.com/api/catalog/";

function formatDuration(minutes?: number): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

function formatLevel(levels?: string[]): string | undefined {
  const first = levels?.[0];
  if (!first) return undefined;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function inferCategory(item: MicrosoftLearnCatalogItem): string {
  const haystack = [
    item.title,
    item.summary,
    ...(item.products ?? []),
    ...(item.roles ?? []),
  ].join(" ").toLowerCase();

  if (/(ai|machine learning|data|python|developer|code|web|cloud|azure|security|devops)/.test(haystack)) {
    return "coding-tech";
  }
  if (/(teacher|education|school|classroom)/.test(haystack)) {
    return "teaching-lms";
  }
  if (/(business|career|analyst|administrator)/.test(haystack)) {
    return "professional-development";
  }
  return "online-courses";
}

function mapItem(item: MicrosoftLearnCatalogItem, kind: "module" | "learning-path"): RawListing {
  const updatedAt = parseOptionalDate(item.last_modified);
  const title = normalizeText(item.title, 160);
  const summary = normalizeText(item.summary || title);
  const duration = formatDuration(item.duration_in_minutes);

  return {
    externalId: `microsoft-learn-${kind}-${item.uid}`,
    title,
    type: "course",
    description: summary || `${title} on Microsoft Learn.`,
    url: item.url,
    canonicalUrl: canonicalizeUrl(item.url),
    image: item.icon_url,
    price: 0,
    priceLabel: "Free",
    duration,
    level: formatLevel(item.levels),
    language: "en",
    categorySlug: inferCategory(item),
    tagSlugs: ["free", "self-paced", "professional"],
    sourceUpdatedAt: updatedAt,
    publishedAt: updatedAt,
    lastSeenAt: new Date(),
    metadata: {
      source: "microsoft-learn",
      catalogKind: kind,
      products: item.products ?? [],
      roles: item.roles ?? [],
    },
  };
}

export class MicrosoftLearnProvider extends BaseProvider {
  async fetchListings(): Promise<RawListing[]> {
    const url = new URL(this.config.apiBaseUrl || CATALOG_URL);
    url.searchParams.set("type", "modules,learningPaths");
    url.searchParams.set("locale", "en-us");

    const res = await this.fetchWithRetry(url.toString());
    const data = (await res.json()) as MicrosoftLearnCatalogResponse;
    const modules = (data.modules ?? []).map((item) => mapItem(item, "module"));
    const learningPaths = (data.learningPaths ?? []).map((item) => mapItem(item, "learning-path"));

    return [...modules, ...learningPaths]
      .sort((a, b) => (b.sourceUpdatedAt?.getTime() ?? 0) - (a.sourceUpdatedAt?.getTime() ?? 0))
      .slice(0, DEFAULT_LIMIT);
  }
}
