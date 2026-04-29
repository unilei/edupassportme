import { BaseProvider } from "./base";
import type { RawListing } from "./types";
import type { ListingType } from "@/generated/prisma/enums";

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

function extractTextContent(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
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

    return items.map((item) => ({
      externalId: item.guid || item.link,
      title: extractTextContent(item.title),
      type: this.options.listingType,
      description: extractTextContent(item.description),
      url: item.link,
      startDate: item.pubDate ? new Date(item.pubDate) : undefined,
      categorySlug: this.options.categorySlug,
      tagSlugs: this.options.tagSlugs,
    }));
  }
}
