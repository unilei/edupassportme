import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, STRIPE_PLANS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;

  if (!userId || userId === "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { plan } = body as { plan?: "pro_monthly" | "pro_yearly" };

  if (!plan || !STRIPE_PLANS[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const selectedPlan = STRIPE_PLANS[plan];
  if (!selectedPlan.priceId) {
    return NextResponse.json({ error: "Stripe price not configured" }, { status: 500 });
  }

  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { email: true, stripeCustomerId: true, tier: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.tier === "pro") {
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
