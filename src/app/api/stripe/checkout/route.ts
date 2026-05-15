import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProUser } from "@/lib/pro";
import {
  getStripe,
  getStripePlan,
  getStripePlanAvailability,
  isStripeCheckoutConfigured,
  isStripeSecretConfigured,
  type StripePlanKey,
} from "@/lib/stripe";

export async function GET() {
  return NextResponse.json({
    checkoutAvailable: isStripeCheckoutConfigured(),
    plans: getStripePlanAvailability(),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;

  if (!userId || userId === "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { plan } = body as { plan?: StripePlanKey };
  const selectedPlan = getStripePlan(plan);

  if (!selectedPlan || !plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (!selectedPlan.priceId) {
    return NextResponse.json(
      { error: "Stripe Checkout is not available because this plan is not configured.", code: "stripe_price_not_configured" },
      { status: 503 },
    );
  }

  if (!isStripeSecretConfigured()) {
    return NextResponse.json(
      { error: "Stripe Checkout is not available because Stripe is not configured.", code: "stripe_not_configured" },
      { status: 503 },
    );
  }

  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { email: true, stripeCustomerId: true, tier: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (await isProUser(userId)) {
    return NextResponse.json({ error: "Already a Pro member" }, { status: 400 });
  }

  const stripe = getStripe();

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.appUser.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
    success_url: `${siteUrl}/billing?success=true`,
    cancel_url: `${siteUrl}/pricing?canceled=true`,
    subscription_data: {
      trial_period_days: 7,
      metadata: { userId, plan },
    },
    metadata: { userId, plan },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
