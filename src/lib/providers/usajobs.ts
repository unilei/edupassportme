import { BaseProvider } from "./base";
import { getProviderCompliance } from "./compliance";
import { canonicalizeUrl, normalizeText, parseOptionalDate } from "./normalization";
import type { RawListing } from "./types";

interface UsaJobsItem {
  MatchedObjectId: string;
  MatchedObjectDescriptor: {
    PositionTitle: string;
    OrganizationName?: string;
    PositionURI: string;
    PositionLocationDisplay?: string;
    PublicationStartDate?: string;
    ApplicationCloseDate?: string;
    UserArea?: { Details?: { JobSummary?: string; LowGrade?: string; HighGrade?: string } };
    PositionRemuneration?: Array<{
      MinimumRange?: string;
      MaximumRange?: string;
      RateIntervalCode?: string;
    }>;
  };
}

interface UsaJobsResponse {
  SearchResult?: { SearchResultItems?: UsaJobsItem[] };
}

function parseSalary(value?: string): number | undefined {
  if (!value) return undefined;
  const salary = Number(value);
  return Number.isFinite(salary) ? salary : undefined;
}

function formatSalaryLabel(
  salaryMin: number | undefined,
  salaryMax: number | undefined,
  interval: string | undefined
): string | undefined {
  if (salaryMin === undefined && salaryMax === undefined) return undefined;
  const range = `$${salaryMin ?? ""}-${salaryMax ?? ""}`;
  return interval ? `${range} ${interval}` : range;
}

export class UsaJobsProvider extends BaseProvider {
  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.userAgent);
  }

  getMissingConfigReason(): string | null {
    return this.isConfigured() ? null : "USAJOBS_API_KEY and USAJOBS_USER_AGENT are required";
  }

  async fetchListings(): Promise<RawListing[]> {
    const params = new URLSearchParams({
      Keyword: "education OR teacher OR curriculum OR training",
      ResultsPerPage: "50",
    });
    const res = await this.fetchWithRetry(`https://data.usajobs.gov/api/Search?${params}`, {
      headers: {
        "Authorization-Key": this.config.apiKey || "",
        "User-Agent": this.config.userAgent || "",
      },
    });
    const data = (await res.json()) as UsaJobsResponse;
    const now = new Date();

    return (data.SearchResult?.SearchResultItems ?? []).map((item) => {
      const job = item.MatchedObjectDescriptor;
      const pay = job.PositionRemuneration?.[0];
      const salaryMin = parseSalary(pay?.MinimumRange);
      const salaryMax = parseSalary(pay?.MaximumRange);
      const publishedAt = parseOptionalDate(job.PublicationStartDate);
      const expiresAt = parseOptionalDate(job.ApplicationCloseDate);

      return {
        externalId: `usajobs-${item.MatchedObjectId}`,
        title: normalizeText(job.PositionTitle, 180),
        type: "job",
        description: normalizeText(job.UserArea?.Details?.JobSummary || job.PositionTitle),
        url: job.PositionURI,
        canonicalUrl: canonicalizeUrl(job.PositionURI),
        location: job.PositionLocationDisplay,
        companyName: job.OrganizationName,
        salaryMin,
        salaryMax,
        salaryCurrency: salaryMin !== undefined || salaryMax !== undefined ? "USD" : undefined,
        priceLabel: formatSalaryLabel(salaryMin, salaryMax, pay?.RateIntervalCode),
        publishedAt,
        sourceUpdatedAt: publishedAt,
        expiresAt,
        lastSeenAt: now,
        categorySlug: "professional-development",
        tagSlugs: ["professional", "higher-education"],
        metadata: {
          lowGrade: job.UserArea?.Details?.LowGrade,
          highGrade: job.UserArea?.Details?.HighGrade,
        },
        compliance: getProviderCompliance("usajobs"),
      };
    });
  }
}
