import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (isAuthError(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.userId;
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const skip = (page - 1) * limit;
  const scope = url.searchParams.get("scope") || "following"; // following | me

  let userIds: string[];

  if (scope === "me") {
    userIds = [uid];
  } else {
    // Get IDs of users I follow
    const follows = await prisma.follow.findMany({
      where: { followerId: uid },
      select: { followingId: true },
    });
    userIds = [uid, ...follows.map((f) => f.followingId)];
  }

  const [activities, total] = await Promise.all([
    prisma.userActivity.findMany({
      where: { userId: { in: userIds } },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.userActivity.count({ where: { userId: { in: userIds } } }),
  ]);

  return NextResponse.json({
    activities,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
