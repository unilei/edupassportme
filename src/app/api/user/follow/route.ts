import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isAuthError } from "@/lib/api-utils";
import { checkAndAwardBadges } from "@/lib/badges";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  if (isAuthError(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") || "following"; // following | followers
  const uid = user.userId;

  if (tab === "followers") {
    const followers = await prisma.follow.findMany({
      where: { followingId: uid },
      include: { follower: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ followers: followers.map((f) => f.follower), count: followers.length });
  }

  const following = await prisma.follow.findMany({
    where: { followerId: uid },
    include: { following: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ following: following.map((f) => f.following), count: following.length });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (isAuthError(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = user.userId;
  const body = await req.json();
  const { targetUserId } = body as { targetUserId?: string };

  if (!targetUserId) {
    return NextResponse.json({ error: "targetUserId required" }, { status: 400 });
  }

  if (targetUserId === uid) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const target = await prisma.appUser.findUnique({ where: { id: targetUserId } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Toggle follow/unfollow
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: uid, followingId: targetUserId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ following: false });
  }

  await prisma.follow.create({
    data: { followerId: uid, followingId: targetUserId },
  });

  // Record activity
  await prisma.userActivity.create({
    data: {
      userId: uid,
      type: "follow",
      message: `Started following ${target.name || target.email}`,
      link: `/user/${targetUserId}`,
      meta: { targetUserId } as unknown as Prisma.InputJsonValue,
    },
  });

  // Check badges for both users
  await Promise.all([
    checkAndAwardBadges(uid),
    checkAndAwardBadges(targetUserId),
  ]);

  return NextResponse.json({ following: true });
}
