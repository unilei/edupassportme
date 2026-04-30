import { afterEach, describe, expect, it, vi } from "vitest";
import { UsaJobsProvider } from "@/lib/providers/usajobs";

describe("UsaJobsProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("requires API key and user agent email", () => {
    const provider = new UsaJobsProvider({ slug: "usajobs", name: "USAJOBS" });
    expect(provider.isConfigured()).toBe(false);
  });

  it("maps government jobs into RawListing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        SearchResult: {
          SearchResultItems: [{
            MatchedObjectId: "abc",
            MatchedObjectDescriptor: {
              PositionTitle: "Education Program Specialist",
              OrganizationName: "Department of Education",
              PositionURI: "https://www.usajobs.gov/job/abc",
              PositionLocationDisplay: "Washington, DC",
              PublicationStartDate: "2026-04-20T00:00:00Z",
              ApplicationCloseDate: "2026-05-10T23:59:59Z",
              UserArea: {
                Details: {
                  JobSummary: "Support federal education programs.",
                  LowGrade: "11",
                  HighGrade: "13",
                },
              },
              PositionRemuneration: [{
                MinimumRange: "80000",
                MaximumRange: "115000",
                RateIntervalCode: "Per Year",
              }],
            },
          }],
        },
      }),
    } as Response);

    const provider = new UsaJobsProvider({
      slug: "usajobs",
      name: "USAJOBS",
      apiKey: "key",
      userAgent: "ops@example.com",
    });
    const listings = await provider.fetchListings();

    expect(listings[0]).toMatchObject({
      externalId: "usajobs-abc",
      type: "job",
      title: "Education Program Specialist",
      companyName: "Department of Education",
      salaryMin: 80000,
      salaryMax: 115000,
      salaryCurrency: "USD",
    });
  });
});
