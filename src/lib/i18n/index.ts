import en from "./en.json";
import zh from "./zh.json";

export type Locale = "en" | "zh";

export const locales: Locale[] = ["en", "zh"];

export const localeLabels: Record<Locale, string> = {
  en: "English",
  zh: "中文",
};

type Messages = typeof en;

const messages: Record<Locale, Messages> = { en, zh };

export function getMessages(locale: Locale): Messages {
  return messages[locale] || messages.en;
}

/**
 * Get a nested translation value by dot-path key.
 * e.g. t("nav.courses") => "Courses"
 */
export function t(msgs: Messages, key: string): string {
  const parts = key.split(".");
  let current: unknown = msgs;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key; // fallback to key
    }
  }
  return typeof current === "string" ? current : key;
}
