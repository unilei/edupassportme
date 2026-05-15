import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripePlanAvailability, isStripeCheckoutConfigured, isStripeSecretConfigured } from "@/lib/stripe";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;

  if (!userId || userId === "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { tier: true, proExpiresAt: true, stripeCustomerId: true },
  });

  const subscription = await prisma.subscription.findFirst({
    where: { userId },
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

  const now = new Date();
  const hasActiveStripeSubscription =
    Boolean(subscription) &&
    ["active", "trialing"].includes(subscription!.status) &&
    subscription!.currentPeriodEnd > now;
  const hasManualProAccess =
    user?.tier === "pro" &&
    (!user.proExpiresAt || user.proExpiresAt > now) &&
    !hasActiveStripeSubscription;
  const tier = hasActiveStripeSubscription || hasManualProAccess ? "pro" : "free";

  return NextResponse.json({
    tier,
    proExpiresAt: user?.proExpiresAt || null,
    subscription: subscription || null,
    portalAvailable: Boolean(user?.stripeCustomerId && isStripeSecretConfigured()),
    checkoutAvailable: isStripeCheckoutConfigured(),
    checkoutPlans: getStripePlanAvailability(),
    source: hasActiveStripeSubscription ? "stripe" : hasManualProAccess ? "manual" : "free",
  });
}
