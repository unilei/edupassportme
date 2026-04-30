import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { BaseProvider } from "./base";
import type { RawListing, SyncResult } from "./types";
import {
  canonicalizeUrl,
  computeListingFingerprint,
  scoreListingQuality,
  slugifyListingTitle,
} from "./normalization";

type ListingWriteTransaction = Pick<typeof prisma, "listing" | "listingTag">;

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 0;
  while (await prisma.listing.findUnique({ where: { slug } })) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
  return slug;
}

export async function syncProvider(
  provider: BaseProvider,
  providerId: string
): Promise<SyncResult> {
  const startedAt = Date.now();
  const log = await prisma.syncLog.create({
    data: { providerId, status: "running" },
  });

  const result: SyncResult = {
    itemsFound: 0,
    itemsAdded: 0,
    itemsUpdated: 0,
    itemsSkipped: 0,
    itemsExpired: 0,
    errors: [],
  };

  try {
    const rawListings = await provider.fetchListings();
    result.itemsFound = rawListings.length;
    const returnedExternalIds: string[] = [];

    for (const raw of rawListings) {
      if (isValidRawListing(raw)) {
        returnedExternalIds.push(raw.externalId);
      }

      try {
        const outcome = await upsertListing(raw, providerId, provider.name);
        if (outcome === "added") result.itemsAdded++;
        if (outcome === "updated") result.itemsUpdated++;
        if (outcome === "skipped") result.itemsSkipped++;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error";
        result.errors.push(`${raw.title}: ${msg}`);
      }
    }

    if (rawListings.length > 0) {
      result.itemsExpired = await expireStaleListings(providerId, returnedExternalIds);
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: result.errors.length > 0 ? "partial" : "success",
        itemsFound: result.itemsFound,
        itemsAdded: result.itemsAdded,
        itemsUpdated: result.itemsUpdated,
        itemsSkipped: result.itemsSkipped,
        itemsExpired: result.itemsExpired,
        details: { errors: result.errors },
        durationMs: Date.now() - startedAt,
        completedAt: new Date(),
      },
    });

    const syncCompletedAt = new Date();
    await prisma.provider.update({
      where: { id: providerId },
      data: result.errors.length > 0
        ? { lastSyncAt: syncCompletedAt }
        : {
            lastSyncAt: syncCompletedAt,
            lastSuccessfulSyncAt: syncCompletedAt,
            failureCount: 0,
          },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    result.errors.push(msg);

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: "error",
        error: msg,
        durationMs: Date.now() - startedAt,
        completedAt: new Date(),
      },
    });

    await prisma.provider.update({
      where: { id: providerId },
      data: {
        lastFailedSyncAt: new Date(),
        failureCount: { increment: 1 },
      },
    });
  }

  return result;
}

function isValidRawListing(raw: RawListing): boolean {
  return Boolean(raw.externalId && raw.title.trim() && raw.url.trim());
}

async function upsertListing(
  raw: RawListing,
  providerId: string,
  providerName: string
): Promise<"added" | "updated" | "skipped"> {
  if (!isValidRawListing(raw)) {
    return "skipped";
  }

  const now = new Date();
  const canonicalUrl = raw.canonicalUrl ?? canonicalizeUrl(raw.url);
  const fingerprint = computeListingFingerprint({
    type: raw.type,
    title: raw.title,
    canonicalUrl,
    providerName,
    location: raw.location,
    startDate: raw.startDate,
  });
  const qualityScore = scoreListingQuality(raw);
  const metadata = (raw.metadata ?? {}) as Prisma.InputJsonValue;
  const compliance = raw.compliance
    ? ({ ...raw.compliance } as Prisma.InputJsonValue)
    : Prisma.DbNull;

  const existing = await prisma.listing.findUnique({
    where: {
      providerId_externalId: {
        providerId,
        externalId: raw.externalId,
      },
    },
  });

  const categoryId = raw.categorySlug
    ? (
        await prisma.category.findUnique({
          where: { slug: raw.categorySlug },
        })
      )?.id ?? null
    : null;

  const tagIds = raw.tagSlugs
    ? await Promise.all(
        raw.tagSlugs.map(async (slug) => {
          const tag = await prisma.tag.findUnique({ where: { slug } });
          return tag?.id;
        })
      ).then((ids) => ids.filter((id): id is string => !!id))
    : [];

  const listingData = {
    title: raw.title,
    description: raw.description,
    content: raw.content ?? null,
    url: raw.url,
    image: raw.image ?? null,
    price: raw.price ?? null,
    currency: raw.currency ?? "USD",
    priceLabel: raw.priceLabel ?? null,
    rating: raw.rating ?? null,
    reviewCount: raw.reviewCount ?? null,
    duration: raw.duration ?? null,
    level: raw.level ?? null,
    language: raw.language ?? "en",
    location: raw.location ?? null,
    startDate: raw.startDate ?? null,
    endDate: raw.endDate ?? null,
    expiresAt: raw.expiresAt ?? null,
    status: "active",
    canonicalUrl,
    fingerprint,
    sourceUpdatedAt: raw.sourceUpdatedAt ?? null,
    publishedAt: raw.publishedAt ?? null,
    lastSeenAt: raw.lastSeenAt ?? now,
    qualityScore,
    companyName: raw.companyName ?? null,
    salaryMin: raw.salaryMin ?? null,
    salaryMax: raw.salaryMax ?? null,
    salaryCurrency: raw.salaryCurrency ?? null,
    couponCode: raw.couponCode ?? null,
    discountText: raw.discountText ?? null,
    venueName: raw.venueName ?? null,
    country: raw.country ?? null,
    region: raw.region ?? null,
    metadata,
    compliance,
    categoryId,
  };

  if (existing) {
    return prisma.$transaction(async (tx: ListingWriteTransaction) => {
      await tx.listing.update({
        where: { id: existing.id },
        data: listingData,
      });

      if (raw.tagSlugs) {
        await tx.listingTag.deleteMany({
          where: { listingId: existing.id },
        });
        if (tagIds.length > 0) {
          await tx.listingTag.createMany({
            data: tagIds.map((tagId) => ({
              listingId: existing.id,
              tagId,
            })),
          });
        }
      }

      return "updated" as const;
    });
  } else {
    const slug = await ensureUniqueSlug(slugifyListingTitle(raw.title));

    return prisma.$transaction(async (tx: ListingWriteTransaction) => {
      const listing = await tx.listing.create({
        data: {
          ...listingData,
          slug,
          type: raw.type,
          providerId,
          externalId: raw.externalId,
        },
      });

      if (tagIds.length > 0) {
        await tx.listingTag.createMany({
          data: tagIds.map((tagId) => ({
            listingId: listing.id,
            tagId,
          })),
        });
      }

      return "added" as const;
    });
  }
}

async function expireStaleListings(providerId: string, seenExternalIds: string[]): Promise<number> {
  const now = new Date();
  const result = await prisma.listing.updateMany({
    where: {
      providerId,
      status: "active",
      externalId: { notIn: seenExternalIds },
      OR: [
        { expiresAt: { lt: now } },
        { endDate: { lt: now } },
      ],
    },
    data: { status: "expired" },
  });
  return result.count;
}
