import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubStudentPackProvider } from "@/lib/providers/github-student-pack";

describe("GitHubStudentPackProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps the public partner markdown table into student deal listings", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => `
| Student Developer Pack Partner | | Partner Student Benefit |
| --- | --- | --- |
| GitHub Copilot | | Free use of the Copilot individual plan while you are a student. |
| Educative | | Get 6 free months of 60+ courses covering in-demand topics like Web Development, Python, Java, and Machine Learning. |
      `,
    } as Response);

    const provider = new GitHubStudentPackProvider({ slug: "github-student-pack", name: "GitHub Student Developer Pack" });
    const listings = await provider.fetchListings();

    expect(listings).toHaveLength(2);
    expect(listings[0]).toMatchObject({
      externalId: "github-student-pack-github-copilot",
      type: "deal",
      title: "GitHub Copilot student benefit",
      url: "https://education.github.com/pack/offers",
      priceLabel: "Student benefit",
      discountText: "Free use of the Copilot individual plan while you are a student.",
      categorySlug: "coding-tech",
    });
  });
});
