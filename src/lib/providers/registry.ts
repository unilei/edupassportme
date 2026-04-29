import { prisma } from "@/lib/prisma";
import type { BaseProvider } from "./base";
import { UdemyProvider } from "./udemy";
import { CourseraProvider } from "./coursera";
import { RssProvider } from "./rss";
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

  try {
    const result = await syncProvider(instance, provider.id);
    return { providerId: provider.id, providerName: provider.name, providerSlug: provider.slug, result, skipped: false };
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

    try {
      const result = await syncProvider(instance, provider.id);
      results.push({ providerId: provider.id, providerName: provider.name, providerSlug: provider.slug, result, skipped: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ providerId: provider.id, providerName: provider.name, providerSlug: provider.slug, result: null, skipped: false, error: msg });
    }
  }

  return results;
}

// Re-export RssProvider for custom feed registrations
export { RssProvider };
