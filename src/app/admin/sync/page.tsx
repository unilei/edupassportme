"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProviderHealth = "healthy" | "failing" | "needs_configuration" | "unsupported" | "inactive" | "never_synced";

interface RuntimeStatus {
  implemented: boolean;
  configured: boolean;
  canSync: boolean;
  missingConfigReason: string | null;
  disabledReason: string | null;
}

interface SyncLogEntry {
  id: string;
  providerId: string;
  status: string;
  itemsFound: number;
  itemsAdded: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsExpired: number;
  durationMs: number | null;
  details: unknown;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  provider: { name: string; slug: string };
}

interface ProviderStatus {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  apiType: string;
  apiBaseUrl: string | null;
  authType: string;
  rateLimitPerMinute: number | null;
  syncFrequency: string;
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastFailedSyncAt: string | null;
  failureCount: number;
  complianceNotes: string | null;
  _count: { listings: number; syncLogs: number };
  runtimeStatus: RuntimeStatus;
  health: ProviderHealth;
  latestLog: SyncLogEntry | null;
}

interface SyncSummary {
  totalProviders: number;
  activeProviders: number;
  syncableProviders: number;
  healthyProviders: number;
  actionRequiredProviders: number;
  totalListings: number;
  lastSuccessfulSyncAt: string | null;
  lastRunAt: string | null;
}

interface SyncResult {
  providerId: string;
  providerName: string;
  providerSlug: string;
  result: {
    itemsFound: number;
    itemsAdded: number;
    itemsUpdated: number;
    itemsSkipped: number;
    itemsExpired: number;
    errors: string[];
  } | null;
  skipped: boolean;
  error?: string;
}

interface SyncDashboardResponse {
  providers: ProviderStatus[];
  recentLogs: SyncLogEntry[];
  summary: SyncSummary;
}

const healthLabels: Record<ProviderHealth, string> = {
  healthy: "Healthy",
  failing: "Failing",
  needs_configuration: "Needs config",
  unsupported: "Unsupported",
  inactive: "Inactive",
  never_synced: "Never synced",
};

const healthClasses: Record<ProviderHealth, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  failing: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  needs_configuration: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  unsupported: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300",
  inactive: "border-muted bg-muted text-muted-foreground",
  never_synced: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
};

