import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookieGet = vi.fn();
const mockHeaderGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mockCookieGet })),
  headers: vi.fn(async () => ({ get: mockHeaderGet })),
}));

import { getServerLocale, getServerT, getServerI18n } from "@/lib/i18n/server";

describe("i18n server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue(undefined);
    mockHeaderGet.mockReturnValue("");
  });

  describe("getServerLocale", () => {
    it("should return 'en' as default when no cookie or header", async () => {
      const locale = await getServerLocale();
      expect(locale).toBe("en");
    });

    it("should return locale from NEXT_LOCALE cookie", async () => {
      mockCookieGet.mockReturnValue({ value: "zh" });

      const locale = await getServerLocale();
      expect(locale).toBe("zh");
    });

    it("should prefer locale forwarded by middleware for rewritten locale-prefixed routes", async () => {
      mockCookieGet.mockReturnValue({ value: "en" });
      mockHeaderGet.mockImplementation((name: string) => (
        name === "x-edupassport-locale" ? "zh" : ""
      ));

      const locale = await getServerLocale();
      expect(locale).toBe("zh");
    });

    it("should ignore invalid cookie value and check header", async () => {
      mockCookieGet.mockReturnValue({ value: "fr" });
      mockHeaderGet.mockReturnValue("zh-CN,zh;q=0.9,en;q=0.8");

      const locale = await getServerLocale();
      expect(locale).toBe("zh");
    });

    it("should detect 'zh' from Accept-Language header", async () => {
      mockHeaderGet.mockReturnValue("zh-TW,zh;q=0.9,en;q=0.8");

      const locale = await getServerLocale();
      expect(locale).toBe("zh");
    });

    it("should detect 'en' from Accept-Language header", async () => {
      mockHeaderGet.mockReturnValue("en-US,en;q=0.9");

      const locale = await getServerLocale();
      expect(locale).toBe("en");
    });

    it("should return 'en' for unsupported Accept-Language", async () => {
      mockHeaderGet.mockReturnValue("fr-FR,de;q=0.8");

      const locale = await getServerLocale();
      expect(locale).toBe("en");
    });
  });

  describe("getServerT", () => {
    it("should return a translation function for English", async () => {
      const t = await getServerT();
      expect(t("nav.courses")).toBe("Courses");
    });

    it("should return a translation function for Chinese", async () => {
      mockCookieGet.mockReturnValue({ value: "zh" });

      const t = await getServerT();
      expect(t("nav.courses")).toBe("课程");
    });

    it("should fallback key for missing translations", async () => {
      const t = await getServerT();
      expect(t("nonexistent.key")).toBe("nonexistent.key");
    });
  });

  describe("getServerI18n", () => {
    it("should return locale and t function together", async () => {
      mockCookieGet.mockReturnValue({ value: "zh" });

      const { locale, t } = await getServerI18n();
      expect(locale).toBe("zh");
      expect(t("nav.courses")).toBe("课程");
    });

    it("should default to English", async () => {
      const { locale, t } = await getServerI18n();
      expect(locale).toBe("en");
      expect(t("nav.courses")).toBe("Courses");
    });
  });
});
