import type { Locale } from "./index";

const localeMap: Record<Locale, string> = {
  en: "en-US",
  zh: "zh-CN",
};

const currencyMap: Record<Locale, string> = {
  en: "USD",
  zh: "CNY",
};

/**
 * Format a price with locale-appropriate currency symbol and formatting.
 * Pass an explicit currency to override the locale default.
 */
export function formatPrice(
  amount: number | null | undefined,
  locale: Locale,
  currency?: string,
): string {
  if (amount == null) return locale === "zh" ? "免费" : "Free";
  if (amount === 0) return locale === "zh" ? "免费" : "Free";

  return new Intl.NumberFormat(localeMap[locale], {
    style: "currency",
    currency: currency || currencyMap[locale],
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date with locale-appropriate format.
 */
export function formatDate(
  date: string | Date,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(localeMap[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(d);
}

/**
 * Format a date with time.
 */
export function formatDateTime(
  date: string | Date,
  locale: Locale,
): string {
  return formatDate(date, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a relative time (e.g. "2 days ago", "3小时前").
 */
export function formatRelativeTime(
  date: string | Date,
  locale: Locale,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const rtf = new Intl.RelativeTimeFormat(localeMap[locale], { numeric: "auto" });

  if (days > 30) return formatDate(d, locale);
  if (days > 0) return rtf.format(-days, "day");
  if (hours > 0) return rtf.format(-hours, "hour");
  if (minutes > 0) return rtf.format(-minutes, "minute");
  return rtf.format(-seconds, "second");
}

/**
 * Format a number with locale-appropriate grouping.
 */
export function formatNumber(
  value: number,
  locale: Locale,
): string {
  return new Intl.NumberFormat(localeMap[locale]).format(value);
}
