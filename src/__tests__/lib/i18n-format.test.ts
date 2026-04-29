import { describe, it, expect } from "vitest";
import { formatPrice, formatDate, formatRelativeTime, formatNumber } from "@/lib/i18n/format";

describe("i18n format", () => {
  describe("formatPrice", () => {
    it("formats USD price in English", () => {
      const result = formatPrice(29.99, "en");
      expect(result).toContain("29.99");
      expect(result).toContain("$");
    });

    it("formats CNY price in Chinese", () => {
      const result = formatPrice(199, "zh");
      expect(result).toContain("199");
      expect(result).toContain("¥");
    });

    it("returns 'Free' for null/zero in English", () => {
      expect(formatPrice(null, "en")).toBe("Free");
      expect(formatPrice(0, "en")).toBe("Free");
    });

    it("returns '免费' for null/zero in Chinese", () => {
      expect(formatPrice(null, "zh")).toBe("免费");
      expect(formatPrice(0, "zh")).toBe("免费");
    });

    it("supports explicit currency override", () => {
      const result = formatPrice(100, "en", "EUR");
      expect(result).toContain("100");
      expect(result).toContain("€");
    });
  });

  describe("formatDate", () => {
    it("formats date in English", () => {
      const result = formatDate("2025-06-15", "en");
      expect(result).toContain("Jun");
      expect(result).toContain("15");
      expect(result).toContain("2025");
    });

    it("formats date in Chinese", () => {
      const result = formatDate("2025-06-15", "zh");
      expect(result).toContain("2025");
      expect(result).toContain("6");
      expect(result).toContain("15");
    });
  });

  describe("formatRelativeTime", () => {
    it("returns relative time for recent dates", () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeTime(fiveMinAgo, "en");
      expect(result).toContain("minute");
    });

    it("returns Chinese relative time", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = formatRelativeTime(twoHoursAgo, "zh");
      expect(result).toContain("小时");
    });
  });

  describe("formatNumber", () => {
    it("formats with English grouping", () => {
      expect(formatNumber(1234567, "en")).toBe("1,234,567");
    });

    it("formats with Chinese grouping", () => {
      const result = formatNumber(1234567, "zh");
      expect(result).toContain("1,234,567");
    });
  });
});
