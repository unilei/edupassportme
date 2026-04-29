import { BaseProvider } from "./base";
import type { RawListing } from "./types";

interface CourseraCourse {
  id: string;
  slug: string;
  name: string;
  description?: string;
  photoUrl?: string;
  partnerIds?: string[];
  domainTypes?: { domainId: string; subdomainId?: string }[];
  workload?: string;
  difficultyLevel?: string;
  primaryLanguages?: string[];
}

interface CourseraApiResponse {
  elements: CourseraCourse[];
  paging: { total: number; next?: string };
  linked?: {
    partners?: { id: string; name: string }[];
  };
}

function mapDifficulty(level?: string): string | undefined {
  if (!level) return undefined;
  const map: Record<string, string> = {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ADVANCED: "Advanced",
    MIXED: "All Levels",
  };
  return map[level] ?? level;
}

function mapDomainToCategory(domainTypes?: { domainId: string; subdomainId?: string }[]): string {
  if (!domainTypes || domainTypes.length === 0) return "online-courses";
  const domain = domainTypes[0].domainId;
  const map: Record<string, string> = {
    "computer-science": "coding-tech",
    "data-science": "ai-study-tools",
    business: "professional-development",
    "information-technology": "coding-tech",
    "personal-development": "productivity",
    "language-learning": "language-learning",
    "math-and-logic": "stem-science",
    "physical-science-and-engineering": "stem-science",
    "life-sciences": "stem-science",
    "social-sciences": "academic-research",
    arts: "creative-design",
    "health": "professional-development",
  };
  return map[domain] ?? "online-courses";
}

function inferTagSlugs(course: CourseraCourse): string[] {
  const tags: string[] = ["web", "freemium", "certificate", "self-paced", "video"];
  if (course.difficultyLevel === "BEGINNER") tags.push("beginner-friendly");
  if (course.difficultyLevel === "ADVANCED") tags.push("higher-education");
  return tags;
}

export class CourseraProvider extends BaseProvider {
  async fetchListings(options?: {
    page?: number;
    limit?: number;
  }): Promise<RawListing[]> {
    const limit = options?.limit ?? 50;
    const allListings: RawListing[] = [];

    try {
      const params = new URLSearchParams({
        start: "0",
        limit: String(limit),
        includes: "partnerIds",
        fields: "id,slug,name,description,photoUrl,partnerIds,domainTypes,workload,difficultyLevel,primaryLanguages",
        q: "search",
        query: "top rated",
      });

      const res = await this.fetchWithRetry(
        `${this.config.apiBaseUrl || "https://api.coursera.org/api"}/courses.v1?${params}`
      );

      const data: CourseraApiResponse = await res.json();
      const partners = data.linked?.partners ?? [];

      for (const course of data.elements) {
        const partnerName = partners.find((p) => course.partnerIds?.includes(p.id))?.name;
        const desc = course.description?.slice(0, 500) || course.name;

        allListings.push({
          externalId: `coursera-${course.id}`,
          title: course.name,
          type: "course",
          description: partnerName ? `${desc} — by ${partnerName}` : desc,
          url: `https://www.coursera.org/learn/${course.slug}`,
          image: course.photoUrl,
          price: 0,
          priceLabel: "Free to audit",
          duration: course.workload,
          level: mapDifficulty(course.difficultyLevel),
          language: course.primaryLanguages?.[0] ?? "en",
          categorySlug: mapDomainToCategory(course.domainTypes),
          tagSlugs: inferTagSlugs(course),
        });
      }
    } catch (err) {
      console.warn("Coursera: failed to fetch catalog:", err instanceof Error ? err.message : err);
    }

    return allListings;
  }
}
