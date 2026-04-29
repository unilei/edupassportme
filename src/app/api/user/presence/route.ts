import { NextRequest, NextResponse } from "next/server";
import { requireUser, isAuthError } from "@/lib/api-utils";

// In-memory presence store (swap to Redis for multi-instance)
const presenceMap = new Map<string, number>(); // userId -> lastSeen timestamp
const ONLINE_THRESHOLD = 90_000; // 90 seconds

/**
 * POST /api/user/presence — heartbeat from client
 */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (isAuthError(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const status = (body as Record<string, unknown>).status;

  if (status === "offline") {
    presenceMap.delete(user.userId);
  } else {
    presenceMap.set(user.userId, Date.now());
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/user/presence?userId=xxx — check if a user is online
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get("userId");

  if (!targetId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const lastSeen = presenceMap.get(targetId);
  const online = !!lastSeen && Date.now() - lastSeen < ONLINE_THRESHOLD;

  return NextResponse.json({ online, lastSeen: lastSeen ?? null });
}
