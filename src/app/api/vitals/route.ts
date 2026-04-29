import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

interface VitalEntry {
  name: string;
  value: number;
  rating: string;
  id: string;
  navigationType: string;
  path: string;
  timestamp: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const vitals: VitalEntry[] = body.vitals || (body.name ? [body] : []);

    for (const vital of vitals) {
      const level = vital.rating === "poor" ? "warn" : "info";
      logger[level](`[WebVital] ${vital.name}=${Math.round(vital.value)} rating=${vital.rating} path=${vital.path}`);
    }

    // Count poor metrics for alerting
    const poorCount = vitals.filter((v) => v.rating === "poor").length;
    if (poorCount > 0) {
      logger.warn(`[WebVitals Alert] ${poorCount} poor metric(s) in batch`);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
