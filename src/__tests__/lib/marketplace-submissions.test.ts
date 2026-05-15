import { describe, expect, it } from "vitest";
import { normalizeListingSubmissionInput } from "@/lib/marketplace/submissions";

describe("normalizeListingSubmissionInput", () => {
  it("normalizes a valid job submission", () => {
    const result = normalizeListingSubmissionInput({
      type: "job",
      title: "  STEM   Program Manager  ",
      description: " Lead   STEM programming for high school students. ",
      url: " https://example.org/jobs/stem-manager ",
      image: "https://example.org/images/stem.png",
      organizationName: " Example   School ",
      organizationType: "school",
      organizationWebsite: "https://example.edu",
      companyName: "Example School",
      location: " New York,   NY ",
      region: "NY",
      country: "US",
      startDate: "2026-06-01",
      endDate: "2026-06-02T15:00:00.000Z",
      expiresAt: "2026-05-25",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      type: "job",
      title: "STEM Program Manager",
      description: "Lead STEM programming for high school students.",
      url: "https://example.org/jobs/stem-manager",
      image: "https://example.org/images/stem.png",
      organizationName: "Example School",
      organizationType: "school",
      organizationWebsite: "https://example.edu/",
      companyName: "Example School",
      location: "New York, NY",
      region: "NY",
      country: "US",
    });
    expect(result.data.startDate).toEqual(new Date("2026-06-01"));
    expect(result.data.endDate).toEqual(new Date("2026-06-02T15:00:00.000Z"));
    expect(result.data.expiresAt).toEqual(new Date("2026-05-25"));
  });

  it("defaults unknown organization types to other", () => {
    const result = normalizeListingSubmissionInput({
      type: "deal",
      title: "Education software discount",
      description: "Discounted software access for verified education users.",
      url: "https://example.org/deals/education-software",
      organizationType: "unknown",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.organizationType).toBe("other");
  });

  it("strips HTML from submitted text before review and publishing", () => {
    const result = normalizeListingSubmissionInput({
      type: "event",
      title: "Career night </script><script>alert(1)</script>",
      description: "A detailed career event for education professionals with confirmed speakers.",
      url: "https://example.org/events/career-night",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.title).toBe("Career night alert(1)");
  });

  it("rejects unsupported opportunity types", () => {
    const result = normalizeListingSubmissionInput({
      type: "scholarship",
      title: "Scholarship",
      description: "A student award with enough detail to review.",
      url: "https://example.org",
    });

    expect(result).toEqual({
      ok: false,
      error: "Opportunity type must be course, job, event, or deal.",
    });
  });

  it("rejects short descriptions before URL validation", () => {
    const result = normalizeListingSubmissionInput({
      type: "event",
      title: "Info night",
      description: "short",
      url: "not-a-url",
    });

    expect(result).toEqual({
      ok: false,
      error: "Description must be at least 20 characters.",
    });
  });

  it("rejects invalid required and optional URLs", () => {
    expect(
      normalizeListingSubmissionInput({
        type: "event",
        title: "Info night",
        description: "A useful event for students and educators.",
        url: "not-a-url",
      }),
    ).toEqual({
      ok: false,
      error: "URL must be a valid URL.",
    });

    expect(
      normalizeListingSubmissionInput({
        type: "event",
        title: "Info night",
        description: "A useful event for students and educators.",
        url: "https://example.org/events/info-night",
        image: "ftp://example.org/image.png",
      }),
    ).toEqual({
      ok: false,
      error: "Image URL must be an http or https URL.",
    });
  });
});
