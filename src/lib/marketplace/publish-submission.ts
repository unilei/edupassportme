import type { Prisma } from "@/generated/prisma/client";

export type PublishableSubmission = {
  id: string;
  type: "course" | "job" | "event" | "deal";
  title: string;
  description: string;
  url: string;
  image: string | null;
  companyName: string | null;
  location: string | null;
  country: string | null;
  region: string | null;
  startDate: Date | null;
  endDate: Date | null;
  expiresAt: Date | null;
  priceLabel: string | null;
  couponCode: string | null;
  metadata: Prisma.JsonValue | null;
};

export function createListingSlug(title: string, submissionId: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/^-+|-+$/g, "");

  return `${base || "opportunity"}-${submissionId.replace(/_/g, "-")}`;
}

export function buildListingDataFromSubmission(
  submission: PublishableSubmission,
  providerId: string,
): Prisma.ListingUncheckedCreateInput {
  const now = new Date();

  return {
    title: submission.title,
    slug: createListingSlug(submission.title, submission.id),
    type: submission.type,
    description: submission.description,
    url: submission.url,
    image: submission.image,
    priceLabel: submission.priceLabel,
    location: submission.location,
    startDate: submission.startDate,
    endDate: submission.endDate,
    expiresAt: submission.expiresAt,
    companyName: submission.companyName,
    couponCode: submission.couponCode,
    country: submission.country,
    region: submission.region,
    metadata:
      submission.metadata === null ? undefined : (submission.metadata as Prisma.InputJsonValue),
    providerId,
    status: "active",
    verified: true,
    publishedAt: now,
    lastSeenAt: now,
    qualityScore: 0.8,
  };
}
