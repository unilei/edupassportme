import { BaseProvider } from "./base";
import type { RawListing } from "./types";
import { canonicalizeUrl, normalizeText, slugifyListingTitle } from "./normalization";

const MIT_OCW_HOME = "https://ocw.mit.edu/";

function absoluteMitUrl(value: string): string {
  return new URL(value, MIT_OCW_HOME).toString();
}

function extractInstructor(context: string): string | undefined {
  const match = context.match(/course-card-instructors[^>]*>([\s\S]*?)<\/div>/i);
  return match ? normalizeText(match[1], 160) : undefined;
}

function extractImage(context: string): string | undefined {
  const match = context.match(/<img\b[^>]*(?:data-src|src)="([^"]+)"/i);
  return match ? absoluteMitUrl(match[1]) : undefined;
}

function extractCourseCard(html: string, anchorStart: number, anchorEnd: number): string {
  const cardStart = html.lastIndexOf('<div class="course-card card', anchorStart);
  const nextCardStart = html.indexOf('<div class="course-card card', anchorEnd);
  const start = cardStart >= 0 ? cardStart : Math.max(0, anchorStart - 1000);
  const end = nextCardStart >= 0 ? nextCardStart : Math.min(html.length, anchorEnd + 1000);
  return html.slice(start, end);
}

function extractTopics(context: string): string {
  const match = context.match(/course-card-topics[^>]*>([\s\S]*?)(?:<\/div>\s*<\/div>|<\/div>)/i);
  return match ? normalizeText(match[1], 300) : "";
}

function inferCategory(text: string): string {
  const value = text.toLowerCase();
  if (/(computer|programming|software|data|ai|machine|code|computational)/.test(value)) {
    return "coding-tech";
  }
  if (/(biology|chemistry|physics|science|engineering|math|quantum|ecology)/.test(value)) {
    return "stem-science";
  }
  if (/(art|design|music|landscape|media|writing)/.test(value)) {
    return "creative-design";
  }
  if (/(business|economic|finance|management)/.test(value)) {
    return "professional-development";
  }
  return "online-courses";
}

export class MitOpenCourseWareProvider extends BaseProvider {
  async fetchListings(): Promise<RawListing[]> {
    const res = await this.fetchWithRetry(this.config.apiBaseUrl || MIT_OCW_HOME, {
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    const html = await res.text();
    const anchorRegex = /<a\s+[^>]*href="(\/courses\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const listings: RawListing[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = anchorRegex.exec(html)) !== null) {
      const path = match[1];
      const title = normalizeText(match[2], 160);
      if (!title || seen.has(path)) continue;
      seen.add(path);

      const context = extractCourseCard(html, match.index, anchorRegex.lastIndex);
      const instructor = extractInstructor(context);
      const categoryText = extractTopics(context);
      const url = absoluteMitUrl(path);
      const externalSlug = path.replace(/^\/courses\//, "").replace(/\/$/, "");

      listings.push({
        externalId: `mit-ocw-${externalSlug || slugifyListingTitle(title)}`,
        title,
        type: "course",
        description: instructor
          ? `Free MIT OpenCourseWare course materials by ${instructor}.`
          : "Free MIT OpenCourseWare course materials for self-paced learning.",
        url,
        canonicalUrl: canonicalizeUrl(url),
        image: extractImage(context),
        price: 0,
        priceLabel: "Free",
        language: "en",
        categorySlug: inferCategory(`${title} ${categoryText}`),
        tagSlugs: ["free", "self-paced", "higher-education"],
        lastSeenAt: new Date(),
        metadata: { source: "mit-ocw" },
      });
    }

    return listings.slice(0, 40);
  }
}
