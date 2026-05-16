import { NextResponse } from "next/server";
import { isAuthError, requireIndividualUser } from "@/lib/api-utils";
import { getRecommendations } from "@/lib/recommendations";

export async function GET() {
  const user = await requireIndividualUser();
  if (isAuthError(user)) return user;

  const listings = await getRecommendations({ userId: user.userId, limit: 12 });
  const res = NextResponse.json({ listings });
  res.headers.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
  return res;
}
