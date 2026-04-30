import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketmasterProvider } from "@/lib/providers/ticketmaster";

describe("TicketmasterProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps events into RawListing", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        _embedded: {
          events: [{
            id: "tm1",
            name: "Education Innovation Summit",
            url: "https://ticketmaster.com/event/tm1",
            info: "A summit for education leaders.",
            images: [{ url: "https://img.example.com/a.jpg", width: 640 }],
            dates: { start: { dateTime: "2026-06-01T15:00:00Z" } },
            priceRanges: [{ min: 20, max: 100, currency: "USD" }],
            _embedded: {
              venues: [{
                name: "Convention Center",
                city: { name: "Los Angeles" },
                state: { stateCode: "CA" },
                country: { countryCode: "US" },
              }],
            },
          }],
        },
      }),
    } as Response);

    const provider = new TicketmasterProvider({ slug: "ticketmaster", name: "Ticketmaster", apiKey: "key" });
    const listings = await provider.fetchListings();
    const fetchUrl = new URL(String(fetchMock.mock.calls[0][0]));

    expect(listings[0]).toMatchObject({
      externalId: "ticketmaster-tm1",
      type: "event",
      title: "Education Innovation Summit",
      venueName: "Convention Center",
      country: "US",
      region: "CA",
      priceLabel: "$20-$100",
    });
    expect(fetchUrl.searchParams.get("sort")).toBe("eventDate,date.asc");
  });
});
