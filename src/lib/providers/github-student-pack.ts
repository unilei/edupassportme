import { BaseProvider } from "./base";
import type { RawListing } from "./types";
import { canonicalizeUrl, normalizeText, slugifyListingTitle } from "./normalization";
import { getProviderCompliance } from "./compliance";

const README_URL =
  "https://raw.githubusercontent.com/github-education-resources/Student-Developer-Pack-Current-Partners-FAQ/main/README.md";
const OFFERS_URL = "https://education.github.com/pack/offers";

function parsePartnerRows(markdown: string): Array<{ partner: string; benefit: string }> {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !/^\|\s*-+/.test(line))
    .map((line) => line.split("|").map((cell) => normalizeText(cell)))
    .map((cells) => ({ partner: cells[1] ?? "", benefit: cells[3] ?? cells[cells.length - 2] ?? "" }))
    .filter(({ partner, benefit }) =>
      Boolean(partner && benefit && !/student developer pack partner/i.test(partner) && !/left the pack|paused/i.test(partner + benefit))
    );
}

function inferCategory(partner: string, benefit: string): string {
  const text = `${partner} ${benefit}`.toLowerCase();
  if (/(password|security|monitoring|analytics|server|hosting|domain|email)/.test(text)) {
    return "productivity";
  }
  if (/(course|learn|coding|developer|github|copilot|code|programming|data|cloud|database|api|devops)/.test(text)) {
    return "coding-tech";
  }
  if (/(design|icon|studio|creative|music|photo)/.test(text)) {
    return "creative-design";
  }
  return "professional-development";
}

export class GitHubStudentPackProvider extends BaseProvider {
  async fetchListings(): Promise<RawListing[]> {
    const res = await this.fetchWithRetry(this.config.apiBaseUrl || README_URL, {
      headers: { Accept: "text/markdown,text/plain" },
    });
    const rows = parsePartnerRows(await res.text());
    const now = new Date();

    return rows.slice(0, 80).map(({ partner, benefit }) => ({
      externalId: `github-student-pack-${slugifyListingTitle(partner)}`,
      title: `${partner} student benefit`,
      type: "deal",
      description: normalizeText(`GitHub Student Developer Pack benefit: ${benefit}`),
      url: OFFERS_URL,
      canonicalUrl: canonicalizeUrl(OFFERS_URL),
      priceLabel: "Student benefit",
      discountText: benefit,
      language: "en",
      categorySlug: inferCategory(partner, benefit),
      tagSlugs: ["free", "professional"],
      publishedAt: now,
      lastSeenAt: now,
      metadata: {
        source: "github-student-pack",
        partner,
      },
      compliance: getProviderCompliance("github-student-pack"),
    }));
  }
}
