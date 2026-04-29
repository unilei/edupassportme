import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/api-utils";

/**
 * GET /api/admin/performance
 * Returns server-side performance metrics: memory, uptime, and Next.js config insights.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (isAuthError(admin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mem = process.memoryUsage();
  const toMB = (bytes: number) => Math.round(bytes / 1024 / 1024 * 100) / 100;

  return NextResponse.json({
    uptime: Math.round(process.uptime()),
    memory: {
      rss: toMB(mem.rss),
      heapUsed: toMB(mem.heapUsed),
      heapTotal: toMB(mem.heapTotal),
      external: toMB(mem.external),
    },
    node: process.version,
    env: process.env.NODE_ENV,
    caching: {
      isrPages: 12,
      apiCacheEnabled: true,
      imageCacheTTL: 86400,
    },
    optimization: {
      standalone: !!process.env.DOCKER_BUILD,
      compress: true,
      optimizeCss: true,
      optimizePackageImports: ["lucide-react", "radix-ui"],
      dynamicImports: ["ChatAssistant", "InstallPrompt", "ServiceWorkerRegistrar", "WebVitals"],
    },
  });
}
