"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle, XCircle, Clock, Loader2, Database, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProviderStatus {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  apiType: string;
  authType: string;
  rateLimitPerMinute: number | null;
  syncFrequency: string;
  lastSyncAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastFailedSyncAt: string | null;
  failureCount: number;
  complianceNotes: string | null;
  _count: { listings: number; syncLogs: number };
}

interface SyncLogEntry {
  id: string;
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

export default function SyncDashboardPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null); // null = not syncing, "all" = all, or slug
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchData = useCallback(() => {
    fetch("/api/admin/sync")
      .then((r) => r.json())
      .then((data: { providers: ProviderStatus[]; recentLogs: SyncLogEntry[] }) => {
        setProviders(data.providers);
        setLogs(data.recentLogs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const triggerSync = (providerSlug?: string) => {
    const key = providerSlug ?? "all";
    setSyncing(key);
    setSyncResults([]);

    fetch("/api/admin/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(providerSlug ? { provider: providerSlug } : {}),
    })
      .then((r) => r.json())
      .then((data: { results: SyncResult[] }) => {
        setSyncResults(data.results);
        setSyncing(null);
        setRefreshKey((k) => k + 1);
      })
      .catch(() => setSyncing(null));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sync Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage API provider sync and monitor data ingestion</p>
        </div>
        <Button onClick={() => triggerSync()} disabled={syncing !== null}>
          {syncing === "all" ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing All...</>
          ) : (
            <><RefreshCw className="h-4 w-4 mr-2" /> Sync All Providers</>
          )}
        </Button>
      </div>

      {/* Sync results banner */}
      {syncResults.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <h3 className="font-semibold mb-2">Sync Results</h3>
          <div className="space-y-2">
            {syncResults.map((r) => (
              <div key={r.providerSlug} className="flex items-center gap-3 text-sm">
                {r.error ? (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                ) : r.skipped ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                )}
                <span className="font-medium">{r.providerName}</span>
                {r.result && (
                  <span className="text-muted-foreground">
                    Found {r.result.itemsFound}, Added {r.result.itemsAdded}, Updated {r.result.itemsUpdated}
                    , Skipped {r.result.itemsSkipped}, Expired {r.result.itemsExpired}
                    {r.result.errors.length > 0 && ` (${r.result.errors.length} errors)`}
                  </span>
                )}
                {r.skipped && <span className="text-muted-foreground">{r.error || "Skipped"}</span>}
                {r.error && !r.skipped && <span className="text-red-500">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((p) => (
          <div key={p.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">{p.name}</h3>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                p.isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}>
                {p.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground mb-3">
              <div className="flex justify-between">
                <span>Type</span>
                <span className="font-medium text-foreground">{p.apiType}</span>
              </div>
              <div className="flex justify-between">
                <span>Auth</span>
                <span className="font-medium text-foreground">{p.authType}</span>
              </div>
              <div className="flex justify-between">
                <span>Rate limit</span>
                <span className="font-medium text-foreground">{p.rateLimitPerMinute ? `${p.rateLimitPerMinute}/min` : "Default"}</span>
              </div>
              <div className="flex justify-between">
                <span>Frequency</span>
                <span className="font-medium text-foreground">{p.syncFrequency}</span>
              </div>
              <div className="flex justify-between">
                <span>Failures</span>
                <span className="font-medium text-foreground">{p.failureCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Listings</span>
                <span className="font-medium text-foreground">{p._count.listings}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Syncs</span>
                <span className="font-medium text-foreground">{p._count.syncLogs}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Sync</span>
                <span className="font-medium text-foreground">
                  {p.lastSyncAt ? new Date(p.lastSyncAt).toLocaleString() : "Never"}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!p.isActive || syncing !== null || p.apiType === "manual"}
              onClick={() => triggerSync(p.slug)}
            >
              {syncing === p.slug ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Syncing...</>
              ) : p.apiType === "manual" ? (
                "Manual Only"
              ) : (
                <><RefreshCw className="h-3 w-3 mr-1" /> Sync Now</>
              )}
            </Button>
          </div>
        ))}
      </div>

      {/* Recent sync logs */}
      <div>
        <h2 className="text-lg font-bold mb-3">Recent Sync Logs</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sync logs yet. Trigger a sync above.</p>
        ) : (
          <div className="rounded-xl border overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Provider</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Found</th>
                  <th className="text-left px-4 py-2 font-medium">Added</th>
                  <th className="text-left px-4 py-2 font-medium">Skipped</th>
                  <th className="text-left px-4 py-2 font-medium">Expired</th>
                  <th className="text-left px-4 py-2 font-medium">Started</th>
                  <th className="text-left px-4 py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                    <td className="px-4 py-2 font-medium">{log.provider.name}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 ${
                        log.status === "success"
                          ? "text-green-600"
                          : log.status === "error"
                            ? "text-red-600"
                            : "text-yellow-600"
                      }`}>
                        {log.status === "success" ? <CheckCircle className="h-3 w-3" /> :
                         log.status === "error" ? <XCircle className="h-3 w-3" /> :
                         <Clock className="h-3 w-3" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{log.itemsFound}</td>
                    <td className="px-4 py-2">{log.itemsAdded}</td>
                    <td className="px-4 py-2">{log.itemsSkipped}</td>
                    <td className="px-4 py-2">{log.itemsExpired}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{log.durationMs ? `${Math.round(log.durationMs / 100) / 10}s` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
