import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildListingDataFromSubmission, createListingSlug } from "@/lib/marketplace/publish-submission";

describe("publish submission helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T10:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates readable unique listing slugs with a bounded title prefix", () => {
    expect(createListingSlug("STEM Program Manager", "sub_123")).toBe(
      "stem-program-manager-sub-123",
    );
    expect(createListingSlug("  $$$  ", "sub_456")).toBe("opportunity-sub-456");

    const slug = createListingSlug(
      "A Very Long Opportunity Title With Multiple Words That Should Be Truncated Before The Submission Identifier",
      "submission_789",
    );

    expect(slug).toBe(
      "a-very-long-opportunity-title-with-multiple-words-that-should-be-truncat-submission-789",
    );
    expect(slug.replace("-submission-789", "")).toHaveLength(72);
  });

  it("maps a job submission into active verified listing create data", () => {
    const data = buildListingDataFromSubmission(
      {
        id: "sub_123",
        type: "job",
        title: "STEM Program Manager",
        description: "Lead STEM programming for high school students.",
        url: "https://example.org/jobs/stem-manager",
        image: null,
        companyName: "Example School",
        location: "New York, NY",
        country: "US",
        region: "NY",
        startDate: null,
        endDate: null,
        expiresAt: null,
        priceLabel: null,
        couponCode: null,
        organizationId: "org_1",
        metadata: { submittedFrom: "public_form" },
      },
      "provider_1",
    );

    expect(data).toMatchObject({
      title: "STEM Program Manager",
      slug: "stem-program-manager-sub-123",
      type: "job",
      description: "Lead STEM programming for high school students.",
      url: "https://example.org/jobs/stem-manager",
      image: null,
      providerId: "provider_1",
      status: "active",
      verified: true,
      qualityScore: 0.8,
      companyName: "Example School",
      location: "New York, NY",
      country: "US",
      region: "NY",
      organizationId: "org_1",
      metadata: { submittedFrom: "public_form" },
    });
    expect(data.publishedAt).toEqual(new Date("2026-05-15T10:30:00.000Z"));
    expect(data.lastSeenAt).toEqual(new Date("2026-05-15T10:30:00.000Z"));
  });
});
