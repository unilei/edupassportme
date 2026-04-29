import { describe, it, expect } from "vitest";
import { stripHtml, normalizeWhitespace, sanitizeText, isValidEmail, sanitizeSlug } from "@/lib/sanitize";

describe("sanitize", () => {
  describe("stripHtml", () => {
    it("removes HTML tags", () => {
      expect(stripHtml("<b>bold</b>")).toBe("bold");
      expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(stripHtml("<p>hello</p><br/>world")).toBe("helloworld");
    });

    it("handles text without HTML", () => {
      expect(stripHtml("plain text")).toBe("plain text");
    });
  });

  describe("normalizeWhitespace", () => {
    it("collapses multiple spaces", () => {
      expect(normalizeWhitespace("  hello   world  ")).toBe("hello world");
    });

    it("collapses tabs and newlines", () => {
      expect(normalizeWhitespace("hello\n\nworld\t!")).toBe("hello world !");
    });
  });

  describe("sanitizeText", () => {
    it("strips HTML and normalizes whitespace", () => {
      expect(sanitizeText("<b>hello</b>  <i>world</i>")).toBe("hello world");
    });

    it("caps length", () => {
      const long = "a".repeat(100);
      expect(sanitizeText(long, 10)).toBe("a".repeat(10));
    });
  });

  describe("isValidEmail", () => {
    it("accepts valid emails", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("a.b+tag@test.co")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("noatsign")).toBe(false);
      expect(isValidEmail("@no-local.com")).toBe(false);
      expect(isValidEmail("missing@")).toBe(false);
    });
  });

  describe("sanitizeSlug", () => {
    it("lowercases and strips special chars", () => {
      expect(sanitizeSlug("Hello World!")).toBe("hello-world");
    });

    it("collapses multiple hyphens", () => {
      expect(sanitizeSlug("foo--bar---baz")).toBe("foo-bar-baz");
    });

    it("trims leading/trailing hyphens", () => {
      expect(sanitizeSlug("-foo-bar-")).toBe("foo-bar");
    });

    it("caps length to 200", () => {
      const long = "a".repeat(300);
      expect(sanitizeSlug(long).length).toBe(200);
    });
  });
});
