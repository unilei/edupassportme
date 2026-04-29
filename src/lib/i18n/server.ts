import { cookies, headers } from "next/headers";
import type { Locale } from "./index";
import { locales, getMessages, t as translate } from "./index";

const COOKIE_NAME = "NEXT_LOCALE";
const LOCALE_HEADER_NAME = "x-edupassport-locale";

/**
 * Detect locale on the server side.
 * Priority: middleware header > cookie > Accept-Language header > default "en"
 */
export async function getServerLocale(): Promise<Locale> {
  const headerStore = await headers();

  // 1. Check locale forwarded by middleware rewrites.
  const forwardedLocale = headerStore.get(LOCALE_HEADER_NAME);
  if (forwardedLocale && locales.includes(forwardedLocale as Locale)) {
    return forwardedLocale as Locale;
  }

  // 2. Check cookie
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(COOKIE_NAME)?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // 3. Check Accept-Language header
  const acceptLang = headerStore.get("accept-language") || "";
  for (const part of acceptLang.split(",")) {
    const lang = part.split(";")[0].trim().toLowerCase();
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("en")) return "en";
  }

  return "en";
}

/**
 * Get a translation function for server components.
 * Usage:
 *   const t = await getServerT();
 *   return <h1>{t("home.title")}</h1>;
 */
export async function getServerT() {
  const locale = await getServerLocale();
  const msgs = getMessages(locale);
  return (key: string) => translate(msgs, key);
}

/**
 * Get locale + translation function together.
 */
export async function getServerI18n() {
  const locale = await getServerLocale();
  const msgs = getMessages(locale);
  const t = (key: string) => translate(msgs, key);
  return { locale, t };
}
