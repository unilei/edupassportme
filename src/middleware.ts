import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "zh"] as const;
type Locale = (typeof LOCALES)[number];
const DEFAULT_LOCALE: Locale = "en";
const COOKIE_NAME = "NEXT_LOCALE";
const LOCALE_HEADER_NAME = "x-edupassport-locale";

function detectLocale(request: NextRequest): Locale {
  // 1. Cookie
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie && LOCALES.includes(cookie as Locale)) return cookie as Locale;

  // 2. Accept-Language
  const acceptLang = request.headers.get("accept-language") || "";
  for (const part of acceptLang.split(",")) {
    const lang = part.split(";")[0].trim().toLowerCase();
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("en")) return "en";
  }

  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ---------------------------------------------------------------------------
  // Locale prefix handling: /en/... and /zh/... → rewrite to /... with cookie
  // ---------------------------------------------------------------------------
  const localeMatch = pathname.match(/^\/(en|zh)(\/.*)?$/);
  if (localeMatch) {
    const locale = localeMatch[1] as Locale;
    const rest = localeMatch[2] || "/";
    const url = request.nextUrl.clone();
    url.pathname = rest;
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(LOCALE_HEADER_NAME, locale);
    const response = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
    response.cookies.set(COOKIE_NAME, locale, { path: "/", maxAge: 365 * 24 * 60 * 60 });
    applySecurityHeaders(response);
    return response;
  }

  // ---------------------------------------------------------------------------
  // Detect locale and set cookie if missing
  // ---------------------------------------------------------------------------
  const locale = detectLocale(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER_NAME, locale);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (!request.cookies.get(COOKIE_NAME)) {
    response.cookies.set(COOKIE_NAME, locale, { path: "/", maxAge: 365 * 24 * 60 * 60 });
  }

  // ---------------------------------------------------------------------------
  // Security headers
  // ---------------------------------------------------------------------------
  applySecurityHeaders(response);

  // ---------------------------------------------------------------------------
  // Rate limiting for API routes
  // ---------------------------------------------------------------------------
  if (pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    response.headers.set("X-RateLimit-IP", ip);
  }

  return response;
}

function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
}

export const config = {
  matcher: [
    // Match all routes except static assets and _next internals
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest|sw\\.js).*)",
  ],
};
