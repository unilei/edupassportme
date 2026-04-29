import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, auditLog } from "@/lib/admin";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const plan = url.searchParams.get("plan") || "";
  const search = url.searchParams.get("search") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (plan) where.plan = plan;
  if (search) {
    where.user = {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true, tier: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.subscription.count({ where }),
  ]);

  // Summary stats
  const [activeCount, cancelingCount, revenue] = await Promise.all([
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.subscription.count({ where: { cancelAtPeriodEnd: true, status: "active" } }),
    prisma.subscription.count({ where: { status: "active", plan: "pro_yearly" } }),
  ]);

  return NextResponse.json({
    subscriptions,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    stats: {
      active: activeCount,
      canceling: cancelingCount,
      yearly: revenue,
      monthly: activeCount - revenue,
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, action } = body as { id?: string; action?: string };

  if (!id || !action) {
    return NextResponse.json({ error: "id and action required" }, { status: 400 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  if (action === "cancel") {
    await prisma.subscription.update({
      where: { id },
      data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
    });
    await auditLog("admin", "subscription.cancel", id, { userId: sub.userId, email: sub.user.email });
    return NextResponse.json({ ok: true });
  }

  if (action === "reactivate") {
    await prisma.subscription.update({
      where: { id },
      data: { cancelAtPeriodEnd: false, canceledAt: null },
    });
    await auditLog("admin", "subscription.reactivate", id, { userId: sub.userId, email: sub.user.email });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action. Use: cancel, reactivate" }, { status: 400 });
}
