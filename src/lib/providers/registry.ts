import { prisma } from "@/lib/prisma";
import type { BaseProvider } from "./base";
import { UdemyProvider } from "./udemy";
import { CourseraProvider } from "./coursera";
import { RssProvider } from "./rss";
import { RemotiveProvider } from "./remotive";
import { UsaJobsProvider } from "./usajobs";
import { TicketmasterProvider } from "./ticketmaster";
import { AwinOffersProvider } from "./awin";
import { MicrosoftLearnProvider } from "./microsoft-learn";
import { MitOpenCourseWareProvider } from "./mit-ocw";
import { GitHubStudentPackProvider } from "./github-student-pack";
import { SlickdealsEducationProvider } from "./slickdeals-education";
import { syncProvider } from "./sync";
import type { SyncResult } from "./types";

const DEFAULT_SYNC_PROVIDERS = [
  {
    name: "Microsoft Learn",
    slug: "microsoft-learn",
    url: "https://learn.microsoft.com/training/",
    logo: "https://learn.microsoft.com/favicon.ico",
    description: "Free Microsoft training modules and learning paths",
    apiType: "rest",
    apiBaseUrl: "https://learn.microsoft.com/api/catalog/",
    authType: "none",
    syncFrequency: "daily",
    rateLimitPerMinute: 60,
    complianceNotes: "Public catalog metadata only; link users to Microsoft Learn.",
  },
  {
    name: "MIT OpenCourseWare",
    slug: "mit-ocw",
    url: "https://ocw.mit.edu",
    logo: "https://ocw.mit.edu/favicon.ico",
    description: "Free MIT course materials for self-paced learning",
    apiType: "scrape",
    apiBaseUrl: "https://ocw.mit.edu/",
    authType: "none",
    syncFrequency: "daily",
    rateLimitPerMinute: 20,
    complianceNotes: "Use public MIT OCW pages and credit MIT OpenCourseWare as source.",
  },
  {
    name: "GitHub Student Developer Pack",
    slug: "github-student-pack",
    url: "https://education.github.com/pack",
    logo: "https://github.githubassets.com/favicons/favicon.svg",
    description: "Public student developer benefit catalog from GitHub Education",
    apiType: "rest",
    apiBaseUrl: "https://raw.githubusercontent.com/github-education-resources/Student-Developer-Pack-Current-Partners-FAQ/main/README.md",
    authType: "none",
    syncFrequency: "daily",
    rateLimitPerMinute: 60,
    complianceNotes: "Public benefit metadata only; benefits require GitHub student verification.",
  },
  {
    name: "Slickdeals Education",
    slug: "slickdeals-education",
    url: "https://slickdeals.net/deals/education/",
    logo: "https://slickdeals.net/favicon.ico",
    description: "Public education and student discount deals",
    apiType: "scrape",
    apiBaseUrl: "https://slickdeals.net/deals/education/",
    authType: "none",
    syncFrequency: "hourly",
    rateLimitPerMinute: 20,
    complianceNotes: "Use public Slickdeals education deal links without affiliate rewriting.",
  },
] as const;

type DefaultSyncProviderSlug = (typeof DEFAULT_SYNC_PROVIDERS)[number]["slug"];

async function ensureDefaultProvider(slug: DefaultSyncProviderSlug) {
  const provider = DEFAULT_SYNC_PROVIDERS.find((item) => item.slug === slug);
  if (!provider) return;

  await prisma.provider.upsert({
    where: { slug: provider.slug },
    create: provider,
    update: {
      name: provider.name,
      url: provider.url,
      logo: provider.logo,
      description: provider.description,
      apiType: provider.apiType,
      apiBaseUrl: provider.apiBaseUrl,
      authType: provider.authType,
      syncFrequency: provider.syncFrequency,
      rateLimitPerMinute: provider.rateLimitPerMinute,
      complianceNotes: provider.complianceNotes,
    },
  });
}

async function ensureDefaultProviders() {
  for (const provider of DEFAULT_SYNC_PROVIDERS) {
    await ensureDefaultProvider(provider.slug);
  }
}

function isDefaultProviderSlug(slug: string): slug is DefaultSyncProviderSlug {
  return DEFAULT_SYNC_PROVIDERS.some((provider) => provider.slug === slug);
}

/**
 * Create a provider instance from its DB record.
 * Returns null for providers that don't have an implementation yet.
 */
