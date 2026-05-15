import Stripe from "stripe";

let _stripe: Stripe | null = null;

export const STRIPE_API_VERSION = "2026-01-28.clover";

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  }
  return _stripe;
}

export const STRIPE_PLANS = {
  pro_monthly: {
    get priceId() {
      return process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "";
    },
    name: "Pro Monthly",
    price: 9.99,
    interval: "month" as const,
  },
  pro_yearly: {
    get priceId() {
      return process.env.STRIPE_PRO_YEARLY_PRICE_ID || "";
    },
    name: "Pro Yearly",
    price: 79.99,
    interval: "year" as const,
  },
};

export type StripePlanKey = keyof typeof STRIPE_PLANS;

export function isStripeSecretConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripePlan(plan: string | undefined): (typeof STRIPE_PLANS)[StripePlanKey] | null {
  if (!plan || !(plan in STRIPE_PLANS)) return null;
  return STRIPE_PLANS[plan as StripePlanKey];
}

export function getStripePlanAvailability() {
  return Object.fromEntries(
    Object.entries(STRIPE_PLANS).map(([key, plan]) => [
      key,
      {
        name: plan.name,
        price: plan.price,
        interval: plan.interval,
        configured: Boolean(plan.priceId),
      },
    ]),
  ) as Record<StripePlanKey, { name: string; price: number; interval: "month" | "year"; configured: boolean }>;
}

export function isStripeCheckoutConfigured(plan?: StripePlanKey): boolean {
  if (!isStripeSecretConfigured()) return false;
  if (plan) return Boolean(STRIPE_PLANS[plan].priceId);
  return Object.values(STRIPE_PLANS).some((stripePlan) => Boolean(stripePlan.priceId));
}
