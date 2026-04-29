import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, auditLog } from "@/lib/admin";

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

  const where: Record<string, unknown> = {};
  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }
  if (type) where.type = type;
  if (verified === "true") where.verified = true;
  if (verified === "false") where.verified = false;

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        verified: true,
        featured: true,
        viewCount: true,
        clickCount: true,
        provider: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.listing.count({ where }),
  ]);

  return NextResponse.json({ listings, total, page, totalPages: Math.ceil(total / limit) });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ids, action } = body as {
    id?: string;
    ids?: string[];
    action: "verify" | "unverify" | "feature" | "unfeature";
  };

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  const updates: Record<string, boolean> = {};
  if (action === "verify") updates.verified = true;
  else if (action === "unverify") updates.verified = false;
  else if (action === "feature") updates.featured = true;
  else if (action === "unfeature") updates.featured = false;

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

  const listing = await prisma.listing.findUnique({ where: { id }, select: { title: true } });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  await prisma.listing.update({ where: { id }, data: updates });
  await auditLog("admin", `listing.${action}`, id, { title: listing.title });

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
