import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  appUserFindUnique: vi.fn(),
  subscriptionFindFirst: vi.fn(),
  getStripePlanAvailability: vi.fn(),
  isStripeCheckoutConfigured: vi.fn(),
  isStripeSecretConfigured: vi.fn(),
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
    },
    subscription: {
      findFirst: mocks.subscriptionFindFirst,
    },
  },
}));

vi.mock("@/lib/stripe", () => ({
  getStripePlanAvailability: mocks.getStripePlanAvailability,
  isStripeCheckoutConfigured: mocks.isStripeCheckoutConfigured,
  isStripeSecretConfigured: mocks.isStripeSecretConfigured,
}));

import { GET as getBilling } from "@/app/api/user/billing/route";
import { POST as postLegacyUpgrade } from "@/app/api/user/upgrade/route";

describe("Module C billing source routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    mocks.getStripePlanAvailability.mockReturnValue({
      pro_monthly: { name: "Pro Monthly", price: 9.99, interval: "month", configured: true },
      pro_yearly: { name: "Pro Yearly", price: 79.99, interval: "year", configured: true },
    });
    mocks.isStripeCheckoutConfigured.mockReturnValue(true);
    mocks.isStripeSecretConfigured.mockReturnValue(true);
  });

  it("hard-disables the legacy mock upgrade path for authenticated users", async () => {
    const res = await postLegacyUpgrade();
    const body = await res.json();

    expect(res.status).toBe(410);
    expect(body.code).toBe("mock_upgrade_disabled");
  });

  it("returns unauthorized for legacy upgrade without a user session", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const res = await postLegacyUpgrade();

    expect(res.status).toBe(401);
  });

  it("uses an active Stripe subscription as the billing source of truth", async () => {
    const currentPeriodEnd = new Date(Date.now() + 86_400_000);
    mocks.appUserFindUnique.mockResolvedValue({
      tier: "free",
      proExpiresAt: null,
      stripeCustomerId: "cus_123",
    });
    mocks.subscriptionFindFirst.mockResolvedValue({
      id: "sub_record_1",
      status: "active",
      plan: "pro_monthly",
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      trialEnd: null,
    });

    const res = await getBilling();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tier).toBe("pro");
    expect(body.source).toBe("stripe");
    expect(body.portalAvailable).toBe(true);
    expect(body.subscription.status).toBe("active");
  });

  it("does not treat expired manual Pro state as Pro", async () => {
    mocks.appUserFindUnique.mockResolvedValue({
      tier: "pro",
      proExpiresAt: new Date(Date.now() - 86_400_000),
      stripeCustomerId: null,
    });
    mocks.subscriptionFindFirst.mockResolvedValue(null);

    const res = await getBilling();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tier).toBe("free");
    expect(body.source).toBe("free");
    expect(body.portalAvailable).toBe(false);
  });

  it("returns manual Pro as the billing source when there is no Stripe subscription", async () => {
    const proExpiresAt = new Date(Date.now() + 30 * 86_400_000);
    mocks.appUserFindUnique.mockResolvedValue({
      tier: "pro",
      proExpiresAt,
      stripeCustomerId: null,
    });
    mocks.subscriptionFindFirst.mockResolvedValue(null);
    mocks.isStripeCheckoutConfigured.mockReturnValue(false);
    mocks.isStripeSecretConfigured.mockReturnValue(false);

    const res = await getBilling();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tier).toBe("pro");
    expect(body.source).toBe("manual");
    expect(body.proExpiresAt).toBe(proExpiresAt.toISOString());
    expect(body.portalAvailable).toBe(false);
    expect(body.checkoutAvailable).toBe(false);
  });
});
