import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const type = searchParams.get("type") || "";
  const provider = searchParams.get("provider") || "";
  const level = searchParams.get("level") || "";
  const priceMax = searchParams.get("priceMax") || "";
  const sort = searchParams.get("sort") || "relevance";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = 12;

  if (!q) {
    return NextResponse.json({ listings: [], total: 0, page: 1, totalPages: 0 });
  }

  // Build tsquery from user input: split words and join with & for AND matching
  const tsquery = q
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => `${w}:*`) // prefix matching
    .join(" & ");

  // Build WHERE clauses
  const conditions: string[] = [`"searchVector" @@ to_tsquery('english', $1)`];
  const params: (string | number)[] = [tsquery];
  let paramIdx = 2;

  if (type) {
    conditions.push(`"type" = $${paramIdx}`);
    params.push(type);
    paramIdx++;
  }
  if (level) {
    conditions.push(`"level" = $${paramIdx}`);
    params.push(level);
    paramIdx++;
  }
  if (priceMax) {
    conditions.push(`"price" <= $${paramIdx}`);
    params.push(parseFloat(priceMax));
    paramIdx++;
  }
  if (provider) {
    conditions.push(`"providerId" IN (SELECT "id" FROM "Provider" WHERE "slug" = $${paramIdx})`);
    params.push(provider);
    paramIdx++;
  }

  const whereClause = conditions.join(" AND ");

  // Order by
  let orderClause: string;
  switch (sort) {
    case "newest":
      orderClause = `"createdAt" DESC`;
      break;
    case "price":
      orderClause = `"price" ASC NULLS LAST`;
      break;
    case "rating":
      orderClause = `"rating" DESC NULLS LAST`;
      break;
    default: // relevance
      orderClause = `ts_rank("searchVector", to_tsquery('english', $1)) DESC`;
      break;
  }

  // Count + fetch in parallel using raw SQL for FTS
  const countParam = paramIdx;
  params.push(limit); // for LIMIT
  const limitParamIdx = paramIdx;
  paramIdx++;
  params.push((page - 1) * limit); // for OFFSET
  const offsetParamIdx = paramIdx;

  const [countResult, listings] = await Promise.all([
    prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM "Listing" WHERE ${whereClause}`,
      ...params.slice(0, countParam - 1)
    ),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT l."id", l."title", l."slug", l."type", l."description", l."image",
              l."price", l."currency", l."priceLabel", l."rating", l."reviewCount",
              l."level", l."duration", l."location", l."featured",
              l."createdAt",
              p."name" as "providerName", p."slug" as "providerSlug", p."logo" as "providerLogo",
              ts_rank(l."searchVector", to_tsquery('english', $1)) as rank
       FROM "Listing" l
       JOIN "Provider" p ON p."id" = l."providerId"
       WHERE ${whereClause.replace(/"searchVector"/g, 'l."searchVector"').replace(/"type"/g, 'l."type"').replace(/"level"/g, 'l."level"').replace(/"price"/g, 'l."price"').replace(/"providerId"/g, 'l."providerId"')}
       ORDER BY ${orderClause.replace(/"searchVector"/g, 'l."searchVector"').replace(/"createdAt"/g, 'l."createdAt"').replace(/"price"/g, 'l."price"').replace(/"rating"/g, 'l."rating"')}
       LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      ...params
    ),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  const res = NextResponse.json({
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      slug: l.slug,
      type: l.type,
      description: l.description,
      image: l.image,
      price: l.price ? Number(l.price) : null,
      currency: l.currency,
      priceLabel: l.priceLabel,
      rating: l.rating ? Number(l.rating) : null,
      reviewCount: l.reviewCount ? Number(l.reviewCount) : null,
      level: l.level,
      duration: l.duration,
      location: l.location,
      featured: l.featured,
      createdAt: l.createdAt,
      provider: { name: l.providerName, slug: l.providerSlug, logo: l.providerLogo },
      rank: l.rank ? Number(l.rank) : 0,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
  res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  return res;
}
