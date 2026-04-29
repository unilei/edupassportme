/**
 * Input sanitization utilities for user-generated content.
 */

/** Strip HTML tags to prevent XSS in stored text */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/** Trim and collapse whitespace */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** Sanitize a user-provided string: strip HTML + normalize whitespace + length cap */
export function sanitizeText(input: string, maxLength = 5000): string {
  return normalizeWhitespace(stripHtml(input)).slice(0, maxLength);
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Sanitize a slug (lowercase, alphanumeric + hyphens only) */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}
