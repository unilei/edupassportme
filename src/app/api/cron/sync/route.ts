import { NextRequest, NextResponse } from "next/server";
import { syncAllProviders } from "@/lib/providers/registry";

export const maxDuration = 300; // 5 minutes max for serverless

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await syncAllProviders();

    const summary = {
      timestamp: new Date().toISOString(),
      totalProviders: results.length,
      synced: results.filter((r) => !r.skipped && !r.error).length,
      skipped: results.filter((r) => r.skipped).length,
      failed: results.filter((r) => !r.skipped && r.error).length,
      totalItemsFound: results.reduce((sum, r) => sum + (r.result?.itemsFound ?? 0), 0),
      totalItemsAdded: results.reduce((sum, r) => sum + (r.result?.itemsAdded ?? 0), 0),
      totalItemsUpdated: results.reduce((sum, r) => sum + (r.result?.itemsUpdated ?? 0), 0),
      totalItemsSkipped: results.reduce((sum, r) => sum + (r.result?.itemsSkipped ?? 0), 0),
      totalItemsExpired: results.reduce((sum, r) => sum + (r.result?.itemsExpired ?? 0), 0),
      results,
    };

    console.log("[Cron Sync]", JSON.stringify(summary, null, 2));

    return NextResponse.json(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Cron Sync] Fatal error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
