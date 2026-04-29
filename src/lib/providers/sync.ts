import { prisma } from "@/lib/prisma";
import type { BaseProvider } from "./base";
import type { RawListing, SyncResult } from "./types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

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
  const log = await prisma.syncLog.create({
    data: { providerId, status: "running" },
  });

  const result: SyncResult = {
    itemsFound: 0,
    itemsAdded: 0,
    itemsUpdated: 0,
    errors: [],
  };

  try {
    const rawListings = await provider.fetchListings();
    result.itemsFound = rawListings.length;

    for (const raw of rawListings) {
      try {
        await upsertListing(raw, providerId);
        result.itemsAdded++;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error";
        result.errors.push(`${raw.title}: ${msg}`);
      }
    }

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: "success",
        itemsFound: result.itemsFound,
        itemsAdded: result.itemsAdded,
        itemsUpdated: result.itemsUpdated,
        completedAt: new Date(),
      },
    });

    await prisma.provider.update({
      where: { id: providerId },
      data: { lastSyncAt: new Date() },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    result.errors.push(msg);

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: "error",
        error: msg,
        completedAt: new Date(),
      },
    });
  }

  return result;
}

async function upsertListing(
  raw: RawListing,
  providerId: string
): Promise<void> {
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
  } else {
    const slug = await ensureUniqueSlug(slugify(raw.title));

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
  }
}
