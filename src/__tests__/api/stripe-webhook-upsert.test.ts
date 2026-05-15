import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStripe: vi.fn(),
  constructEvent: vi.fn(),
  subscriptionRetrieve: vi.fn(),
  subscriptionUpsert: vi.fn(),
  appUserUpdate: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: mocks.getStripe,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      upsert: mocks.subscriptionUpsert,
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    appUser: {
      update: mocks.appUserUpdate,
      findFirst: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/stripe/webhook/route";

function webhookRequest() {
  return new NextRequest("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    body: "{}",
    headers: { "stripe-signature": "sig_test" },
  });
}

describe("Stripe webhook subscription upsert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mocks.getStripe.mockReturnValue({
      webhooks: { constructEvent: mocks.constructEvent },
      subscriptions: { retrieve: mocks.subscriptionRetrieve },
    });
    mocks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { userId: "user_1", plan: "pro_monthly" },
          subscription: "sub_123",
        },
      },
    });
    mocks.subscriptionRetrieve.mockResolvedValue({
      id: "sub_123",
      status: "active",
      start_date: 1_700_000_000,
      cancel_at_period_end: false,
      canceled_at: null,
      trial_end: null,
      items: {
        data: [
          {
            price: { id: "price_123" },
            current_period_start: 1_700_000_000,
            current_period_end: 1_702_592_000,
          },
        ],
      },
    });
  });

  it("upserts the subscription and grants Pro from Checkout completion", async () => {
    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(mocks.subscriptionUpsert).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: "sub_123" },
      create: expect.objectContaining({
        userId: "user_1",
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_123",
        status: "active",
        plan: "pro_monthly",
      }),
      update: expect.objectContaining({
        stripePriceId: "price_123",
        status: "active",
        plan: "pro_monthly",
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
      }),
    });
    expect(mocks.appUserUpdate).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: expect.objectContaining({
        tier: "pro",
        role: "pro",
        proExpiresAt: new Date(1_702_592_000 * 1000),
      }),
    });
  });
});
