import { afterEach, describe, expect, it, vi } from "vitest";
import { RemotiveProvider } from "@/lib/providers/remotive";

describe("RemotiveProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps remote jobs into RawListing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [{
          id: 123,
          title: "Remote Instructional Designer",
          company_name: "Acme Learning",
          category: "Education",
          job_type: "full_time",
          publication_date: "2026-04-20T00:00:00Z",
          candidate_required_location: "Worldwide",
          salary: "$80k-$100k",
          description: "<p>Create online courses.</p>",
          url: "https://remotive.com/remote-jobs/education/123",
        }],
      }),
    } as Response);

    const provider = new RemotiveProvider({ slug: "remotive", name: "Remotive" });
    const listings = await provider.fetchListings();

    expect(listings[0]).toMatchObject({
      externalId: "remotive-123",
      type: "job",
      title: "Remote Instructional Designer",
      companyName: "Acme Learning",
      location: "Worldwide",
      priceLabel: "$80k-$100k",
      categorySlug: "professional-development",
    });
    expect(listings[0].compliance?.attributionText).toBe("Source: Remotive");
  });
});
