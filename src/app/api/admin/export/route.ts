import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, auditLog } from "@/lib/admin";

function escapeCsv(val: unknown): string {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsv).join(","));
  }
  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (type === "users") {
    const users = await prisma.appUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        banned: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const csv = toCsv(
      ["ID", "Email", "Name", "Role", "Tier", "Banned", "Email Verified", "Created At"],
      users.map((u) => [
        u.id, u.email, u.name, u.role, u.tier, u.banned, u.emailVerified, u.createdAt.toISOString(),
      ]),
    );

    await auditLog("admin", "export.users", undefined, { count: users.length });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users-${Date.now()}.csv"`,
      },
    });
  }

  if (type === "listings") {
    const listings = await prisma.listing.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        url: true,
        price: true,
        rating: true,
        viewCount: true,
        clickCount: true,
        verified: true,
        featured: true,
        provider: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const csv = toCsv(
      ["ID", "Title", "Slug", "Type", "URL", "Price", "Rating", "Views", "Clicks", "Verified", "Featured", "Provider", "Created At"],
      listings.map((l) => [
        l.id, l.title, l.slug, l.type, l.url, l.price, l.rating,
        l.viewCount, l.clickCount, l.verified, l.featured,
        l.provider.name, l.createdAt.toISOString(),
      ]),
    );

    await auditLog("admin", "export.listings", undefined, { count: listings.length });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="listings-${Date.now()}.csv"`,
      },
    });
  }

  if (type === "reviews") {
    const reviews = await prisma.review.findMany({
      include: {
        user: { select: { email: true, name: true } },
        listing: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const csv = toCsv(
      ["ID", "User Email", "User Name", "Listing Title", "Rating", "Title", "Body", "Helpful", "Created At"],
      reviews.map((r) => [
        r.id, r.user.email, r.user.name, r.listing.title,
        r.rating, r.title, r.body, r.helpful, r.createdAt.toISOString(),
      ]),
    );

    await auditLog("admin", "export.reviews", undefined, { count: reviews.length });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reviews-${Date.now()}.csv"`,
      },
    });
  }

  if (type === "reports") {
    const reports = await prisma.report.findMany({
      include: {
        user: { select: { email: true, name: true } },
        review: { select: { title: true } },
        reply: { select: { body: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const format = url.searchParams.get("format");
    if (format === "json") {
      await auditLog("admin", "export.reports.json", undefined, { count: reports.length });
      return NextResponse.json(reports);
    }

    const csv = toCsv(
      ["ID", "Reporter Email", "Reason", "Details", "Status", "Review Title", "Reply Body", "Created At"],
      reports.map((r) => [
        r.id, r.user.email, r.reason, r.details,
        r.status, r.review?.title, r.reply?.body, r.createdAt.toISOString(),
      ]),
    );

    await auditLog("admin", "export.reports", undefined, { count: reports.length });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="reports-${Date.now()}.csv"`,
      },
    });
  }

  if (type === "subscriptions") {
    const subs = await prisma.subscription.findMany({
      include: {
        user: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const format = url.searchParams.get("format");
    if (format === "json") {
      await auditLog("admin", "export.subscriptions.json", undefined, { count: subs.length });
      return NextResponse.json(subs);
    }

    const csv = toCsv(
      ["ID", "User Email", "User Name", "Plan", "Status", "Cancel At Period End", "Period End", "Created At"],
      subs.map((s) => [
        s.id, s.user.email, s.user.name, s.plan, s.status,
        s.cancelAtPeriodEnd, s.currentPeriodEnd.toISOString(), s.createdAt.toISOString(),
      ]),
    );

    await auditLog("admin", "export.subscriptions", undefined, { count: subs.length });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="subscriptions-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid export type. Use: users, listings, reviews, reports, subscriptions" }, { status: 400 });
}
