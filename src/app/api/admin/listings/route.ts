import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, auditLog } from "@/lib/admin";

const LOW_QUALITY_THRESHOLD = 0.4;

const MODERATION_ACTIONS = [
  "verify",
  "unverify",
  "feature",
  "unfeature",
  "hide",
  "restore",
  "needs_review",
] as const;

type ModerationAction = (typeof MODERATION_ACTIONS)[number];

function isModerationAction(action: unknown): action is ModerationAction {
  return typeof action === "string" && MODERATION_ACTIONS.includes(action as ModerationAction);
}

function getActionUpdates(action: ModerationAction): Record<string, string | boolean> {
  if (action === "verify") return { verified: true };
  if (action === "unverify") return { verified: false };
  if (action === "feature") return { featured: true };
  if (action === "unfeature") return { featured: false };
  if (action === "hide") return { status: "hidden", verified: false, featured: false };
  if (action === "restore") return { status: "active" };
  return { status: "needs_review", verified: false, featured: false };
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const search = url.searchParams.get("search") || "";
  const type = url.searchParams.get("type") || "";
  const verified = url.searchParams.get("verified");
  const status = url.searchParams.get("status") || "";
  const provider = url.searchParams.get("provider") || "";
  const quality = url.searchParams.get("quality") || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }
  if (type) where.type = type;
  if (verified === "true") where.verified = true;
  if (verified === "false") where.verified = false;
  if (status) where.status = status;
  if (provider) where.provider = { slug: provider };
  if (quality === "low") where.qualityScore = { lt: LOW_QUALITY_THRESHOLD };
  if (quality === "zero") where.qualityScore = 0;

  const [listings, total, providers, statusGroups, lowQualityCount] = await Promise.all([
    prisma.listing.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        verified: true,
        featured: true,
        status: true,
        qualityScore: true,
        viewCount: true,
        clickCount: true,
        externalId: true,
        lastSeenAt: true,
        expiresAt: true,
        provider: { select: { name: true, slug: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.listing.count({ where }),
    prisma.provider.findMany({
      select: {
        name: true,
        slug: true,
        _count: { select: { listings: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.listing.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.listing.count({ where: { qualityScore: { lt: LOW_QUALITY_THRESHOLD } } }),
  ]);

  const statusCounts = Object.fromEntries(
    statusGroups.map((group) => [group.status, group._count._all]),
  );

  return NextResponse.json({
    listings,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    providers: providers.map((item) => ({
      name: item.name,
      slug: item.slug,
      count: item._count.listings,
    })),
    summary: {
      statusCounts,
      lowQualityCount,
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ids, action } = body as {
    id?: string;
    ids?: string[];
    action?: unknown;
  };

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }
  if (!isModerationAction(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updates = getActionUpdates(action);

  // Batch operation
  if (ids && ids.length > 0) {
    const result = await prisma.listing.updateMany({ where: { id: { in: ids } }, data: updates });
    await auditLog("admin", `listing.batch.${action}`, undefined, { count: result.count, ids });
    return NextResponse.json({ ok: true, count: result.count });
  }

  // Single operation
  if (!id) {
    return NextResponse.json({ error: "Missing id or ids" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { title: true, status: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  await prisma.listing.update({ where: { id }, data: updates });
  await auditLog("admin", `listing.${action}`, id, {
    title: listing.title,
    previousStatus: listing.status,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const idsParam = url.searchParams.get("ids");

  // Bulk delete
  if (idsParam) {
    const ids = idsParam.split(",").filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }
    const result = await prisma.listing.deleteMany({ where: { id: { in: ids } } });
    await auditLog("admin", "listing.batch.delete", undefined, { count: result.count, ids });
    return NextResponse.json({ ok: true, count: result.count });
  }

  // Single delete
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id }, select: { title: true } });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  await prisma.listing.delete({ where: { id } });
  await auditLog("admin", "listing.delete", id, { title: listing.title });

  return NextResponse.json({ ok: true });
}
