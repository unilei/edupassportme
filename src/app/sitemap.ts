import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [items, categories, tags, listings] = await Promise.all([
    prisma.item.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.tag.findMany({ select: { slug: true, createdAt: true } }),
    prisma.listing.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/courses`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/jobs`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/events`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/deals`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/category`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/tag`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ];

  const listingPages: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${SITE_URL}/listing/${l.slug}`,
    lastModified: l.updatedAt,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const itemPages: MetadataRoute.Sitemap = items.map((item) => ({
    url: `${SITE_URL}/item/${item.slug}`,
    lastModified: item.updatedAt,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE_URL}/category/${cat.slug}`,
    lastModified: cat.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const tagPages: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${SITE_URL}/tag/${tag.slug}`,
    lastModified: tag.createdAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...listingPages, ...itemPages, ...categoryPages, ...tagPages];
}
