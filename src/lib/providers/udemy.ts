import { BaseProvider } from "./base";
import type { RawListing } from "./types";

interface UdemyCourse {
  id: number;
  title: string;
  url: string;
  headline: string;
  description?: string;
  image_480x270?: string;
  price: string;
  price_detail?: { amount: number; currency: string };
  avg_rating: number;
  num_reviews: number;
  content_info_short?: string;
  instructional_level_simple?: string;
  locale?: { simple_english_title: string };
  num_subscribers?: number;
}

interface UdemyApiResponse {
  count: number;
  next: string | null;
  results: UdemyCourse[];
}

const EDUCATION_SEARCH_TERMS = [
  "machine learning",
  "data science",
  "web development",
  "python programming",
  "javascript",
  "cloud computing",
  "cybersecurity",
  "digital marketing",
  "project management",
  "ux design",
];

function mapLevel(level?: string): string | undefined {
  if (!level) return undefined;
  const map: Record<string, string> = {
    "Beginner Level": "Beginner",
    "Intermediate Level": "Intermediate",
    "Expert Level": "Advanced",
    "All Levels": "All Levels",
  };
  return map[level] ?? level;
}

function mapPriceLabel(price: string): string {
  if (price === "Free") return "Free";
  return price;
}

function inferTagSlugs(course: UdemyCourse): string[] {
  const tags: string[] = ["web"];
  const price = course.price?.toLowerCase() ?? "";
  if (price === "free") {
    tags.push("free");
  } else {
    tags.push("paid");
  }
  tags.push("self-paced", "video");
  if (course.avg_rating >= 4.5) tags.push("beginner-friendly");
  if (course.instructional_level_simple === "Beginner Level") tags.push("beginner-friendly");
  return [...new Set(tags)];
}

function inferCategorySlug(title: string, headline: string): string {
  const text = `${title} ${headline}`.toLowerCase();
  if (text.includes("machine learning") || text.includes("deep learning") || text.includes("artificial intelligence") || text.includes("data science"))
    return "ai-study-tools";
  if (text.includes("python") || text.includes("javascript") || text.includes("web development") || text.includes("react") || text.includes("programming") || text.includes("coding"))
    return "coding-tech";
  if (text.includes("cloud") || text.includes("aws") || text.includes("devops") || text.includes("cybersecurity"))
    return "professional-development";
  if (text.includes("design") || text.includes("ux") || text.includes("photoshop") || text.includes("illustration"))
    return "creative-design";
  if (text.includes("marketing") || text.includes("business") || text.includes("management") || text.includes("project"))
    return "professional-development";
  if (text.includes("math") || text.includes("science") || text.includes("physics") || text.includes("chemistry"))
    return "stem-science";
  if (text.includes("language") || text.includes("english") || text.includes("spanish") || text.includes("french"))
    return "language-learning";
  if (text.includes("writing") || text.includes("research"))
    return "writing-research";
  return "online-courses";
}

export class UdemyProvider extends BaseProvider {
  isConfigured(): boolean {
    return Boolean(this.config.apiKey || process.env.UDEMY_API_KEY);
  }

  getMissingConfigReason(): string | null {
    return this.isConfigured()
      ? null
      : "UDEMY_API_KEY is required. Get one at https://www.udemy.com/user/edit-api-clients/";
  }

  async fetchListings(options?: {
    page?: number;
    limit?: number;
  }): Promise<RawListing[]> {
    const apiKey = this.config.apiKey || process.env.UDEMY_API_KEY;
    if (!apiKey) {
      throw new Error("UDEMY_API_KEY is required. Get one at https://www.udemy.com/user/edit-api-clients/");
    }

    const limit = options?.limit ?? 20;
    const allListings: RawListing[] = [];

    // Fetch courses across multiple search terms to get diverse results
    for (const term of EDUCATION_SEARCH_TERMS) {
      if (allListings.length >= 100) break;

      try {
        const params = new URLSearchParams({
          search: term,
          page_size: String(Math.min(limit, 20)),
          ordering: "relevance",
          "fields[course]":
            "title,url,headline,description,image_480x270,price,price_detail,avg_rating,num_reviews,content_info_short,instructional_level_simple,locale,num_subscribers",
        });

        const res = await this.fetchWithRetry(
          `${this.config.apiBaseUrl || "https://www.udemy.com/api-2.0"}/courses/?${params}`,
          {
            headers: {
              Authorization: `Basic ${apiKey}`,
              Accept: "application/json, text/plain, */*",
            },
          }
        );

        const data: UdemyApiResponse = await res.json();

        for (const course of data.results) {
          // Skip duplicates
          if (allListings.some((l) => l.externalId === `udemy-${course.id}`)) continue;

          const priceAmount = course.price_detail?.amount ?? (course.price === "Free" ? 0 : undefined);
          const currency = course.price_detail?.currency ?? "USD";
          const now = new Date();
          const url = `https://www.udemy.com${course.url}`;

          allListings.push({
            externalId: `udemy-${course.id}`,
            title: course.title,
            type: "course",
            description: course.headline || course.title,
            content: course.description,
            url,
            canonicalUrl: url,
            image: course.image_480x270,
            price: priceAmount,
            currency,
            priceLabel: mapPriceLabel(course.price),
            rating: Math.round(course.avg_rating * 10) / 10,
            reviewCount: course.num_reviews,
            duration: course.content_info_short,
            level: mapLevel(course.instructional_level_simple),
            language: course.locale?.simple_english_title ?? "English",
            lastSeenAt: now,
            categorySlug: inferCategorySlug(course.title, course.headline),
            tagSlugs: inferTagSlugs(course),
            metadata: {
              subscribers: course.num_subscribers,
              provider: "udemy",
            },
          });
        }
      } catch (err) {
        console.warn(`Udemy: failed to fetch "${term}":`, err instanceof Error ? err.message : err);
      }
    }

    return allListings;
  }
}
