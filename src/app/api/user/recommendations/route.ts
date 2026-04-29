import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecommendations } from "@/lib/recommendations";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;

  if (!userId || userId === "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listings = await getRecommendations({ userId, limit: 12 });
  const res = NextResponse.json({ listings });
  res.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
  return res;
}
