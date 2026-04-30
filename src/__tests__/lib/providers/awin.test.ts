import { afterEach, describe, expect, it, vi } from "vitest";
import { AwinOffersProvider } from "@/lib/providers/awin";

describe("AwinOffersProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps vouchers into deal listings", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        promotions: [{
          promotionId: 55,
          type: "voucher",
          title: "20% off coding courses",
          description: "Save on selected online learning plans.",
          voucher: { code: "LEARN20" },
          advertiser: { id: 1, name: "Learning Merchant", joined: true },
          startDate: "2026-04-01",
          endDate: "2026-05-01",
          url: "https://merchant.example.com/deal",
          regions: { all: false, list: [{ countryCode: "US" }] },
        }],
      }),
    } as Response);

    const provider = new AwinOffersProvider({
      slug: "awin",
      name: "Awin",
      apiKey: "token",
      publisherId: "123",
    });
    const listings = await provider.fetchListings();

    expect(listings[0]).toMatchObject({
      externalId: "awin-55",
      type: "deal",
      title: "20% off coding courses",
      couponCode: "LEARN20",
      companyName: "Learning Merchant",
      country: "US",
      categorySlug: "online-courses",
    });
  });
});
