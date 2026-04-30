import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  // Prefix search using tsquery for fast matching
  const tsquery = q
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(" & ");

  const results = await prisma.$queryRawUnsafe<{ title: string; slug: string; type: string }[]>(
    `SELECT "title", "slug", "type"
     FROM "Listing"
     WHERE "searchVector" @@ to_tsquery('english', $1)
       AND "status" = $2
       AND ("expiresAt" IS NULL OR "expiresAt" >= NOW())
       AND ("endDate" IS NULL OR "endDate" >= NOW())
     ORDER BY ts_rank("searchVector", to_tsquery('english', $1)) DESC
     LIMIT 8`,
    tsquery,
    "active",
  );

  const res = NextResponse.json({
    suggestions: results.map((r) => ({
      title: r.title,
      slug: r.slug,
      type: r.type,
    })),
  });
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res;
}
