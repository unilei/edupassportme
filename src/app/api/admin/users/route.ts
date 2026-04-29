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
  const role = url.searchParams.get("role") || "";
  const banned = url.searchParams.get("banned");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role;
  if (banned === "true") where.banned = true;
  if (banned === "false") where.banned = false;

  const [users, total] = await Promise.all([
    prisma.appUser.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        banned: true,
        bannedAt: true,
        bannedReason: true,
        emailVerified: true,
        createdAt: true,
        _count: { select: { reviews: true, applications: true, savedListings: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.appUser.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, action, reason, role } = body as {
    id: string;
    action: "ban" | "unban" | "role";
    reason?: string;
    role?: string;
  };

  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  const user = await prisma.appUser.findUnique({ where: { id }, select: { email: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "ban") {
    await prisma.appUser.update({
      where: { id },
      data: { banned: true, bannedAt: new Date(), bannedReason: reason || null },
    });
    await auditLog("admin", "user.ban", id, { email: user.email, reason });
  } else if (action === "unban") {
    await prisma.appUser.update({
      where: { id },
      data: { banned: false, bannedAt: null, bannedReason: null },
    });
    await auditLog("admin", "user.unban", id, { email: user.email });
  } else if (action === "role" && role) {
    await prisma.appUser.update({ where: { id }, data: { role } });
    await auditLog("admin", "user.role", id, { email: user.email, role });
  }

  return NextResponse.json({ ok: true });
}
