import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "EDU Passport";

export function createMetadata({
  title,
  description,
  path = "",
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
}): Metadata {
  const url = `${SITE_URL}${path}`;
  const ogTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    ...(noIndex && { robots: { index: false, follow: false } }),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export function jsonLdWebsite() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function jsonLdItemList(
  items: { name: string; url: string; position: number }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      name: item.name,
      url: item.url,
    })),
  };
}

export function jsonLdBreadcrumb(
  crumbs: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function jsonLdSoftwareApplication(item: {
  name: string;
  description: string;
  url: string;
  category: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: item.name,
    description: item.description,
    url: item.url,
    applicationCategory: item.category,
    offers: {
      "@type": "Offer",
      price: "0",
    },
  };
}

export function jsonLdCourse(listing: {
  title: string;
  description: string;
  url: string;
  slug: string;
  provider: string;
  rating?: number | null;
  reviewCount?: number | null;
  price?: number | null;
  duration?: string | null;
  level?: string | null;
  image?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: listing.title,
    description: listing.description,
    url: `${SITE_URL}/listing/${listing.slug}`,
    provider: {
      "@type": "Organization",
      name: listing.provider,
    },
    ...(listing.image && { image: listing.image }),
    ...(listing.duration && { timeRequired: listing.duration }),
    ...(listing.level && { educationalLevel: listing.level }),
    ...(listing.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: listing.rating,
        ...(listing.reviewCount && { reviewCount: listing.reviewCount }),
        bestRating: 5,
      },
    }),
    ...(listing.price !== undefined && listing.price !== null && {
      offers: {
        "@type": "Offer",
        price: listing.price,
        priceCurrency: "USD",
      },
    }),
  };
}

export function jsonLdJobPosting(listing: {
  title: string;
  description: string;
  url: string;
  slug: string;
  provider: string;
  location?: string | null;
  priceLabel?: string | null;
  createdAt: Date;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: listing.title,
    description: listing.description,
    url: `${SITE_URL}/listing/${listing.slug}`,
    hiringOrganization: {
      "@type": "Organization",
      name: listing.provider,
    },
    datePosted: listing.createdAt.toISOString().slice(0, 10),
    ...(listing.location && {
      jobLocation: {
        "@type": "Place",
        address: listing.location,
      },
    }),
    ...(listing.priceLabel && { baseSalary: listing.priceLabel }),
  };
}

export function jsonLdEvent(listing: {
  title: string;
  description: string;
  url: string;
  slug: string;
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  price?: number | null;
  priceLabel?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: listing.title,
    description: listing.description,
    url: `${SITE_URL}/listing/${listing.slug}`,
    ...(listing.startDate && { startDate: listing.startDate.toISOString() }),
    ...(listing.endDate && { endDate: listing.endDate.toISOString() }),
    ...(listing.location && {
      location: listing.location.toLowerCase().includes("virtual")
        ? { "@type": "VirtualLocation", url: listing.url }
        : { "@type": "Place", address: listing.location },
    }),
    ...(listing.price !== undefined && listing.price !== null && {
      offers: {
        "@type": "Offer",
        price: listing.price,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
    }),
  };
}

export { SITE_URL, SITE_NAME };
