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
    expect(fetchUrl.searchParams.get("sort")).toBe("date,asc");
  });

  it("queries multiple education-adjacent terms and deduplicates events", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const keyword = new URL(String(input)).searchParams.get("keyword");
      const events = keyword === "education"
        ? [{
            id: "shared",
            name: "Student Success Workshop",
            url: "https://ticketmaster.com/event/shared",
            dates: { start: { dateTime: "2026-06-01T15:00:00Z" } },
          }]
        : [{
            id: "shared",
            name: "Student Success Workshop",
            url: "https://ticketmaster.com/event/shared",
            dates: { start: { dateTime: "2026-06-01T15:00:00Z" } },
          }, {
            id: "teacher-conf",
            name: "Teacher Innovation Conference",
            url: "https://ticketmaster.com/event/teacher-conf",
            dates: { start: { dateTime: "2026-06-02T15:00:00Z" } },
          }];

      return {
        ok: true,
        json: async () => ({ _embedded: { events } }),
      } as Response;
    });

    const provider = new TicketmasterProvider({ slug: "ticketmaster", name: "Ticketmaster", apiKey: "key" });
    const listings = await provider.fetchListings();
    const requestedKeywords = fetchMock.mock.calls.map((call) => new URL(String(call[0])).searchParams.get("keyword"));

    expect(requestedKeywords).toEqual(expect.arrayContaining(["education", "workshop", "conference"]));
    expect(listings.map((listing) => listing.externalId)).toEqual([
      "ticketmaster-shared",
      "ticketmaster-teacher-conf",
    ]);
  });

  it("filters obvious unrelated Ticketmaster matches", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        _embedded: {
          events: [{
            id: "sports",
            name: "NC Education Lottery 200 NASCAR Craftsman Truck Series",
            url: "https://ticketmaster.com/event/sports",
            classifications: [{ segment: { name: "Sports" } }],
            dates: { start: { dateTime: "2026-06-01T15:00:00Z" } },
          }, {
            id: "hotel",
            name: "Tropicana Showroom at Tropicana Atlantic City Ticket + Hotel Deals",
            url: "https://ticketmaster.com/event/hotel",
            dates: { start: { dateTime: "2026-06-02T15:00:00Z" } },
          }, {
            id: "classification-only",
            name: "John Cusack's High Fidelity",
            url: "https://ticketmaster.com/event/classification-only",
            classifications: [{ genre: { name: "Lecture/Seminar" } }],
            dates: { start: { dateTime: "2026-06-02T18:00:00Z" } },
          }, {
            id: "recital",
            name: "Guitar Center Student Recital",
            url: "https://ticketmaster.com/event/recital",
            dates: { start: { dateTime: "2026-06-02T20:00:00Z" } },
          }, {
            id: "workshop",
            name: "Banksy Museum NY - Rebel Stencil Workshop",
            url: "https://ticketmaster.com/event/workshop",
            dates: { start: { dateTime: "2026-06-03T15:00:00Z" } },
          }],
        },
      }),
    } as Response);

    const provider = new TicketmasterProvider({ slug: "ticketmaster", name: "Ticketmaster", apiKey: "key" });
    const listings = await provider.fetchListings();

    expect(listings.map((listing) => listing.externalId)).toEqual(["ticketmaster-workshop"]);
  });

  it("caps repeated event titles to the next three dates", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        _embedded: {
          events: [1, 2, 3, 4].map((day) => ({
            id: `workshop-${day}`,
            name: "Banksy Museum NY - Rebel Stencil Workshop",
            url: `https://ticketmaster.com/event/workshop-${day}`,
            dates: { start: { dateTime: `2026-06-0${day}T15:00:00Z` } },
          })),
        },
      }),
    } as Response);

    const provider = new TicketmasterProvider({ slug: "ticketmaster", name: "Ticketmaster", apiKey: "key" });
    const listings = await provider.fetchListings();

    expect(listings.map((listing) => listing.externalId)).toEqual([
      "ticketmaster-workshop-1",
      "ticketmaster-workshop-2",
      "ticketmaster-workshop-3",
    ]);
  });
});
