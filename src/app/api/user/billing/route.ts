import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;

  if (!userId || userId === "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { tier: true },
  });

  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["active", "trialing", "past_due"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      plan: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      trialEnd: true,
    },
  });

  return NextResponse.json({
    tier: user?.tier || "free",
    subscription: subscription || null,
  });
}