function createProviderInstance(
  provider: { slug: string; name: string; apiBaseUrl: string | null; apiType: string }
): BaseProvider | null {
  const config = { slug: provider.slug, name: provider.name, apiBaseUrl: provider.apiBaseUrl ?? undefined };

  switch (provider.slug) {
    case "udemy-provider":
      return new UdemyProvider({
        ...config,
        apiKey: process.env.UDEMY_API_KEY,
        apiBaseUrl: config.apiBaseUrl || "https://www.udemy.com/api-2.0",
      });

    case "coursera":
      return new CourseraProvider({
        ...config,
        apiBaseUrl: config.apiBaseUrl || "https://api.coursera.org/api",
      });

    case "remotive":
      return new RemotiveProvider(config);

    case "usajobs":
      return new UsaJobsProvider({
        ...config,
        apiKey: process.env.USAJOBS_API_KEY,
        userAgent: process.env.USAJOBS_USER_AGENT,
      });

    case "ticketmaster":
      return new TicketmasterProvider({
        ...config,
        apiKey: process.env.TICKETMASTER_API_KEY,
      });

    case "awin":
      return new AwinOffersProvider({
        ...config,
        apiKey: process.env.AWIN_ACCESS_TOKEN,
        publisherId: process.env.AWIN_PUBLISHER_ID,
      });

    case "microsoft-learn":
      return new MicrosoftLearnProvider(config);

    case "mit-ocw":
      return new MitOpenCourseWareProvider(config);

    case "github-student-pack":
      return new GitHubStudentPackProvider(config);

    case "slickdeals-education":
      return new SlickdealsEducationProvider(config);

    default:
      // manual or unsupported providers
      return null;
  }
}

export interface ProviderSyncResult {
  providerId: string;
  providerName: string;
  providerSlug: string;
  result: SyncResult | null;
  skipped: boolean;
  error?: string;
}

function fatalSyncError(result: SyncResult): string | undefined {
  if (result.itemsFound === 0 && result.errors.length > 0) {
    return result.errors.join("; ");
  }
  return undefined;
}

/**
 * Sync a single provider by its slug.
 */
export async function syncSingleProvider(slug: string): Promise<ProviderSyncResult> {
  let provider = await prisma.provider.findUnique({ where: { slug } });
  if (!provider && isDefaultProviderSlug(slug)) {
    await ensureDefaultProvider(slug);
    provider = await prisma.provider.findUnique({ where: { slug } });
  }
  if (!provider) {
    return { providerId: "", providerName: slug, providerSlug: slug, result: null, skipped: true, error: "Provider not found" };
  }

  if (!provider.isActive) {
    return { providerId: provider.id, providerName: provider.name, providerSlug: provider.slug, result: null, skipped: true, error: "Provider is inactive" };
  }

  const instance = createProviderInstance(provider);
  if (!instance) {
    return { providerId: provider.id, providerName: provider.name, providerSlug: provider.slug, result: null, skipped: true, error: "No implementation available" };
  }

  if (!instance.isConfigured()) {
    return {
      providerId: provider.id,
      providerName: provider.name,
      providerSlug: provider.slug,
      result: null,
      skipped: true,
      error: instance.getMissingConfigReason() || "Provider is not configured",
    };
  }

  try {
    const result = await syncProvider(instance, provider.id);
    const error = fatalSyncError(result);
    return { providerId: provider.id, providerName: provider.name, providerSlug: provider.slug, result, skipped: false, ...(error ? { error } : {}) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { providerId: provider.id, providerName: provider.name, providerSlug: provider.slug, result: null, skipped: false, error: msg };
  }
}

/**
 * Sync all active providers that have implementations.
 */
export async function syncAllProviders(): Promise<ProviderSyncResult[]> {
  await ensureDefaultProviders();

  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const results: ProviderSyncResult[] = [];

  for (const provider of providers) {
    const instance = createProviderInstance(provider);
    if (!instance) {
      results.push({
        providerId: provider.id,
        providerName: provider.name,
        providerSlug: provider.slug,
        result: null,
        skipped: true,
        error: "No implementation available (manual provider)",
      });
      continue;
    }

    if (!instance.isConfigured()) {
      results.push({
        providerId: provider.id,
        providerName: provider.name,
        providerSlug: provider.slug,
        result: null,
        skipped: true,
        error: instance.getMissingConfigReason() || "Provider is not configured",
      });
      continue;
    }

    try {
      const result = await syncProvider(instance, provider.id);
      const error = fatalSyncError(result);
      results.push({ providerId: provider.id, providerName: provider.name, providerSlug: provider.slug, result, skipped: false, ...(error ? { error } : {}) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ providerId: provider.id, providerName: provider.name, providerSlug: provider.slug, result: null, skipped: false, error: msg });
    }
  }

  return results;
}

// Re-export RssProvider for custom feed registrations
export { RssProvider };
