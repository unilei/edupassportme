import { afterEach, describe, expect, it, vi } from "vitest";
import { MicrosoftLearnProvider } from "@/lib/providers/microsoft-learn";

describe("MicrosoftLearnProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps public catalog modules and learning paths into course listings", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        modules: [
          {
            uid: "learn.ai.intro",
            title: "Introduction to Azure AI",
            summary: "Learn core AI workloads and Azure AI services.",
            url: "https://learn.microsoft.com/en-us/training/modules/intro-to-azure-ai/",
            duration_in_minutes: 45,
            levels: ["beginner"],
            last_modified: "2026-04-01T10:00:00+00:00",
            icon_url: "https://learn.microsoft.com/icon.svg",
          },
        ],
        learningPaths: [
          {
            uid: "learn.paths.data",
            title: "Build data solutions",
            summary: "Plan and build data solutions on Microsoft Azure.",
            url: "https://learn.microsoft.com/en-us/training/paths/build-data-solutions/",
            duration_in_minutes: 180,
            levels: ["intermediate"],
            last_modified: "2026-03-15T10:00:00+00:00",
          },
        ],
      }),
    } as Response);

    const provider = new MicrosoftLearnProvider({ slug: "microsoft-learn", name: "Microsoft Learn" });
    const listings = await provider.fetchListings();

    expect(listings).toHaveLength(2);
    expect(listings[0]).toMatchObject({
      externalId: "microsoft-learn-module-learn.ai.intro",
      type: "course",
      title: "Introduction to Azure AI",
      url: "https://learn.microsoft.com/en-us/training/modules/intro-to-azure-ai/",
      price: 0,
      priceLabel: "Free",
      duration: "45 min",
      level: "Beginner",
      categorySlug: "coding-tech",
    });
    expect(listings[1]).toMatchObject({
      externalId: "microsoft-learn-learning-path-learn.paths.data",
      title: "Build data solutions",
      duration: "3 hr",
      level: "Intermediate",
    });
  });
});
