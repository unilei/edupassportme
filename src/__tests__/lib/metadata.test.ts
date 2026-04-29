import { describe, it, expect } from "vitest";
import {
  createMetadata,
  jsonLdWebsite,
  jsonLdItemList,
  jsonLdBreadcrumb,
  jsonLdCourse,
  jsonLdJobPosting,
  jsonLdEvent,
} from "@/lib/metadata";

describe("metadata", () => {
  describe("createMetadata", () => {
    it("should create metadata with title and description", () => {
      const meta = createMetadata({
        title: "Test Page",
        description: "A test description",
        path: "/test",
      });
      expect(meta.title).toBe("Test Page");
      expect(meta.description).toBe("A test description");
    });

    it("should set canonical URL from path", () => {
      const meta = createMetadata({
        title: "Test",
        description: "Desc",
        path: "/courses",
      });
      expect(meta.alternates?.canonical).toContain("/courses");
    });

    it("should set noIndex when requested", () => {
      const meta = createMetadata({
        title: "Private",
        description: "Desc",
        noIndex: true,
      });
      expect(meta.robots).toEqual({ index: false, follow: false });
    });

    it("should not set robots when noIndex is false", () => {
      const meta = createMetadata({
        title: "Public",
        description: "Desc",
        noIndex: false,
      });
      expect(meta.robots).toBeUndefined();
    });
  });

  describe("jsonLdWebsite", () => {
    it("should return valid WebSite schema", () => {
      const ld = jsonLdWebsite();
      expect(ld["@context"]).toBe("https://schema.org");
      expect(ld["@type"]).toBe("WebSite");
      expect(ld.name).toBeDefined();
      expect(ld.potentialAction["@type"]).toBe("SearchAction");
    });
  });

  describe("jsonLdItemList", () => {
    it("should return valid ItemList schema", () => {
      const ld = jsonLdItemList([
        { name: "Item 1", url: "/item-1", position: 1 },
        { name: "Item 2", url: "/item-2", position: 2 },
      ]);
      expect(ld["@type"]).toBe("ItemList");
      expect(ld.itemListElement).toHaveLength(2);
      expect(ld.itemListElement[0].position).toBe(1);
    });
  });

  describe("jsonLdBreadcrumb", () => {
    it("should return valid BreadcrumbList schema", () => {
      const ld = jsonLdBreadcrumb([
        { name: "Home", url: "/" },
        { name: "Courses", url: "/courses" },
      ]);
      expect(ld["@type"]).toBe("BreadcrumbList");
      expect(ld.itemListElement).toHaveLength(2);
      expect(ld.itemListElement[0].position).toBe(1);
      expect(ld.itemListElement[1].position).toBe(2);
    });
  });

  describe("jsonLdCourse", () => {
    it("should return Course schema with required fields", () => {
      const ld = jsonLdCourse({
        title: "Intro to AI",
        description: "Learn AI basics",
        url: "https://example.com/ai",
        slug: "intro-to-ai",
        provider: "Coursera",
      });
      expect(ld["@type"]).toBe("Course");
      expect(ld.name).toBe("Intro to AI");
      expect(ld.provider.name).toBe("Coursera");
    });

    it("should include rating when provided", () => {
      const ld = jsonLdCourse({
        title: "AI",
        description: "Desc",
        url: "https://example.com",
        slug: "ai",
        provider: "Udemy",
        rating: 4.5,
        reviewCount: 100,
      });
      expect(ld.aggregateRating).toBeDefined();
      expect(ld.aggregateRating?.ratingValue).toBe(4.5);
    });

    it("should include offers when price provided", () => {
      const ld = jsonLdCourse({
        title: "AI",
        description: "Desc",
        url: "https://example.com",
        slug: "ai",
        provider: "Udemy",
        price: 29.99,
      });
      expect(ld.offers).toBeDefined();
      expect(ld.offers?.price).toBe(29.99);
    });
  });

  describe("jsonLdJobPosting", () => {
    it("should return JobPosting schema", () => {
      const ld = jsonLdJobPosting({
        title: "Frontend Dev",
        description: "Build UIs",
        url: "https://example.com/job",
        slug: "frontend-dev",
        provider: "Indeed",
        createdAt: new Date("2025-01-15"),
      });
      expect(ld["@type"]).toBe("JobPosting");
      expect(ld.title).toBe("Frontend Dev");
      expect(ld.datePosted).toBe("2025-01-15");
    });

    it("should include location when provided", () => {
      const ld = jsonLdJobPosting({
        title: "Job",
        description: "Desc",
        url: "https://example.com",
        slug: "job",
        provider: "Indeed",
        location: "San Francisco, CA",
        createdAt: new Date(),
      });
      expect(ld.jobLocation).toBeDefined();
      expect(ld.jobLocation?.address).toBe("San Francisco, CA");
    });
  });

  describe("jsonLdEvent", () => {
    it("should return Event schema", () => {
      const ld = jsonLdEvent({
        title: "Tech Conference",
        description: "Annual tech conf",
        url: "https://example.com/event",
        slug: "tech-conf",
      });
      expect(ld["@type"]).toBe("Event");
      expect(ld.name).toBe("Tech Conference");
    });

    it("should handle virtual location", () => {
      const ld = jsonLdEvent({
        title: "Webinar",
        description: "Online event",
        url: "https://example.com/webinar",
        slug: "webinar",
        location: "Virtual",
      });
      expect(ld.location?.["@type"]).toBe("VirtualLocation");
    });

    it("should handle physical location", () => {
      const ld = jsonLdEvent({
        title: "Meetup",
        description: "In-person",
        url: "https://example.com/meetup",
        slug: "meetup",
        location: "New York",
      });
      expect(ld.location?.["@type"]).toBe("Place");
    });
  });
});
