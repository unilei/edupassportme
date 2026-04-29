import { describe, it, expect } from "vitest";
import { getMessages, t, locales, localeLabels } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

describe("i18n", () => {
  describe("locales", () => {
    it("should have en and zh", () => {
      expect(locales).toEqual(["en", "zh"]);
    });

    it("should have labels for all locales", () => {
      for (const locale of locales) {
        expect(localeLabels[locale]).toBeDefined();
        expect(typeof localeLabels[locale]).toBe("string");
      }
    });
  });

  describe("getMessages", () => {
    it("should return English messages for 'en'", () => {
      const msgs = getMessages("en");
      expect(msgs).toBeDefined();
      expect(msgs.site.name).toBe("EDU Passport");
    });

    it("should return Chinese messages for 'zh'", () => {
      const msgs = getMessages("zh");
      expect(msgs).toBeDefined();
      expect(msgs.site.name).toBe("EDU Passport");
    });

    it("should fallback to English for unknown locale", () => {
      const msgs = getMessages("xx" as Locale);
      expect(msgs.site.name).toBe("EDU Passport");
    });
  });

  describe("t() translation lookup", () => {
    const en = getMessages("en");
    const zh = getMessages("zh");

    it("should resolve top-level keys", () => {
      expect(t(en, "site")).toBe("site"); // site is an object, not a string → fallback
    });

    it("should resolve nested dot-path keys", () => {
      expect(t(en, "nav.courses")).toBe("Courses");
      expect(t(en, "nav.signIn")).toBe("Sign In");
    });

    it("should resolve Chinese translations", () => {
      expect(t(zh, "nav.courses")).toBe("课程");
      expect(t(zh, "nav.signIn")).toBe("登录");
    });

    it("should return the key for missing translations", () => {
      expect(t(en, "nonexistent.key")).toBe("nonexistent.key");
      expect(t(en, "nav.nonexistent")).toBe("nav.nonexistent");
    });

    it("should resolve deeply nested keys", () => {
      expect(t(en, "home.stats.listings")).toBe("Listings");
      expect(t(zh, "home.stats.listings")).toBe("资源");
    });

    it("should return key when path resolves to a non-string (object)", () => {
      expect(t(en, "home.stats")).toBe("home.stats");
    });
  });
});