const providerTypeLabels: Record<string, string> = {
  rest: "REST",
  api: "API",
  rss: "RSS",
  scrape: "Scrape",
  manual: "Manual",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function formatDuration(value: number | null) {
  if (!value) return "-";
  if (value < 1000) return `${value}ms`;
  return `${Math.round(value / 100) / 10}s`;
}

function getProviderIssue(provider: ProviderStatus) {
  if (!provider.isActive) return "Inactive";
  if (provider.runtimeStatus.disabledReason) return provider.runtimeStatus.disabledReason;
  if (provider.latestLog?.error) return provider.latestLog.error;
  if (provider.failureCount > 0) return `${provider.failureCount} consecutive failures`;
  if (provider.health === "never_synced") return "No successful sync yet";
  return provider.complianceNotes || "-";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />;
  if (status === "error") return <XCircle className="h-3.5 w-3.5 text-red-600" />;
  return <Clock className="h-3.5 w-3.5 text-amber-600" />;
}

export default function SyncDashboardPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [query, setQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<ProviderHealth | "all">("all");

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/admin/sync");
      if (!response.ok) throw new Error("Failed to load provider status");
      const data = (await response.json()) as SyncDashboardResponse;
      setProviders(data.providers);
      setLogs(data.recentLogs);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load provider status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const triggerSync = async (providerSlug?: string) => {
    const key = providerSlug ?? "all";
    setSyncing(key);
    setSyncResults([]);
    setError(null);

    try {
      const response = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(providerSlug ? { provider: providerSlug } : {}),
      });
      const data = (await response.json()) as { results?: SyncResult[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Sync failed");
      setSyncResults(data.results ?? []);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(null);
    }
  };

  const filteredProviders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return providers.filter((provider) => {
      const matchesQuery = normalizedQuery.length === 0
        || provider.name.toLowerCase().includes(normalizedQuery)
        || provider.slug.toLowerCase().includes(normalizedQuery)
        || provider.apiType.toLowerCase().includes(normalizedQuery);
      const matchesHealth = healthFilter === "all" || provider.health === healthFilter;
      return matchesQuery && matchesHealth;
    });
  }, [healthFilter, providers, query]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Provider Operations</h1>
          <p className="text-sm text-muted-foreground">
            Monitor source health, review sync outcomes, and rerun providers when data looks stale.
          </p>
        </div>
        <Button onClick={() => void triggerSync()} disabled={syncing !== null}>
          {syncing === "all" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync All
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Providers</p>
          <p className="mt-1 text-2xl font-semibold">{formatNumber(summary?.totalProviders ?? providers.length)}</p>
          <p className="text-xs text-muted-foreground">{formatNumber(summary?.activeProviders ?? 0)} active</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Syncable</p>
          <p className="mt-1 text-2xl font-semibold">{formatNumber(summary?.syncableProviders ?? 0)}</p>
          <p className="text-xs text-muted-foreground">implemented and configured</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Healthy</p>
          <p className="mt-1 text-2xl font-semibold">{formatNumber(summary?.healthyProviders ?? 0)}</p>
          <p className="text-xs text-muted-foreground">latest run successful</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Needs Attention</p>
          <p className="mt-1 text-2xl font-semibold">{formatNumber(summary?.actionRequiredProviders ?? 0)}</p>
          <p className="text-xs text-muted-foreground">failing, unsupported, or missing config</p>
        </div>
        <div className="rounded-md border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Listings</p>
          <p className="mt-1 text-2xl font-semibold">{formatNumber(summary?.totalListings ?? 0)}</p>
          <p className="text-xs text-muted-foreground">last run {formatDate(summary?.lastRunAt ?? null)}</p>
        </div>
      </div>

      {syncResults.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Latest Manual Sync</h2>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {syncResults.map((result) => (
              <div key={result.providerSlug} className="flex items-start gap-3 rounded-md bg-background p-3 text-sm">
                {result.error ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                ) : result.skipped ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                ) : (
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                )}
                <div className="min-w-0">
                  <p className="font-medium">{result.providerName}</p>
                  {result.result ? (
                    <p className="text-muted-foreground">
                      Found {formatNumber(result.result.itemsFound)}, added {formatNumber(result.result.itemsAdded)}, updated {formatNumber(result.result.itemsUpdated)}, expired {formatNumber(result.result.itemsExpired)}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">{result.error || "Skipped"}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">Providers</h2>
            <p className="text-sm text-muted-foreground">{formatNumber(filteredProviders.length)} shown</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search providers"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={healthFilter}
              onChange={(event) => setHealthFilter(event.target.value as ProviderHealth | "all")}
            >
              <option value="all">All status</option>
              {Object.entries(healthLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Provider</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Listings</TableHead>
              <TableHead>Latest Result</TableHead>
              <TableHead>Last Success</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProviders.map((provider) => {
              const latestLog = provider.latestLog;
              const isSyncing = syncing === provider.slug;
              return (
                <TableRow key={provider.id}>
                  <TableCell className="min-w-[220px]">
                    <div className="font-medium">{provider.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{provider.slug}</span>
                      <span>-</span>
                      <span>{providerTypeLabels[provider.apiType] ?? provider.apiType}</span>
                      <span>-</span>
                      <span>{provider.authType}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={healthClasses[provider.health]}>
                      {healthLabels[provider.health]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{formatNumber(provider._count.listings)}</div>
                    <div className="text-xs text-muted-foreground">{formatNumber(provider._count.syncLogs)} runs</div>
                  </TableCell>
                  <TableCell>
                    {latestLog ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon status={latestLog.status} />
                          <span className="font-medium capitalize">{latestLog.status}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatNumber(latestLog.itemsFound)} found / {formatNumber(latestLog.itemsAdded)} added / {formatNumber(latestLog.itemsUpdated)} updated
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No runs</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>{formatDate(provider.lastSuccessfulSyncAt)}</div>
                    {provider.lastFailedSyncAt && (
                      <div className="text-xs text-red-600">failed {formatDate(provider.lastFailedSyncAt)}</div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[320px]">
                    <p className="truncate text-sm text-muted-foreground" title={getProviderIssue(provider)}>
                      {getProviderIssue(provider)}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!provider.isActive || !provider.runtimeStatus.canSync || syncing !== null}
                      onClick={() => void triggerSync(provider.slug)}
                      title={provider.runtimeStatus.disabledReason || `Sync ${provider.name}`}
                    >
                      {isSyncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span className="sr-only">Sync {provider.name}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-md border">
        <div className="border-b p-4">
          <h2 className="text-base font-semibold">Recent Sync Logs</h2>
          <p className="text-sm text-muted-foreground">Last 20 provider sync records, newest first.</p>
        </div>
        {logs.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No sync logs yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Found</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Expired</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="min-w-[240px]">Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.provider.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 capitalize">
                      <StatusIcon status={log.status} />
                      {log.status}
                    </span>
                  </TableCell>
                  <TableCell>{formatNumber(log.itemsFound)}</TableCell>
                  <TableCell>{formatNumber(log.itemsAdded)}</TableCell>
                  <TableCell>{formatNumber(log.itemsUpdated)}</TableCell>
                  <TableCell>{formatNumber(log.itemsExpired)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(log.startedAt)}</TableCell>
                  <TableCell>{formatDuration(log.durationMs)}</TableCell>
                  <TableCell className="max-w-[360px]">
                    <p className="truncate text-muted-foreground" title={log.error || ""}>
                      {log.error || "-"}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
