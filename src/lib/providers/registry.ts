import { prisma } from "@/lib/prisma";
import type { BaseProvider } from "./base";
import { UdemyProvider } from "./udemy";
import { CourseraProvider } from "./coursera";
import { RssProvider } from "./rss";
import { RemotiveProvider } from "./remotive";
import { UsaJobsProvider } from "./usajobs";
import { TicketmasterProvider } from "./ticketmaster";
import { AwinOffersProvider } from "./awin";
import { syncProvider } from "./sync";
import type { SyncResult } from "./types";

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

    // RSS-based providers can be added here
    // Example: an education news RSS feed
    // case "edu-news":
    //   return new RssProvider(config, {
    //     feedUrl: "https://example.com/feed.xml",
    //     listingType: "event",
    //     categorySlug: "community-forums",
    //   });

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
  const provider = await prisma.provider.findUnique({ where: { slug } });
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
