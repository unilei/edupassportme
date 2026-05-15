import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(sub);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(sub);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
  }

  return new Response("ok", { status: 200 });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan || "pro_monthly";
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) return;

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const item = sub.items.data[0];
  const periodStart = item?.current_period_start ?? sub.start_date;
  const periodEnd = item?.current_period_end ?? sub.start_date;

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscriptionId },
    create: {
      userId,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: item?.price.id || "",
      status: sub.status,
      plan,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    },
    update: {
      stripePriceId: item?.price.id || "",
      status: sub.status,
      plan,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    },
  });

  // Upgrade user to Pro
  await prisma.appUser.update({
    where: { id: userId },
    data: {
      tier: "pro",
      role: "pro",
      proExpiresAt: new Date(periodEnd * 1000),
    },
  });
}

async function handleSubscriptionUpdate(sub: Stripe.Subscription) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
  });

  if (!existing) return;

  const item = sub.items.data[0];
  const periodStart = item?.current_period_start ?? sub.start_date;
  const periodEnd = item?.current_period_end ?? sub.start_date;

  await prisma.subscription.update({
    where: { stripeSubscriptionId: sub.id },
    data: {
      stripePriceId: item?.price.id || existing.stripePriceId,
      status: sub.status,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    },
  });

  // Sync user tier
  if (sub.status === "active" || sub.status === "trialing") {
    await prisma.appUser.update({
      where: { id: existing.userId },
      data: {
        tier: "pro",
        role: "pro",
        proExpiresAt: new Date(periodEnd * 1000),
      },
    });
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
  });

  if (!existing) return;

  await prisma.subscription.update({
    where: { stripeSubscriptionId: sub.id },
    data: {
      status: "canceled",
      canceledAt: new Date(),
    },
  });

  // Downgrade user
  await prisma.appUser.update({
    where: { id: existing.userId },
    data: {
      tier: "free",
      role: "user",
      proExpiresAt: null,
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  const user = await prisma.appUser.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (user) {
    // Create notification for failed payment
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "system",
        title: "Payment Failed",
        body: "Your subscription payment failed. Please update your payment method to keep your Pro access.",
        link: "/billing",
      },
    });
  }
}
