import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, auditLog } from "@/lib/admin";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const reason = url.searchParams.get("reason") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (reason) where.reason = reason;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
        review: {
          select: {
            id: true,
            title: true,
            body: true,
            listing: { select: { title: true, slug: true } },
            user: { select: { email: true, name: true } },
          },
        },
        reply: {
          select: {
            id: true,
            body: true,
            user: { select: { email: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.report.count({ where }),
  ]);

  return NextResponse.json({
    reports,
    total,
    page,
    totalPages: Math.ceil(total / limit),
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

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  if (action === "resolve") {
    await prisma.report.update({ where: { id }, data: { status: "reviewed" } });
    await auditLog("admin", "report.resolve", id, { reason: report.reason });
    return NextResponse.json({ ok: true });
  }

  if (action === "dismiss") {
    await prisma.report.update({ where: { id }, data: { status: "dismissed" } });
    await auditLog("admin", "report.dismiss", id, { reason: report.reason });
    return NextResponse.json({ ok: true });
  }

  if (action === "delete-content") {
    // Resolve the report AND delete the reported content
    if (report.reviewId) {
      await prisma.review.delete({ where: { id: report.reviewId } });
      await auditLog("admin", "review.delete-via-report", report.reviewId);
    } else if (report.replyId) {
      await prisma.reply.delete({ where: { id: report.replyId } });
      await auditLog("admin", "reply.delete-via-report", report.replyId);
    }
    await prisma.report.update({ where: { id }, data: { status: "reviewed" } });
    await auditLog("admin", "report.resolve-delete", id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action. Use: resolve, dismiss, delete-content" }, { status: 400 });
}
