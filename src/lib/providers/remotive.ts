import { BaseProvider } from "./base";
import { getProviderCompliance } from "./compliance";
import { canonicalizeUrl, normalizeText, parseOptionalDate } from "./normalization";
import type { RawListing } from "./types";

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  category?: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
  url: string;
}

interface RemotiveResponse {
  jobs?: RemotiveJob[];
}

function inferCategory(job: RemotiveJob): string {
  const text = `${job.title} ${job.category ?? ""}`.toLowerCase();
  if (text.includes("teacher") || text.includes("tutor")) return "test-prep-tutoring";
  if (text.includes("curriculum")) return "teaching-lms";
  if (text.includes("developer") || text.includes("engineer")) return "coding-tech";
  return "professional-development";
}

export class RemotiveProvider extends BaseProvider {
  async fetchListings(): Promise<RawListing[]> {
    const res = await this.fetchWithRetry("https://remotive.com/api/remote-jobs?search=education");
    const data = (await res.json()) as RemotiveResponse;
    const now = new Date();

    return (data.jobs ?? []).map((job) => {
      const publishedAt = parseOptionalDate(job.publication_date);

      return {
        externalId: `remotive-${job.id}`,
        title: normalizeText(job.title, 180),
        type: "job",
        description: normalizeText(job.description),
        content: normalizeText(job.description, 4000),
        url: job.url,
        canonicalUrl: canonicalizeUrl(job.url),
        location: job.candidate_required_location || "Remote",
        companyName: job.company_name,
        priceLabel: job.salary,
        publishedAt,
        sourceUpdatedAt: publishedAt,
        lastSeenAt: now,
        categorySlug: inferCategory(job),
        tagSlugs: ["professional", "web"],
        metadata: {
          jobType: job.job_type,
          sourceCategory: job.category,
        },
        compliance: getProviderCompliance("remotive"),
      };
    });
  }
}
