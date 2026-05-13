import { afterEach, describe, expect, it, vi } from "vitest";
import { SlickdealsEducationProvider } from "@/lib/providers/slickdeals-education";

describe("SlickdealsEducationProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps public education deal cards into deal listings", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => `
        <li class="bp-p-blueberryDealCard bp-p-dealCard" data-posted-at="1778595854">
          <span class="bp-p-dealCard_price">$69</span>
          <span class="bp-c-card_subtitle">Amazon</span>
          <a href="/f/19400001-amazon-prime-student-1-year-prime-69" class="bp-c-card_title bp-c-link">Amazon Prime Membership Program: Students or 18-24 Years Old: 1-Year Prime</a>
        </li>
      `,
    } as Response);

    const provider = new SlickdealsEducationProvider({ slug: "slickdeals-education", name: "Slickdeals Education" });
    const listings = await provider.fetchListings();

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      externalId: "slickdeals-19400001",
      type: "deal",
      title: "Amazon Prime Membership Program: Students or 18-24 Years Old: 1-Year Prime",
      url: "https://slickdeals.net/f/19400001-amazon-prime-student-1-year-prime-69",
      priceLabel: "$69",
      discountText: "$69",
      categorySlug: "productivity",
    });
  });
});
