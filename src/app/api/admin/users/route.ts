import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, auditLog } from "@/lib/admin";
import type { Prisma } from "@/generated/prisma/client";

const ROLE_VALUES = ["user", "pro", "admin"] as const;
const ACTION_VALUES = ["ban", "unban", "role", "grant_pro", "revoke_pro"] as const;

type UserRole = (typeof ROLE_VALUES)[number];
type UserAction = (typeof ACTION_VALUES)[number];

function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && ROLE_VALUES.includes(value as UserRole);
}

function isValidAction(value: unknown): value is UserAction {
  return typeof value === "string" && ACTION_VALUES.includes(value as UserAction);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseFutureDate(value: unknown): Date | null {
  if (!isNonEmptyString(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date <= new Date()) return null;
  return date;
}

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

  if (role && !isValidRole(role)) {
    return NextResponse.json({ error: "Invalid role filter" }, { status: 400 });
  }

  if (banned !== null && banned !== "true" && banned !== "false") {
    return NextResponse.json({ error: "Invalid banned filter" }, { status: 400 });
  }

  const where: Prisma.AppUserWhereInput = {};
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
        proExpiresAt: true,
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
  const { id, action, reason, role, proExpiresAt } = body as Record<string, unknown>;

  if (!isNonEmptyString(id) || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  if (!isValidAction(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (action === "ban" && reason !== undefined && typeof reason !== "string") {
    return NextResponse.json({ error: "Invalid ban reason" }, { status: 400 });
  }

  if (action === "role" && !isValidRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const manualProExpiresAt = action === "grant_pro" ? parseFutureDate(proExpiresAt) : null;
  if (action === "grant_pro" && !manualProExpiresAt) {
    return NextResponse.json({ error: "Valid future Pro expiration is required" }, { status: 400 });
  }

  const user = await prisma.appUser.findUnique({
    where: { id },
    select: { email: true, role: true, tier: true, proExpiresAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "ban") {
    const normalizedReason = typeof reason === "string" ? reason.trim() : "";
    await prisma.appUser.update({
      where: { id },
      data: {
        banned: true,
        bannedAt: new Date(),
        bannedReason: normalizedReason || null,
      },
    });
    await auditLog("admin", "user.ban", id, {
      email: user.email,
      reason: normalizedReason || undefined,
    });
  } else if (action === "unban") {
    await prisma.appUser.update({
      where: { id },
      data: { banned: false, bannedAt: null, bannedReason: null },
    });
    await auditLog("admin", "user.unban", id, { email: user.email });
  } else if (action === "role") {
    // Role changes intentionally do not mutate paid-tier fields. Pro access is
    // controlled by the billing/tier path, not this generic role editor.
    const roleToUpdate = role as UserRole;
    await prisma.appUser.update({ where: { id }, data: { role: roleToUpdate } });
    await auditLog("admin", "user.role", id, {
      email: user.email,
      previousRole: user.role,
      role: roleToUpdate,
      tier: user.tier,
      proExpiresAt: user.proExpiresAt?.toISOString() ?? null,
    });
  } else if (action === "grant_pro") {
    const nextRole = user.role === "admin" ? "admin" : "pro";
    await prisma.appUser.update({
      where: { id },
      data: { tier: "pro", role: nextRole, proExpiresAt: manualProExpiresAt },
    });
    await auditLog("admin", "user.pro.grant", id, {
      email: user.email,
      previousTier: user.tier,
      previousRole: user.role,
      proExpiresAt: manualProExpiresAt?.toISOString() ?? null,
    });
  } else if (action === "revoke_pro") {
    const nextRole = user.role === "admin" ? "admin" : "user";
    await prisma.appUser.update({
      where: { id },
      data: { tier: "free", role: nextRole, proExpiresAt: null },
    });
    await auditLog("admin", "user.pro.revoke", id, {
      email: user.email,
      previousTier: user.tier,
      previousRole: user.role,
      previousProExpiresAt: user.proExpiresAt?.toISOString() ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
