import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getProviderRuntimeStatus, syncAllProviders, syncSingleProvider } from "@/lib/providers/registry";

type ProviderHealth = "healthy" | "failing" | "needs_configuration" | "unsupported" | "inactive" | "never_synced";

function resolveProviderHealth(
  provider: { isActive: boolean; lastSuccessfulSyncAt: Date | null; failureCount: number },
  runtimeStatus: ReturnType<typeof getProviderRuntimeStatus>,
  latestLog?: { status: string } | null,
): ProviderHealth {
  if (!provider.isActive) return "inactive";
  if (!runtimeStatus.implemented) return "unsupported";
  if (!runtimeStatus.configured) return "needs_configuration";
  if (provider.failureCount > 0 || latestLog?.status === "error") return "failing";
  if (provider.lastSuccessfulSyncAt || latestLog?.status === "success") return "healthy";
  return "never_synced";
}

function maxDate(dates: Array<Date | null | undefined>): Date | null {
  const timestamps = dates
    .map((date) => date?.getTime())
    .filter((timestamp): timestamp is number => typeof timestamp === "number");
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps));
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const providerSlug = (body as { provider?: string }).provider;

    if (providerSlug) {
      const result = await syncSingleProvider(providerSlug);
      return NextResponse.json({ results: [result] });
    }

    const results = await syncAllProviders();
    return NextResponse.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");

  const providers = await prisma.provider.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      apiType: true,
      apiBaseUrl: true,
      authType: true,
      rateLimitPerMinute: true,
      syncFrequency: true,
      lastSyncAt: true,
      lastSuccessfulSyncAt: true,
      lastFailedSyncAt: true,
      failureCount: true,
      complianceNotes: true,
      _count: { select: { listings: true, syncLogs: true } },
    },
  });

  const recentLogs = await prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
    include: { provider: { select: { name: true, slug: true } } },
  });

  const latestLogByProviderId = new Map<string, (typeof recentLogs)[number]>();
  for (const log of recentLogs) {
    if (!latestLogByProviderId.has(log.providerId)) {
      latestLogByProviderId.set(log.providerId, log);
    }
  }

  const providersWithStatus = providers.map((provider) => {
    const latestLog = latestLogByProviderId.get(provider.id) ?? null;
    const runtimeStatus = getProviderRuntimeStatus(provider);
    const health = resolveProviderHealth(provider, runtimeStatus, latestLog);

    return {
      ...provider,
      runtimeStatus,
      health,
      latestLog,
    };
  });

  const actionRequiredHealth: ProviderHealth[] = ["failing", "needs_configuration", "unsupported"];
  const summary = {
    totalProviders: providersWithStatus.length,
    activeProviders: providersWithStatus.filter((provider) => provider.isActive).length,
    syncableProviders: providersWithStatus.filter((provider) => provider.isActive && provider.runtimeStatus.canSync).length,
    healthyProviders: providersWithStatus.filter((provider) => provider.health === "healthy").length,
    actionRequiredProviders: providersWithStatus.filter((provider) => actionRequiredHealth.includes(provider.health)).length,
    totalListings: providersWithStatus.reduce((sum, provider) => sum + provider._count.listings, 0),
    lastSuccessfulSyncAt: maxDate(providersWithStatus.map((provider) => provider.lastSuccessfulSyncAt)),
    lastRunAt: maxDate(recentLogs.map((log) => log.startedAt)),
  };

  return NextResponse.json({ providers: providersWithStatus, recentLogs: recentLogs.slice(0, 20), summary });
}
