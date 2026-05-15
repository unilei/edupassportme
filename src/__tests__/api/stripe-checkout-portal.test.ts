import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  appUserFindUnique: vi.fn(),
  appUserUpdate: vi.fn(),
  isProUser: vi.fn(),
  getStripe: vi.fn(),
  getStripePlan: vi.fn(),
  getStripePlanAvailability: vi.fn(),
  isStripeCheckoutConfigured: vi.fn(),
  isStripeSecretConfigured: vi.fn(),
  customerCreate: vi.fn(),
  checkoutSessionCreate: vi.fn(),
  portalSessionCreate: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: {
      findUnique: mocks.appUserFindUnique,
      update: mocks.appUserUpdate,
    },
  },
}));

vi.mock("@/lib/pro", () => ({
  isProUser: mocks.isProUser,
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: mocks.getStripe,
  getStripePlan: mocks.getStripePlan,
  getStripePlanAvailability: mocks.getStripePlanAvailability,
  isStripeCheckoutConfigured: mocks.isStripeCheckoutConfigured,
  isStripeSecretConfigured: mocks.isStripeSecretConfigured,
}));

import { GET as getCheckoutStatus, POST as postCheckout } from "@/app/api/stripe/checkout/route";
import { POST as postPortal } from "@/app/api/stripe/portal/route";

function checkoutRequest(plan: string) {
  return new NextRequest("http://localhost:3000/api/stripe/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Stripe checkout and portal routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "https://edupassport.test";
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    mocks.getStripePlan.mockReturnValue({
      priceId: "price_monthly",
      name: "Pro Monthly",
      price: 9.99,
      interval: "month",
    });
    mocks.getStripePlanAvailability.mockReturnValue({
      pro_monthly: { name: "Pro Monthly", price: 9.99, interval: "month", configured: true },
      pro_yearly: { name: "Pro Yearly", price: 79.99, interval: "year", configured: true },
    });
    mocks.isStripeCheckoutConfigured.mockReturnValue(true);
    mocks.isStripeSecretConfigured.mockReturnValue(true);
    mocks.isProUser.mockResolvedValue(false);
    mocks.getStripe.mockReturnValue({
      customers: { create: mocks.customerCreate },
      checkout: { sessions: { create: mocks.checkoutSessionCreate } },
      billingPortal: { sessions: { create: mocks.portalSessionCreate } },
    });
    mocks.customerCreate.mockResolvedValue({ id: "cus_created" });
    mocks.checkoutSessionCreate.mockResolvedValue({ url: "https://checkout.stripe.test/session" });
    mocks.portalSessionCreate.mockResolvedValue({ url: "https://billing.stripe.test/session" });
  });

  it("reports checkout plan availability without requiring auth", async () => {
    const res = await getCheckoutStatus();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.checkoutAvailable).toBe(true);
    expect(body.plans.pro_monthly.configured).toBe(true);
  });

  it("returns a clear unavailable state when a Stripe price is missing", async () => {
    mocks.getStripePlan.mockReturnValue({
      priceId: "",
      name: "Pro Monthly",
      price: 9.99,
      interval: "month",
    });

    const res = await postCheckout(checkoutRequest("pro_monthly"));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.code).toBe("stripe_price_not_configured");
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });

  it("creates a Stripe customer and subscription checkout session", async () => {
    mocks.appUserFindUnique.mockResolvedValue({
      email: "student@example.com",
      stripeCustomerId: null,
      tier: "free",
    });

    const res = await postCheckout(checkoutRequest("pro_monthly"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://checkout.stripe.test/session");
    expect(mocks.customerCreate).toHaveBeenCalledWith({
      email: "student@example.com",
      metadata: { userId: "user_1" },
    });
    expect(mocks.appUserUpdate).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { stripeCustomerId: "cus_created" },
    });
    expect(mocks.checkoutSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_created",
        mode: "subscription",
        line_items: [{ price: "price_monthly", quantity: 1 }],
        success_url: "https://edupassport.test/billing?success=true",
        cancel_url: "https://edupassport.test/pricing?canceled=true",
      }),
    );
  });

  it("opens the Stripe billing portal when the user has a Stripe customer", async () => {
    mocks.appUserFindUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });

    const res = await postPortal();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://billing.stripe.test/session");
    expect(mocks.portalSessionCreate).toHaveBeenCalledWith({
      customer: "cus_existing",
      return_url: "https://edupassport.test/billing",
    });
  });

  it("returns a clear portal unavailable state when Stripe is not configured", async () => {
    mocks.isStripeSecretConfigured.mockReturnValue(false);
    mocks.appUserFindUnique.mockResolvedValue({ stripeCustomerId: "cus_existing" });

    const res = await postPortal();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.code).toBe("stripe_not_configured");
    expect(mocks.getStripe).not.toHaveBeenCalled();
  });
});
