import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  return id && id !== "admin" ? id : null;
}

// GET — list notifications (with unread count)
export async function GET(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const unreadOnly = searchParams.get("unread") === "true";

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

// PATCH — mark notifications as read
export async function PATCH(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, all } = body as { id?: string; all?: boolean };

  if (all) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  } else if (id) {
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  } else {
    return NextResponse.json({ error: "Provide 'id' or 'all: true'" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
