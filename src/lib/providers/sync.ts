import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { BaseProvider } from "./base";
import type { RawListing, SyncResult } from "./types";
import {
  canonicalizeUrl,
  computeListingFingerprint,
  scoreListingQuality,
  slugifyListingTitle,
} from "./normalization";

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
    const seenExternalIds: string[] = [];

    for (const raw of rawListings) {
      try {
        const outcome = await upsertListing(raw, providerId, provider.name);
        if (outcome === "added") result.itemsAdded++;
        if (outcome === "updated") result.itemsUpdated++;
        if (outcome === "skipped") result.itemsSkipped++;
        if (outcome !== "skipped") seenExternalIds.push(raw.externalId);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error";
        result.errors.push(`${raw.title}: ${msg}`);
      }
    }

    result.itemsExpired = await expireStaleListings(providerId, seenExternalIds);

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

    await prisma.provider.update({
      where: { id: providerId },
      data: {
        lastSyncAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
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

async function upsertListing(
  raw: RawListing,
  providerId: string,
  providerName: string
): Promise<"added" | "updated" | "skipped"> {
  if (!raw.externalId || !raw.title.trim() || !raw.url.trim()) {
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
    : undefined;

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

  if (existing) {
    await prisma.listing.update({
      where: { id: existing.id },
      data: {
        title: raw.title,
        description: raw.description,
        content: raw.content,
        url: raw.url,
        image: raw.image,
        price: raw.price,
        currency: raw.currency ?? "USD",
        priceLabel: raw.priceLabel,
        rating: raw.rating,
        reviewCount: raw.reviewCount,
        duration: raw.duration,
        level: raw.level,
        language: raw.language ?? "en",
        location: raw.location,
        startDate: raw.startDate,
        endDate: raw.endDate,
        expiresAt: raw.expiresAt,
        status: "active",
        canonicalUrl,
        fingerprint,
        sourceUpdatedAt: raw.sourceUpdatedAt,
        publishedAt: raw.publishedAt,
        lastSeenAt: raw.lastSeenAt ?? now,
        qualityScore,
        companyName: raw.companyName,
        salaryMin: raw.salaryMin,
        salaryMax: raw.salaryMax,
        salaryCurrency: raw.salaryCurrency,
        couponCode: raw.couponCode,
        discountText: raw.discountText,
        venueName: raw.venueName,
        country: raw.country,
        region: raw.region,
        metadata,
        compliance,
        ...(categoryId && { categoryId }),
      },
    });

    if (tagIds.length > 0) {
      await prisma.listingTag.deleteMany({
        where: { listingId: existing.id },
      });
      await prisma.listingTag.createMany({
        data: tagIds.map((tagId) => ({
          listingId: existing.id,
          tagId,
        })),
      });
    }
    return "updated";
  } else {
    const slug = await ensureUniqueSlug(slugifyListingTitle(raw.title));

    const listing = await prisma.listing.create({
      data: {
        title: raw.title,
        slug,
        type: raw.type,
        description: raw.description,
        content: raw.content,
        url: raw.url,
        image: raw.image,
        price: raw.price,
        currency: raw.currency ?? "USD",
        priceLabel: raw.priceLabel,
        rating: raw.rating,
        reviewCount: raw.reviewCount,
        duration: raw.duration,
        level: raw.level,
        language: raw.language ?? "en",
        location: raw.location,
        startDate: raw.startDate,
        endDate: raw.endDate,
        expiresAt: raw.expiresAt,
        status: "active",
        canonicalUrl,
        fingerprint,
        sourceUpdatedAt: raw.sourceUpdatedAt,
        publishedAt: raw.publishedAt,
        lastSeenAt: raw.lastSeenAt ?? now,
        qualityScore,
        companyName: raw.companyName,
        salaryMin: raw.salaryMin,
        salaryMax: raw.salaryMax,
        salaryCurrency: raw.salaryCurrency,
        couponCode: raw.couponCode,
        discountText: raw.discountText,
        venueName: raw.venueName,
        country: raw.country,
        region: raw.region,
        metadata,
        compliance,
        providerId,
        ...(categoryId && { categoryId }),
        externalId: raw.externalId,
      },
    });

    if (tagIds.length > 0) {
      await prisma.listingTag.createMany({
        data: tagIds.map((tagId) => ({
          listingId: listing.id,
          tagId,
        })),
      });
    }
    return "added";
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
