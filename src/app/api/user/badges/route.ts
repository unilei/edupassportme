import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthError } from "@/lib/api-utils";
import { BADGES } from "@/lib/badges";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (isAuthError(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.userId;
  const url = new URL(req.url);
  const targetId = url.searchParams.get("userId") || uid;

  const awarded = await prisma.userBadge.findMany({
    where: { userId: targetId },
    orderBy: { awardedAt: "desc" },
  });

  const awardedSet = new Set(awarded.map((b) => b.badge));

  const badges = BADGES.map((def) => {
    const userBadge = awarded.find((b) => b.badge === def.slug);
    return {
      ...def,
      awarded: awardedSet.has(def.slug),
      awardedAt: userBadge?.awardedAt || null,
    };
  });

  return NextResponse.json({
    badges,
    earned: awarded.length,
    total: BADGES.length,
  });
}
