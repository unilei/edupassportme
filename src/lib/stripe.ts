import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(key, { apiVersion: "2026-01-28.clover" });
  }
  return _stripe;
}

export const STRIPE_PLANS = {
  pro_monthly: {
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "",
    name: "Pro Monthly",
    price: 9.99,
    interval: "month" as const,
  },
  pro_yearly: {
    priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "",
    name: "Pro Yearly",
    price: 79.99,
    interval: "year" as const,
  },
};
