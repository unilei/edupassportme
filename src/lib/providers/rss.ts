import { BaseProvider } from "./base";
import type { RawListing } from "./types";
import type { ListingType } from "@/generated/prisma/enums";
import { canonicalizeUrl, normalizeText, parseOptionalDate } from "./normalization";

interface RssProviderOptions {
  feedUrl: string;
  listingType: ListingType;
  categorySlug?: string;
  tagSlugs?: string[];
}

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  guid?: string;
  category?: string[];
  "media:content"?: { $: { url: string } };
}

function parseRssXml(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];

    const getTag = (tag: string): string | undefined => {
      const tagMatch = content.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
      return tagMatch?.[1]?.trim();
    };

    const title = getTag("title");
    const link = getTag("link");
    const description = getTag("description") || getTag("content:encoded");
    const pubDate = getTag("pubDate");
    const guid = getTag("guid");

    if (title && link) {
      items.push({
        title,
        link,
        description: description || title,
        pubDate,
        guid,
      });
    }
  }

  return items;
}

export class RssProvider extends BaseProvider {
  private options: RssProviderOptions;

  constructor(
    config: ConstructorParameters<typeof BaseProvider>[0],
    options: RssProviderOptions
  ) {
    super(config);
    this.options = options;
  }

  async fetchListings(): Promise<RawListing[]> {
    const res = await this.fetchWithRetry(this.options.feedUrl, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
    });

    const xml = await res.text();
    const items = parseRssXml(xml);
    const now = new Date();

    return items.map((item) => {
      const publishedAt = parseOptionalDate(item.pubDate);
      return {
        externalId: item.guid || item.link,
        title: normalizeText(item.title, 160),
        type: this.options.listingType,
        description: normalizeText(item.description),
        url: item.link,
        canonicalUrl: canonicalizeUrl(item.link),
        publishedAt,
        sourceUpdatedAt: publishedAt,
        lastSeenAt: now,
        startDate: this.options.listingType === "event" ? publishedAt : undefined,
        categorySlug: this.options.categorySlug,
        tagSlugs: this.options.tagSlugs,
        metadata: { source: "rss", feedUrl: this.options.feedUrl },
      };
    });
  }
}
