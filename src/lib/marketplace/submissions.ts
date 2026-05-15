const LISTING_TYPES = new Set(["course", "job", "event", "deal"]);
const ORGANIZATION_TYPES = new Set([
  "school",
  "recruiter",
  "vendor",
  "partner",
  "employer",
  "other",
]);

export type NormalizedListingSubmission = {
  type: "course" | "job" | "event" | "deal";
  title: string;
  description: string;
  url: string;
  image?: string;
  organizationName?: string;
  organizationType: "school" | "recruiter" | "vendor" | "partner" | "employer" | "other";
  organizationWebsite?: string;
  companyName?: string;
  location?: string;
  country?: string;
  region?: string;
  startDate?: Date;
  endDate?: Date;
  expiresAt?: Date;
  priceLabel?: string;
  couponCode?: string;
};

export type NormalizeListingSubmissionResult =
  | { ok: true; data: NormalizedListingSubmission }
  | { ok: false; error: string };

function cleanString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;

  const cleaned = sanitizeText(value, maxLength);
  if (!cleaned) return undefined;

  return cleaned;
}

function parseUrl(
  value: unknown,
  field: string,
): { ok: true; value?: string } | { ok: false; error: string } {
  const raw = cleanString(value, 500);
  if (!raw) return { ok: true };

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, error: `${field} must be an http or https URL.` };
    }
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false, error: `${field} must be a valid URL.` };
  }
}

function parseDate(
  value: unknown,
  field: string,
): { ok: true; value?: Date } | { ok: false; error: string } {
  const raw = cleanString(value, 80);
  if (!raw) return { ok: true };

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: `${field} must be a valid date.` };
  }

  return { ok: true, value: date };
}

export function normalizeListingSubmissionInput(
  input: Record<string, unknown>,
): NormalizeListingSubmissionResult {
  const type = cleanString(input.type, 20);
  if (!type || !LISTING_TYPES.has(type)) {
    return { ok: false, error: "Opportunity type must be course, job, event, or deal." };
  }

  const title = cleanString(input.title, 160);
  if (!title || title.length < 4) {
    return { ok: false, error: "Title must be at least 4 characters." };
  }

  const description = cleanString(input.description, 3000);
  if (!description || description.length < 20) {
    return { ok: false, error: "Description must be at least 20 characters." };
  }

  const url = parseUrl(input.url, "URL");
  if (!url.ok) return url;
  if (!url.value) return { ok: false, error: "URL is required." };

  const image = parseUrl(input.image, "Image URL");
  if (!image.ok) return image;

  const organizationWebsite = parseUrl(input.organizationWebsite, "Organization website");
  if (!organizationWebsite.ok) return organizationWebsite;

  const startDate = parseDate(input.startDate, "Start date");
  if (!startDate.ok) return startDate;

  const endDate = parseDate(input.endDate, "End date");
  if (!endDate.ok) return endDate;

  const expiresAt = parseDate(input.expiresAt, "Expiration date");
  if (!expiresAt.ok) return expiresAt;

  const organizationTypeRaw = cleanString(input.organizationType, 40) || "other";
  const organizationType = ORGANIZATION_TYPES.has(organizationTypeRaw)
    ? organizationTypeRaw
    : "other";

  const organizationName = cleanString(input.organizationName, 160);
  const companyName = cleanString(input.companyName, 160);
  const location = cleanString(input.location, 160);
  const country = cleanString(input.country, 80);
  const region = cleanString(input.region, 80);
  const priceLabel = cleanString(input.priceLabel, 120);
  const couponCode = cleanString(input.couponCode, 80);

  return {
    ok: true,
    data: {
      type: type as NormalizedListingSubmission["type"],
      title,
      description,
      url: url.value,
      ...(image.value && { image: image.value }),
      ...(organizationName && { organizationName }),
      organizationType: organizationType as NormalizedListingSubmission["organizationType"],
      ...(organizationWebsite.value && { organizationWebsite: organizationWebsite.value }),
      ...(companyName && { companyName }),
      ...(location && { location }),
      ...(country && { country }),
      ...(region && { region }),
      ...(startDate.value && { startDate: startDate.value }),
      ...(endDate.value && { endDate: endDate.value }),
      ...(expiresAt.value && { expiresAt: expiresAt.value }),
      ...(priceLabel && { priceLabel }),
      ...(couponCode && { couponCode }),
    },
  };
}
import { sanitizeText } from "@/lib/sanitize";
