import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { syncAllProviders, syncSingleProvider } from "@/lib/providers/registry";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
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
  // GET returns provider status overview (no auth needed for status check)
  const { prisma } = await import("@/lib/prisma");

  const providers = await prisma.provider.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      apiType: true,
      syncFrequency: true,
      lastSyncAt: true,
      _count: { select: { listings: true, syncLogs: true } },
    },
  });

  const recentLogs = await prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { provider: { select: { name: true, slug: true } } },
  });

  return NextResponse.json({ providers, recentLogs });
}
