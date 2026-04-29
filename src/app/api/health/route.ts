import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const startTime = Date.now();

export async function GET() {
  const checks: Record<string, unknown> = {};
  let healthy = true;

  // Database check with latency
  const dbStart = Date.now();
  try {
    await prisma.$queryRawUnsafe<unknown[]>("SELECT 1");
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: "error", message: "Database unreachable" };
    healthy = false;
  }

  // Memory usage
  const mem = process.memoryUsage();
  checks.memory = {
    rss: `${(mem.rss / 1024 / 1024).toFixed(1)}MB`,
    heap: `${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
  };

  const body = {
    status: healthy ? "ok" : "error",
    version: process.env.npm_package_version || "unknown",
    uptime: `${((Date.now() - startTime) / 1000).toFixed(0)}s`,
    timestamp: new Date().toISOString(),
    checks,
  };

  return NextResponse.json(body, { status: healthy ? 200 : 503 });
}
