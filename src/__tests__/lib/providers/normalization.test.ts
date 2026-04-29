import { describe, expect, it } from "vitest";
import {
  canonicalizeUrl,
  computeListingFingerprint,
  normalizeText,
  parseOptionalDate,
  scoreListingQuality,
  slugifyListingTitle,
} from "@/lib/providers/normalization";

describe("provider normalization", () => {
  it("normalizes text safely", () => {
    expect(normalizeText("  <b>Hello&nbsp;world</b>  ")).toBe("Hello world");
    expect(normalizeText("A".repeat(700))).toHaveLength(500);
  });

  it("canonicalizes tracking URLs", () => {
    expect(canonicalizeUrl("https://example.com/path?utm_source=x&id=10#top")).toBe("https://example.com/path?id=10");
  });

  it("returns undefined for invalid optional dates", () => {
    expect(parseOptionalDate("not-a-date")).toBeUndefined();
    expect(parseOptionalDate(undefined)).toBeUndefined();
    expect(parseOptionalDate("2026-05-01")?.toISOString()).toContain("2026-05-01");
  });

  it("creates stable fingerprints", () => {
    const a = computeListingFingerprint({
      type: "job",
      title: "Online Math Tutor",
      canonicalUrl: "https://jobs.example.com/1",
      providerName: "Example Jobs",
      location: "Remote",
      startDate: undefined,
    });
    const b = computeListingFingerprint({
      type: "job",
      title: "Online   Math Tutor",
      canonicalUrl: "https://jobs.example.com/1?utm_campaign=test",
      providerName: "Example Jobs",
      location: "remote",
      startDate: undefined,
    });
    expect(a).toBe(b);
  });

  it("scores complete listings higher than thin listings", () => {
    const full = scoreListingQuality({
      title: "Machine Learning Course",
      description: "A complete course with projects",
      url: "https://example.com/course",
      image: "https://example.com/image.jpg",
      categorySlug: "coding-tech",
      priceLabel: "Free",
      rating: 4.8,
      tagSlugs: ["free", "certificate"],
    });
    const thin = scoreListingQuality({
      title: "Course",
      description: "",
      url: "https://example.com/course",
    });
    expect(full).toBeGreaterThan(thin);
    expect(full).toBeLessThanOrEqual(100);
  });

  it("slugifies listing titles", () => {
    expect(slugifyListingTitle(" Intro to Python!!! ")).toBe("intro-to-python");
  });
});
