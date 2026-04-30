# Data Sync Aggregation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-ready data ingestion path for EDU Passport so `courses`, `jobs`, `events`, and `deals` can be refreshed from real external providers with dedupe, expiry cleanup, attribution, and sync monitoring.

**Architecture:** Keep the existing `Provider` and `Listing` model as the core contract, and upgrade the provider framework around it. The implementation adds normalization utilities, provider-specific connectors, safer sync orchestration, status/quality metadata, and frontend/admin reads that only surface valid active data.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7, PostgreSQL, Vitest, existing provider framework in `src/lib/providers`.

---

## Scope Check

The approved design covers a broad ingestion platform. This plan implements the first shippable slice:

- Foundation data model and sync-result correctness.
- Provider contract extensions.
- Stale/expired listing lifecycle.
- MVP connectors for existing course providers, Remotive jobs, USAJOBS jobs, Ticketmaster events, RSS events, and Awin deals.
- Admin sync observability updates.
- User-facing filters to hide inactive synced content.

This plan does not implement LinkedIn/Indeed scraping, paid partner feeds, browser QA for every vertical, dedicated worker infrastructure, or full migration of every historical `Deal` row into `Listing`. Those should follow after the foundation works in production.

## File Structure

Create:

- `prisma/migrations/20260430090000_add_listing_sync_metadata/migration.sql` - SQL migration for status, freshness, metadata, and sync log fields.
- `src/lib/providers/normalization.ts` - shared URL, text, slug, date, fingerprint, and quality helpers.
- `src/lib/providers/compliance.ts` - provider compliance metadata used by connectors and UI.
- `src/lib/providers/remotive.ts` - Remotive jobs connector.
- `src/lib/providers/usajobs.ts` - USAJOBS connector.
- `src/lib/providers/ticketmaster.ts` - Ticketmaster events connector.
- `src/lib/providers/awin.ts` - Awin deals connector.
- `src/__tests__/lib/providers/normalization.test.ts` - pure helper tests.
- `src/__tests__/lib/providers/sync.test.ts` - mocked Prisma tests for add/update/expire behavior.
- `src/__tests__/lib/providers/remotive.test.ts` - fetch mapping test.
- `src/__tests__/lib/providers/usajobs.test.ts` - fetch mapping test.
- `src/__tests__/lib/providers/ticketmaster.test.ts` - fetch mapping test.
- `src/__tests__/lib/providers/awin.test.ts` - fetch mapping test.

Modify:

- `prisma/schema.prisma` - add fields to `Provider`, `Listing`, and `SyncLog`.
- `prisma/seed.ts` - add MVP provider records and default sync metadata.
- `src/lib/providers/types.ts` - extend `RawListing`, `SyncResult`, and config types.
- `src/lib/providers/base.ts` - add provider options and credential checks.
- `src/lib/providers/sync.ts` - correct upsert counts, persist sync metadata, expire stale listings.
- `src/lib/providers/registry.ts` - register MVP connectors and provider skip reasons.
- `src/lib/providers/udemy.ts` - map new normalized fields.
- `src/lib/providers/coursera.ts` - map new normalized fields and mark source limitations.
- `src/lib/providers/rss.ts` - map `publishedAt`, `lastSeenAt`, and compliance.
- `src/lib/providers/index.ts` - export new connectors/helpers.
- `src/app/api/cron/sync/route.ts` - include richer sync summary.
- `src/app/api/admin/sync/route.ts` - return provider health and sync counts.
- `src/app/admin/sync/page.tsx` - render provider health and richer log data.
- `src/app/jobs/page.tsx` - show active jobs only.
- `src/app/events/page.tsx` - show active future events only.
- `src/app/courses/page.tsx` - show active courses only.
- `src/app/deals/page.tsx` - read synced deal listings first, with legacy `Deal` fallback.
- `src/app/search/page.tsx` and `src/app/api/search/route.ts` - exclude inactive listings from search.

---

### Task 1: Schema Migration For Sync Metadata

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260430090000_add_listing_sync_metadata/migration.sql`
- Verify: generated Prisma files after `npm run db:generate`

- [ ] **Step 1: Update `Provider` in `prisma/schema.prisma`**

Add these fields inside `model Provider`, after `syncFrequency`:

```prisma
  authType             String    @default("none") // none | api_key | oauth | basic | token
  rateLimitPerMinute   Int?
  syncCursor           String?
  lastSuccessfulSyncAt DateTime?
  lastFailedSyncAt     DateTime?
  failureCount         Int       @default(0)
  complianceNotes      String?
```

- [ ] **Step 2: Update `Listing` in `prisma/schema.prisma`**

Add these fields inside `model Listing`, after `externalId`:

```prisma
  status          String    @default("active") // active | stale | expired | hidden | needs_review
  canonicalUrl    String?
  fingerprint     String?
  sourceUpdatedAt DateTime?
  publishedAt     DateTime?
  lastSeenAt      DateTime?
  qualityScore    Float     @default(0)
  companyName     String?
  salaryMin       Float?
  salaryMax       Float?
  salaryCurrency  String?
  couponCode      String?
  discountText    String?
  venueName       String?
  country         String?
  region          String?
  metadata        Json?
  compliance      Json?
```

Add indexes near the existing `Listing` indexes:

```prisma
  @@index([status])
  @@index([lastSeenAt])
  @@index([expiresAt])
  @@index([fingerprint])
  @@index([sourceUpdatedAt])
```

- [ ] **Step 3: Update `SyncLog` in `prisma/schema.prisma`**

Add these fields inside `model SyncLog`, after `itemsUpdated`:

```prisma
  itemsSkipped Int     @default(0)
  itemsExpired Int     @default(0)
  durationMs   Int?
  details      Json?
```

- [ ] **Step 4: Create the migration SQL**

Create `prisma/migrations/20260430090000_add_listing_sync_metadata/migration.sql` with:

```sql
ALTER TABLE "Provider"
  ADD COLUMN "authType" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "rateLimitPerMinute" INTEGER,
  ADD COLUMN "syncCursor" TEXT,
  ADD COLUMN "lastSuccessfulSyncAt" TIMESTAMP(3),
  ADD COLUMN "lastFailedSyncAt" TIMESTAMP(3),
  ADD COLUMN "failureCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "complianceNotes" TEXT;

ALTER TABLE "Listing"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "canonicalUrl" TEXT,
  ADD COLUMN "fingerprint" TEXT,
  ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "lastSeenAt" TIMESTAMP(3),
  ADD COLUMN "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "companyName" TEXT,
  ADD COLUMN "salaryMin" DOUBLE PRECISION,
  ADD COLUMN "salaryMax" DOUBLE PRECISION,
  ADD COLUMN "salaryCurrency" TEXT,
  ADD COLUMN "couponCode" TEXT,
  ADD COLUMN "discountText" TEXT,
  ADD COLUMN "venueName" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "region" TEXT,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "compliance" JSONB;

UPDATE "Listing"
SET
  "status" = 'active',
  "canonicalUrl" = "url",
  "lastSeenAt" = COALESCE("updatedAt", "createdAt"),
  "publishedAt" = "createdAt",
  "sourceUpdatedAt" = "updatedAt";

CREATE INDEX "Listing_status_idx" ON "Listing"("status");
CREATE INDEX "Listing_lastSeenAt_idx" ON "Listing"("lastSeenAt");
CREATE INDEX "Listing_expiresAt_idx" ON "Listing"("expiresAt");
CREATE INDEX "Listing_fingerprint_idx" ON "Listing"("fingerprint");
CREATE INDEX "Listing_sourceUpdatedAt_idx" ON "Listing"("sourceUpdatedAt");

ALTER TABLE "SyncLog"
  ADD COLUMN "itemsSkipped" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "itemsExpired" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "durationMs" INTEGER,
  ADD COLUMN "details" JSONB;
```

- [ ] **Step 5: Generate Prisma client**

Run:

```bash
npm run db:generate
```

Expected: Prisma client generation succeeds and updates files under `src/generated/prisma`.

- [ ] **Step 6: Verify TypeScript sees the new fields**

Run:

```bash
npm run typecheck
```

Expected: Existing errors, if any, are unrelated to the new schema fields. If Prisma generated types complain about missing fields in seed data, continue to Task 6 before running the full typecheck again.

- [ ] **Step 7: Commit schema changes**

```bash
git add prisma/schema.prisma prisma/migrations/20260430090000_add_listing_sync_metadata/migration.sql src/generated/prisma
git commit -m "feat: add listing sync metadata"
```

---

### Task 2: Shared Normalization And Compliance Helpers

**Files:**
- Create: `src/lib/providers/normalization.ts`
- Create: `src/lib/providers/compliance.ts`
- Create: `src/__tests__/lib/providers/normalization.test.ts`
- Modify: `src/lib/providers/index.ts`

- [ ] **Step 1: Write normalization tests**

Create `src/__tests__/lib/providers/normalization.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  canonicalizeUrl,
  computeListingFingerprint,
  normalizeText,
  parseOptionalDate,
  scoreListingQuality,
  slugifyListingTitle,
} from "@/lib/providers/normalization";

describe("provider normalization", () => {
  it("normalizes text safely", () => {
    expect(normalizeText("  <b>Hello&nbsp;world</b>  ")).toBe("Hello world");
    expect(normalizeText("A".repeat(700))).toHaveLength(500);
  });

  it("canonicalizes tracking URLs", () => {
    expect(canonicalizeUrl("https://example.com/path?utm_source=x&id=10#top")).toBe("https://example.com/path?id=10");
  });

  it("returns undefined for invalid optional dates", () => {
    expect(parseOptionalDate("not-a-date")).toBeUndefined();
    expect(parseOptionalDate(undefined)).toBeUndefined();
    expect(parseOptionalDate("2026-05-01")?.toISOString()).toContain("2026-05-01");
  });

  it("creates stable fingerprints", () => {
    const a = computeListingFingerprint({
      type: "job",
      title: "Online Math Tutor",
      canonicalUrl: "https://jobs.example.com/1",
      providerName: "Example Jobs",
      location: "Remote",
      startDate: undefined,
    });
    const b = computeListingFingerprint({
      type: "job",
      title: "Online   Math Tutor",
      canonicalUrl: "https://jobs.example.com/1?utm_campaign=test",
      providerName: "Example Jobs",
      location: "remote",
      startDate: undefined,
    });
    expect(a).toBe(b);
  });

  it("scores complete listings higher than thin listings", () => {
    const full = scoreListingQuality({
      title: "Machine Learning Course",
      description: "A complete course with projects",
      url: "https://example.com/course",
      image: "https://example.com/image.jpg",
      categorySlug: "coding-tech",
      priceLabel: "Free",
      rating: 4.8,
      tagSlugs: ["free", "certificate"],
    });
    const thin = scoreListingQuality({
      title: "Course",
      description: "",
      url: "https://example.com/course",
    });
    expect(full).toBeGreaterThan(thin);
    expect(full).toBeLessThanOrEqual(100);
  });

  it("slugifies listing titles", () => {
    expect(slugifyListingTitle(" Intro to Python!!! ")).toBe("intro-to-python");
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npx vitest run src/__tests__/lib/providers/normalization.test.ts
```

Expected: FAIL because `src/lib/providers/normalization.ts` does not exist.

- [ ] **Step 3: Implement `src/lib/providers/normalization.ts`**

Create:

```ts
import type { ListingType } from "@/generated/prisma/enums";
import type { RawListing } from "./types";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
]);

export function normalizeText(value: string | null | undefined, maxLength = 500): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function canonicalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function parseOptionalDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function slugifyListingTitle(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
  return slug || "listing";
}

export function computeListingFingerprint(input: {
  type: ListingType;
  title: string;
  canonicalUrl?: string;
  providerName?: string;
  location?: string | null;
  startDate?: Date;
}): string {
  const normalizedUrl = input.canonicalUrl ? canonicalizeUrl(input.canonicalUrl) : "";
  const datePart = input.startDate ? input.startDate.toISOString().slice(0, 10) : "";
  return [
    input.type,
    normalizeText(input.title, 160).toLowerCase(),
    normalizedUrl.toLowerCase(),
    normalizeText(input.providerName, 120).toLowerCase(),
    normalizeText(input.location, 120).toLowerCase(),
    datePart,
  ].join("|");
}

export function scoreListingQuality(raw: Partial<RawListing>): number {
  let score = 0;
  if (raw.title && normalizeText(raw.title).length >= 8) score += 15;
  if (raw.description && normalizeText(raw.description).length >= 40) score += 20;
  if (raw.url) score += 15;
  if (raw.image) score += 8;
  if (raw.categorySlug) score += 8;
  if (raw.tagSlugs && raw.tagSlugs.length > 0) score += 8;
  if (raw.priceLabel || typeof raw.price === "number") score += 5;
  if (typeof raw.rating === "number" && raw.rating > 0) score += 7;
  if (raw.location || raw.type === "course" || raw.type === "deal") score += 4;
  if (raw.startDate || raw.publishedAt || raw.sourceUpdatedAt) score += 5;
  if (raw.expiresAt || raw.type === "course") score += 5;
  return Math.min(100, score);
}
```

- [ ] **Step 4: Implement `src/lib/providers/compliance.ts`**

Create:

```ts
export interface ProviderCompliance {
  attributionRequired: boolean;
  attributionText?: string;
  directLinkRequired: boolean;
  affiliateAllowed: boolean;
  pastEventStorageAllowed: boolean;
  notes: string;
}

export const PROVIDER_COMPLIANCE: Record<string, ProviderCompliance> = {
  remotive: {
    attributionRequired: true,
    attributionText: "Source: Remotive",
    directLinkRequired: true,
    affiliateAllowed: false,
    pastEventStorageAllowed: true,
    notes: "Display Remotive as source and link back to the Remotive job URL.",
  },
  usajobs: {
    attributionRequired: true,
    attributionText: "Source: USAJOBS",
    directLinkRequired: true,
    affiliateAllowed: false,
    pastEventStorageAllowed: true,
    notes: "Use the official USAJOBS application URL and keep government source attribution.",
  },
  ticketmaster: {
    attributionRequired: true,
    attributionText: "Source: Ticketmaster",
    directLinkRequired: true,
    affiliateAllowed: false,
    pastEventStorageAllowed: false,
    notes: "Use Discovery API data for future events and expire ended events.",
  },
  eventbrite: {
    attributionRequired: true,
    attributionText: "Source: Eventbrite",
    directLinkRequired: true,
    affiliateAllowed: false,
    pastEventStorageAllowed: false,
    notes: "Store future events only unless explicit organizer permission exists.",
  },
  awin: {
    attributionRequired: false,
    directLinkRequired: false,
    affiliateAllowed: true,
    pastEventStorageAllowed: true,
    notes: "Publisher promotions and voucher codes can use tracked links when account access permits it.",
  },
};

export function getProviderCompliance(slug: string): ProviderCompliance | undefined {
  return PROVIDER_COMPLIANCE[slug];
}
```

- [ ] **Step 5: Export helpers**

Modify `src/lib/providers/index.ts`:

```ts
export * from "./normalization";
export * from "./compliance";
```

Keep the existing exports in the same file.

- [ ] **Step 6: Run normalization tests**

Run:

```bash
npx vitest run src/__tests__/lib/providers/normalization.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit helper layer**

```bash
git add src/lib/providers/normalization.ts src/lib/providers/compliance.ts src/lib/providers/index.ts src/__tests__/lib/providers/normalization.test.ts
git commit -m "feat: add provider normalization helpers"
```

---

### Task 3: Extend Provider Types And Base Class

**Files:**
- Modify: `src/lib/providers/types.ts`
- Modify: `src/lib/providers/base.ts`
- Modify: `src/lib/providers/udemy.ts`
- Modify: `src/lib/providers/coursera.ts`
- Modify: `src/lib/providers/rss.ts`

- [ ] **Step 1: Update `RawListing` and sync types**

Modify `src/lib/providers/types.ts`:

```ts
import type { ListingType } from "@/generated/prisma/enums";
import type { ProviderCompliance } from "./compliance";

export interface RawListing {
  externalId: string;
  title: string;
  type: ListingType;
  description: string;
  content?: string;
  url: string;
  canonicalUrl?: string;
  image?: string;
  price?: number;
  currency?: string;
  priceLabel?: string;
  rating?: number;
  reviewCount?: number;
  duration?: string;
  level?: string;
  language?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  expiresAt?: Date;
  sourceUpdatedAt?: Date;
  publishedAt?: Date;
  lastSeenAt?: Date;
  companyName?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  couponCode?: string;
  discountText?: string;
  venueName?: string;
  country?: string;
  region?: string;
  categorySlug?: string;
  tagSlugs?: string[];
  metadata?: Record<string, unknown>;
  compliance?: ProviderCompliance;
}

export interface SyncResult {
  itemsFound: number;
  itemsAdded: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsExpired: number;
  errors: string[];
}

export interface ProviderConfig {
  slug: string;
  name: string;
  apiBaseUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  appId?: string;
  userAgent?: string;
  publisherId?: string;
  rateLimit?: number;
}
```

- [ ] **Step 2: Update `BaseProvider` credential behavior**

Modify `src/lib/providers/base.ts` to add these methods:

```ts
  isConfigured(): boolean {
    return true;
  }

  getMissingConfigReason(): string | null {
    return this.isConfigured() ? null : "Provider credentials are missing";
  }
```

Keep `fetchWithRetry` as-is except for adding `Accept: "application/json"` by default:

```ts
headers: {
  Accept: "application/json, text/plain, */*",
  "User-Agent": this.config.userAgent || "EDU Passport/1.0",
  ...options?.headers,
},
```

- [ ] **Step 3: Map new fields in `UdemyProvider`**

In `src/lib/providers/udemy.ts`, set normalized fields in each returned listing:

```ts
const now = new Date();
const url = `https://www.udemy.com${course.url}`;

allListings.push({
  externalId: `udemy-${course.id}`,
  title: course.title,
  type: "course",
  description: course.headline || course.title,
  content: course.description,
  url,
  canonicalUrl: url,
  image: course.image_480x270,
  price: priceAmount,
  currency,
  priceLabel: mapPriceLabel(course.price),
  rating: Math.round(course.avg_rating * 10) / 10,
  reviewCount: course.num_reviews,
  duration: course.content_info_short,
  level: mapLevel(course.instructional_level_simple),
  language: course.locale?.simple_english_title ?? "English",
  lastSeenAt: now,
  categorySlug: inferCategorySlug(course.title, course.headline),
  tagSlugs: inferTagSlugs(course),
  metadata: {
    subscribers: course.num_subscribers,
    provider: "udemy",
  },
});
```

Do not set `publishedAt` or `sourceUpdatedAt` for Udemy unless the provider response includes a real source-side timestamp. Use `lastSeenAt` for sync time.

- [ ] **Step 4: Map new fields in `CourseraProvider`**

In `src/lib/providers/coursera.ts`, set:

```ts
const now = new Date();
const url = `https://www.coursera.org/learn/${course.slug}`;

allListings.push({
  externalId: `coursera-${course.id}`,
  title: course.name,
  type: "course",
  description: partnerName ? `${desc} — by ${partnerName}` : desc,
  url,
  canonicalUrl: url,
  image: course.photoUrl,
  price: 0,
  priceLabel: "Free to audit",
  duration: course.workload,
  level: mapDifficulty(course.difficultyLevel),
  language: course.primaryLanguages?.[0] ?? "en",
  lastSeenAt: now,
  categorySlug: mapDomainToCategory(course.domainTypes),
  tagSlugs: inferTagSlugs(course),
  metadata: {
    partnerName,
    provider: "coursera",
  },
});
```

Do not set `publishedAt` or `sourceUpdatedAt` for Coursera unless the provider response includes a real source-side timestamp. Use `lastSeenAt` for sync time.

- [ ] **Step 5: Map new fields in `RssProvider`**

In `src/lib/providers/rss.ts`, add `canonicalizeUrl`, `normalizeText`, and `parseOptionalDate` imports, then return:

```ts
const now = new Date();

return items.map((item) => {
  const publishedAt = parseOptionalDate(item.pubDate);
  return {
    externalId: item.guid || item.link,
    title: normalizeText(item.title, 160),
    type: this.options.listingType,
    description: normalizeText(item.description),
    url: item.link,
    canonicalUrl: canonicalizeUrl(item.link),
    publishedAt,
    sourceUpdatedAt: publishedAt,
    lastSeenAt: now,
    startDate: this.options.listingType === "event" ? publishedAt : undefined,
    categorySlug: this.options.categorySlug,
    tagSlugs: this.options.tagSlugs,
    metadata: { source: "rss", feedUrl: this.options.feedUrl },
  };
});
```

- [ ] **Step 6: Run TypeScript check for provider types**

Run:

```bash
npm run typecheck
```

Expected: no new type errors from provider type changes.

- [ ] **Step 7: Commit provider contract changes**

```bash
git add src/lib/providers/types.ts src/lib/providers/base.ts src/lib/providers/udemy.ts src/lib/providers/coursera.ts src/lib/providers/rss.ts
git commit -m "feat: extend provider listing contract"
```

---

### Task 4: Correct Sync Add/Update Counts And Lifecycle

**Files:**
- Modify: `src/lib/providers/sync.ts`
- Create: `src/__tests__/lib/providers/sync.test.ts`

- [ ] **Step 1: Write sync behavior tests**

Create `src/__tests__/lib/providers/sync.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BaseProvider } from "@/lib/providers/base";
import type { RawListing } from "@/lib/providers/types";

const mockCreateLog = vi.fn();
const mockUpdateLog = vi.fn();
const mockFindListing = vi.fn();
const mockCreateListing = vi.fn();
const mockUpdateListing = vi.fn();
const mockUpdateManyListing = vi.fn();
const mockFindCategory = vi.fn();
const mockFindTag = vi.fn();
const mockDeleteTags = vi.fn();
const mockCreateTags = vi.fn();
const mockUpdateProvider = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    syncLog: {
      create: (...args: unknown[]) => mockCreateLog(...args),
      update: (...args: unknown[]) => mockUpdateLog(...args),
    },
    listing: {
      findUnique: (...args: unknown[]) => mockFindListing(...args),
      create: (...args: unknown[]) => mockCreateListing(...args),
      update: (...args: unknown[]) => mockUpdateListing(...args),
      updateMany: (...args: unknown[]) => mockUpdateManyListing(...args),
    },
    category: {
      findUnique: (...args: unknown[]) => mockFindCategory(...args),
    },
    tag: {
      findUnique: (...args: unknown[]) => mockFindTag(...args),
    },
    listingTag: {
      deleteMany: (...args: unknown[]) => mockDeleteTags(...args),
      createMany: (...args: unknown[]) => mockCreateTags(...args),
    },
    provider: {
      update: (...args: unknown[]) => mockUpdateProvider(...args),
    },
  },
}));

import { syncProvider } from "@/lib/providers/sync";

function makeProvider(items: RawListing[]): BaseProvider {
  return {
    slug: "test-provider",
    name: "Test Provider",
    isConfigured: () => true,
    getMissingConfigReason: () => null,
    fetchListings: vi.fn().mockResolvedValue(items),
  } as unknown as BaseProvider;
}

const raw: RawListing = {
  externalId: "external-1",
  title: "Intro to Python",
  type: "course",
  description: "A complete beginner course for Python programming.",
  url: "https://example.com/course?utm_source=test",
  categorySlug: "coding-tech",
  tagSlugs: ["free"],
};

describe("syncProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateLog.mockResolvedValue({ id: "log1" });
    mockFindCategory.mockResolvedValue({ id: "cat1" });
    mockFindTag.mockResolvedValue({ id: "tag1" });
    mockCreateTags.mockResolvedValue({ count: 1 });
    mockUpdateManyListing.mockResolvedValue({ count: 0 });
    mockUpdateProvider.mockResolvedValue({});
    mockUpdateLog.mockResolvedValue({});
  });

  it("counts created listings as added", async () => {
    mockFindListing.mockResolvedValue(null);
    mockCreateListing.mockResolvedValue({ id: "listing1" });

    const result = await syncProvider(makeProvider([raw]), "provider1");

    expect(result.itemsFound).toBe(1);
    expect(result.itemsAdded).toBe(1);
    expect(result.itemsUpdated).toBe(0);
    expect(mockCreateListing).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        title: "Intro to Python",
        status: "active",
        providerId: "provider1",
        externalId: "external-1",
        lastSeenAt: expect.any(Date),
      }),
    }));
  });

  it("counts existing listings as updated", async () => {
    mockFindListing.mockResolvedValue({ id: "existing1", slug: "intro-to-python" });

    const result = await syncProvider(makeProvider([raw]), "provider1");

    expect(result.itemsAdded).toBe(0);
    expect(result.itemsUpdated).toBe(1);
    expect(mockUpdateListing).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "existing1" },
      data: expect.objectContaining({
        status: "active",
        lastSeenAt: expect.any(Date),
      }),
    }));
  });

  it("expires stale provider listings after a successful sync", async () => {
    mockFindListing.mockResolvedValue(null);
    mockCreateListing.mockResolvedValue({ id: "listing1" });
    mockUpdateManyListing.mockResolvedValue({ count: 2 });

    const result = await syncProvider(makeProvider([raw]), "provider1");

    expect(result.itemsExpired).toBe(2);
    expect(mockUpdateManyListing).toHaveBeenCalledWith({
      where: {
        providerId: "provider1",
        status: "active",
        externalId: { notIn: ["external-1"] },
        OR: [
          { expiresAt: { lt: expect.any(Date) } },
          { endDate: { lt: expect.any(Date) } },
        ],
      },
      data: { status: "expired" },
    });
  });
});
```

- [ ] **Step 2: Run failing sync tests**

Run:

```bash
npx vitest run src/__tests__/lib/providers/sync.test.ts
```

Expected: FAIL because `syncProvider` does not count updates separately or set lifecycle metadata.

- [ ] **Step 3: Update `syncProvider` result initialization**

In `src/lib/providers/sync.ts`, initialize:

```ts
const startedAt = Date.now();
const result: SyncResult = {
  itemsFound: 0,
  itemsAdded: 0,
  itemsUpdated: 0,
  itemsSkipped: 0,
  itemsExpired: 0,
  errors: [],
};
```

- [ ] **Step 4: Change `upsertListing` to return `"added" | "updated" | "skipped"`**

Change the function signature:

```ts
async function upsertListing(
  raw: RawListing,
  providerId: string,
  providerName: string
): Promise<"added" | "updated" | "skipped"> {
```

At the top of the function, skip invalid rows:

```ts
if (!raw.externalId || !raw.title.trim() || !raw.url.trim()) {
  return "skipped";
}
```

Create shared normalized values:

```ts
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
const metadata = raw.metadata ?? {};
const compliance = raw.compliance ? { ...raw.compliance } : undefined;
```

- [ ] **Step 5: Return accurate counts from the sync loop**

In the sync loop:

```ts
const seenExternalIds: string[] = [];

for (const raw of rawListings) {
  try {
    const outcome = await upsertListing(raw, providerId, provider.name);
    if (outcome === "added") result.itemsAdded++;
    if (outcome === "updated") result.itemsUpdated++;
    if (outcome === "skipped") result.itemsSkipped++;
    if (outcome !== "skipped") seenExternalIds.push(raw.externalId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    result.errors.push(`${raw.title}: ${msg}`);
  }
}

result.itemsExpired = await expireStaleListings(providerId, seenExternalIds);
```

- [ ] **Step 6: Add lifecycle fields to create/update data**

For both `prisma.listing.update` and `prisma.listing.create`, include:

```ts
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
```

After updating an existing listing, return `"updated"`. After creating, return `"added"`.

- [ ] **Step 7: Add stale expiry helper**

Add below `upsertListing`:

```ts
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
```

- [ ] **Step 8: Update sync log and provider health writes**

On success:

```ts
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
```

On fatal error:

```ts
await prisma.provider.update({
  where: { id: providerId },
  data: {
    lastFailedSyncAt: new Date(),
    failureCount: { increment: 1 },
  },
});
```

- [ ] **Step 9: Run sync tests**

Run:

```bash
npx vitest run src/__tests__/lib/providers/sync.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit sync lifecycle**

```bash
git add src/lib/providers/sync.ts src/__tests__/lib/providers/sync.test.ts
git commit -m "feat: track listing sync lifecycle"
```

---

### Task 5: Add MVP External Providers

**Files:**
- Create: `src/lib/providers/remotive.ts`
- Create: `src/lib/providers/usajobs.ts`
- Create: `src/lib/providers/ticketmaster.ts`
- Create: `src/lib/providers/awin.ts`
- Create tests listed below.
- Modify: `src/lib/providers/registry.ts`
- Modify: `src/lib/providers/index.ts`

- [ ] **Step 1: Create Remotive provider test**

Create `src/__tests__/lib/providers/remotive.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { RemotiveProvider } from "@/lib/providers/remotive";

describe("RemotiveProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps remote jobs into RawListing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        jobs: [{
          id: 123,
          title: "Remote Instructional Designer",
          company_name: "Acme Learning",
          category: "Education",
          job_type: "full_time",
          publication_date: "2026-04-20T00:00:00Z",
          candidate_required_location: "Worldwide",
          salary: "$80k-$100k",
          description: "<p>Create online courses.</p>",
          url: "https://remotive.com/remote-jobs/education/123",
        }],
      }),
    } as Response);

    const provider = new RemotiveProvider({ slug: "remotive", name: "Remotive" });
    const listings = await provider.fetchListings();

    expect(listings[0]).toMatchObject({
      externalId: "remotive-123",
      type: "job",
      title: "Remote Instructional Designer",
      companyName: "Acme Learning",
      location: "Worldwide",
      priceLabel: "$80k-$100k",
      categorySlug: "professional-development",
    });
    expect(listings[0].compliance?.attributionText).toBe("Source: Remotive");
  });
});
```

- [ ] **Step 2: Implement `src/lib/providers/remotive.ts`**

Create:

```ts
import { BaseProvider } from "./base";
import { getProviderCompliance } from "./compliance";
import { canonicalizeUrl, normalizeText, parseOptionalDate } from "./normalization";
import type { RawListing } from "./types";

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  category?: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
  url: string;
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
}

function inferCategory(job: RemotiveJob): string {
  const text = `${job.title} ${job.category ?? ""}`.toLowerCase();
  if (text.includes("teacher") || text.includes("tutor")) return "test-prep-tutoring";
  if (text.includes("curriculum") || text.includes("instructional")) return "teaching-lms";
  if (text.includes("developer") || text.includes("engineer")) return "coding-tech";
  return "professional-development";
}

export class RemotiveProvider extends BaseProvider {
  async fetchListings(): Promise<RawListing[]> {
    const res = await this.fetchWithRetry("https://remotive.com/api/remote-jobs?search=education");
    const data = (await res.json()) as RemotiveResponse;
    const now = new Date();

    return data.jobs.map((job) => {
      const publishedAt = parseOptionalDate(job.publication_date);
      return {
        externalId: `remotive-${job.id}`,
        title: normalizeText(job.title, 180),
        type: "job",
        description: normalizeText(job.description),
        content: normalizeText(job.description, 4000),
        url: job.url,
        canonicalUrl: canonicalizeUrl(job.url),
        location: job.candidate_required_location || "Remote",
        companyName: job.company_name,
        priceLabel: job.salary,
        publishedAt,
        sourceUpdatedAt: publishedAt,
        lastSeenAt: now,
        categorySlug: inferCategory(job),
        tagSlugs: ["professional", "web"],
        metadata: {
          jobType: job.job_type,
          sourceCategory: job.category,
        },
        compliance: getProviderCompliance("remotive"),
      };
    });
  }
}
```

- [ ] **Step 3: Create USAJOBS provider test**

Create `src/__tests__/lib/providers/usajobs.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { UsaJobsProvider } from "@/lib/providers/usajobs";

describe("UsaJobsProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("requires API key and user agent email", () => {
    const provider = new UsaJobsProvider({ slug: "usajobs", name: "USAJOBS" });
    expect(provider.isConfigured()).toBe(false);
  });

  it("maps government jobs into RawListing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        SearchResult: {
          SearchResultItems: [{
            MatchedObjectId: "abc",
            MatchedObjectDescriptor: {
              PositionTitle: "Education Program Specialist",
              OrganizationName: "Department of Education",
              PositionURI: "https://www.usajobs.gov/job/abc",
              PositionLocationDisplay: "Washington, DC",
              PublicationStartDate: "2026-04-20T00:00:00Z",
              ApplicationCloseDate: "2026-05-10T23:59:59Z",
              UserArea: {
                Details: {
                  JobSummary: "Support federal education programs.",
                  LowGrade: "11",
                  HighGrade: "13",
                },
              },
              PositionRemuneration: [{
                MinimumRange: "80000",
                MaximumRange: "115000",
                RateIntervalCode: "Per Year",
              }],
            },
          }],
        },
      }),
    } as Response);

    const provider = new UsaJobsProvider({
      slug: "usajobs",
      name: "USAJOBS",
      apiKey: "key",
      userAgent: "ops@example.com",
    });
    const listings = await provider.fetchListings();

    expect(listings[0]).toMatchObject({
      externalId: "usajobs-abc",
      type: "job",
      title: "Education Program Specialist",
      companyName: "Department of Education",
      salaryMin: 80000,
      salaryMax: 115000,
      salaryCurrency: "USD",
    });
  });
});
```

- [ ] **Step 4: Implement `src/lib/providers/usajobs.ts`**

Create:

```ts
import { BaseProvider } from "./base";
import { getProviderCompliance } from "./compliance";
import { canonicalizeUrl, normalizeText, parseOptionalDate } from "./normalization";
import type { RawListing } from "./types";

interface UsaJobsItem {
  MatchedObjectId: string;
  MatchedObjectDescriptor: {
    PositionTitle: string;
    OrganizationName?: string;
    PositionURI: string;
    PositionLocationDisplay?: string;
    PublicationStartDate?: string;
    ApplicationCloseDate?: string;
    UserArea?: { Details?: { JobSummary?: string; LowGrade?: string; HighGrade?: string } };
    PositionRemuneration?: Array<{
      MinimumRange?: string;
      MaximumRange?: string;
      RateIntervalCode?: string;
    }>;
  };
}

interface UsaJobsResponse {
  SearchResult?: { SearchResultItems?: UsaJobsItem[] };
}

export class UsaJobsProvider extends BaseProvider {
  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.userAgent);
  }

  getMissingConfigReason(): string | null {
    return this.isConfigured() ? null : "USAJOBS_API_KEY and USAJOBS_USER_AGENT are required";
  }

  async fetchListings(): Promise<RawListing[]> {
    const params = new URLSearchParams({
      Keyword: "education OR teacher OR curriculum OR training",
      ResultsPerPage: "50",
    });
    const res = await this.fetchWithRetry(`https://data.usajobs.gov/api/Search?${params}`, {
      headers: {
        "Authorization-Key": this.config.apiKey || "",
        "User-Agent": this.config.userAgent || "",
      },
    });
    const data = (await res.json()) as UsaJobsResponse;
    const now = new Date();

    return (data.SearchResult?.SearchResultItems ?? []).map((item) => {
      const job = item.MatchedObjectDescriptor;
      const pay = job.PositionRemuneration?.[0];
      const salaryMin = pay?.MinimumRange ? Number(pay.MinimumRange) : undefined;
      const salaryMax = pay?.MaximumRange ? Number(pay.MaximumRange) : undefined;
      const publishedAt = parseOptionalDate(job.PublicationStartDate);
      const expiresAt = parseOptionalDate(job.ApplicationCloseDate);

      return {
        externalId: `usajobs-${item.MatchedObjectId}`,
        title: normalizeText(job.PositionTitle, 180),
        type: "job",
        description: normalizeText(job.UserArea?.Details?.JobSummary || job.PositionTitle),
        url: job.PositionURI,
        canonicalUrl: canonicalizeUrl(job.PositionURI),
        location: job.PositionLocationDisplay,
        companyName: job.OrganizationName,
        salaryMin,
        salaryMax,
        salaryCurrency: salaryMin || salaryMax ? "USD" : undefined,
        priceLabel: salaryMin || salaryMax ? `$${salaryMin ?? ""}-${salaryMax ?? ""} ${pay?.RateIntervalCode ?? ""}`.trim() : undefined,
        publishedAt,
        sourceUpdatedAt: publishedAt,
        expiresAt,
        lastSeenAt: now,
        categorySlug: "professional-development",
        tagSlugs: ["professional", "higher-education"],
        metadata: {
          lowGrade: job.UserArea?.Details?.LowGrade,
          highGrade: job.UserArea?.Details?.HighGrade,
        },
        compliance: getProviderCompliance("usajobs"),
      };
    });
  }
}
```

- [ ] **Step 5: Create Ticketmaster provider test**

Create `src/__tests__/lib/providers/ticketmaster.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { TicketmasterProvider } from "@/lib/providers/ticketmaster";

describe("TicketmasterProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps events into RawListing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        _embedded: {
          events: [{
            id: "tm1",
            name: "Education Innovation Summit",
            url: "https://ticketmaster.com/event/tm1",
            info: "A summit for education leaders.",
            images: [{ url: "https://img.example.com/a.jpg", width: 640 }],
            dates: { start: { dateTime: "2026-06-01T15:00:00Z" } },
            priceRanges: [{ min: 20, max: 100, currency: "USD" }],
            _embedded: { venues: [{ name: "Convention Center", city: { name: "Los Angeles" }, state: { stateCode: "CA" }, country: { countryCode: "US" } }] },
          }],
        },
      }),
    } as Response);

    const provider = new TicketmasterProvider({ slug: "ticketmaster", name: "Ticketmaster", apiKey: "key" });
    const listings = await provider.fetchListings();

    expect(listings[0]).toMatchObject({
      externalId: "ticketmaster-tm1",
      type: "event",
      title: "Education Innovation Summit",
      venueName: "Convention Center",
      country: "US",
      region: "CA",
      priceLabel: "$20-$100",
    });
  });
});
```

- [ ] **Step 6: Implement `src/lib/providers/ticketmaster.ts`**

Create:

```ts
import { BaseProvider } from "./base";
import { getProviderCompliance } from "./compliance";
import { canonicalizeUrl, normalizeText, parseOptionalDate } from "./normalization";
import type { RawListing } from "./types";

interface TicketmasterEvent {
  id: string;
  name: string;
  url: string;
  info?: string;
  description?: string;
  images?: Array<{ url: string; width?: number }>;
  dates?: { start?: { dateTime?: string; localDate?: string } };
  priceRanges?: Array<{ min?: number; max?: number; currency?: string }>;
  _embedded?: {
    venues?: Array<{
      name?: string;
      city?: { name?: string };
      state?: { stateCode?: string };
      country?: { countryCode?: string };
    }>;
  };
}

interface TicketmasterResponse {
  _embedded?: { events?: TicketmasterEvent[] };
}

export class TicketmasterProvider extends BaseProvider {
  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  getMissingConfigReason(): string | null {
    return this.isConfigured() ? null : "TICKETMASTER_API_KEY is required";
  }

  async fetchListings(): Promise<RawListing[]> {
    const params = new URLSearchParams({
      apikey: this.config.apiKey || "",
      keyword: "education OR edtech OR learning",
      countryCode: "US",
      size: "50",
      sort: "date,asc",
    });
    const res = await this.fetchWithRetry(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`);
    const data = (await res.json()) as TicketmasterResponse;
    const now = new Date();

    return (data._embedded?.events ?? []).map((event) => {
      const venue = event._embedded?.venues?.[0];
      const startDate = parseOptionalDate(event.dates?.start?.dateTime || event.dates?.start?.localDate);
      const price = event.priceRanges?.[0];
      const image = event.images?.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url;

      return {
        externalId: `ticketmaster-${event.id}`,
        title: normalizeText(event.name, 180),
        type: "event",
        description: normalizeText(event.info || event.description || event.name),
        url: event.url,
        canonicalUrl: canonicalizeUrl(event.url),
        image,
        price: price?.min,
        currency: price?.currency || "USD",
        priceLabel: price?.min || price?.max ? `$${price.min ?? ""}-${price.max ?? ""}` : undefined,
        location: [venue?.city?.name, venue?.state?.stateCode, venue?.country?.countryCode].filter(Boolean).join(", "),
        venueName: venue?.name,
        startDate,
        endDate: startDate,
        expiresAt: startDate,
        publishedAt: now,
        sourceUpdatedAt: now,
        lastSeenAt: now,
        country: venue?.country?.countryCode,
        region: venue?.state?.stateCode,
        categorySlug: "community-forums",
        tagSlugs: ["community", "professional"],
        metadata: { source: "ticketmaster" },
        compliance: getProviderCompliance("ticketmaster"),
      };
    });
  }
}
```

- [ ] **Step 7: Create Awin provider test**

Create `src/__tests__/lib/providers/awin.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { AwinOffersProvider } from "@/lib/providers/awin";

describe("AwinOffersProvider", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps vouchers into deal listings", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        promotions: [{
          promotionId: 55,
          type: "voucher",
          title: "20% off coding courses",
          description: "Save on selected online learning plans.",
          voucher: { code: "LEARN20" },
          advertiser: { id: 1, name: "Learning Merchant", joined: true },
          startDate: "2026-04-01",
          endDate: "2026-05-01",
          url: "https://merchant.example.com/deal",
          regions: ["US"],
        }],
      }),
    } as Response);

    const provider = new AwinOffersProvider({
      slug: "awin",
      name: "Awin",
      apiKey: "token",
      publisherId: "123",
    });
    const listings = await provider.fetchListings();

    expect(listings[0]).toMatchObject({
      externalId: "awin-55",
      type: "deal",
      title: "20% off coding courses",
      couponCode: "LEARN20",
      companyName: "Learning Merchant",
      categorySlug: "online-courses",
    });
  });
});
```

- [ ] **Step 8: Implement `src/lib/providers/awin.ts`**

Create:

```ts
import { BaseProvider } from "./base";
import { getProviderCompliance } from "./compliance";
import { canonicalizeUrl, normalizeText, parseOptionalDate } from "./normalization";
import type { RawListing } from "./types";

interface AwinPromotion {
  promotionId: number;
  type: "promotion" | "voucher";
  title: string;
  description?: string;
  terms?: string;
  voucher?: { code?: string };
  advertiser?: { id?: number; name?: string; joined?: boolean };
  startDate?: string;
  endDate?: string;
  url?: string;
  regions?: string[];
}

interface AwinResponse {
  promotions?: AwinPromotion[];
}

export class AwinOffersProvider extends BaseProvider {
  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.publisherId);
  }

  getMissingConfigReason(): string | null {
    return this.isConfigured() ? null : "AWIN_ACCESS_TOKEN and AWIN_PUBLISHER_ID are required";
  }

  async fetchListings(): Promise<RawListing[]> {
    const body = {
      filters: {
        membership: "joined",
        status: "active",
        type: "all",
      },
      pagination: { page: 1, pageSize: 100 },
    };

    const res = await this.fetchWithRetry(`https://api.awin.com/publisher/${this.config.publisherId}/promotions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as AwinResponse;
    const now = new Date();

    return (data.promotions ?? []).map((promotion) => {
      const startsAt = parseOptionalDate(promotion.startDate);
      const expiresAt = parseOptionalDate(promotion.endDate);
      const url = promotion.url || "https://www.awin.com";

      return {
        externalId: `awin-${promotion.promotionId}`,
        title: normalizeText(promotion.title, 180),
        type: "deal",
        description: normalizeText(promotion.description || promotion.terms || promotion.title),
        content: normalizeText(promotion.terms, 2000),
        url,
        canonicalUrl: canonicalizeUrl(url),
        companyName: promotion.advertiser?.name,
        couponCode: promotion.voucher?.code,
        discountText: promotion.title,
        startDate: startsAt,
        expiresAt,
        publishedAt: startsAt,
        sourceUpdatedAt: now,
        lastSeenAt: now,
        country: promotion.regions?.[0],
        categorySlug: "online-courses",
        tagSlugs: promotion.type === "voucher" ? ["paid"] : ["freemium"],
        metadata: {
          promotionType: promotion.type,
          advertiserId: promotion.advertiser?.id,
          joined: promotion.advertiser?.joined,
        },
        compliance: getProviderCompliance("awin"),
      };
    });
  }
}
```

- [ ] **Step 9: Register providers in `src/lib/providers/registry.ts`**

Add imports:

```ts
import { RemotiveProvider } from "./remotive";
import { UsaJobsProvider } from "./usajobs";
import { TicketmasterProvider } from "./ticketmaster";
import { AwinOffersProvider } from "./awin";
```

Add switch cases:

```ts
    case "remotive":
      return new RemotiveProvider(config);

    case "usajobs":
      return new UsaJobsProvider({
        ...config,
        apiKey: process.env.USAJOBS_API_KEY,
        userAgent: process.env.USAJOBS_USER_AGENT,
      });

    case "ticketmaster":
      return new TicketmasterProvider({
        ...config,
        apiKey: process.env.TICKETMASTER_API_KEY,
      });

    case "awin":
      return new AwinOffersProvider({
        ...config,
        apiKey: process.env.AWIN_ACCESS_TOKEN,
        publisherId: process.env.AWIN_PUBLISHER_ID,
      });
```

Before syncing an instance in `syncSingleProvider` and `syncAllProviders`, add:

```ts
if (!instance.isConfigured()) {
  results.push({
    providerId: provider.id,
    providerName: provider.name,
    providerSlug: provider.slug,
    result: null,
    skipped: true,
    error: instance.getMissingConfigReason() || "Provider is not configured",
  });
  continue;
}
```

For `syncSingleProvider`, return the same skipped shape when not configured.

- [ ] **Step 10: Export new providers**

Modify `src/lib/providers/index.ts`:

```ts
export { RemotiveProvider } from "./remotive";
export { UsaJobsProvider } from "./usajobs";
export { TicketmasterProvider } from "./ticketmaster";
export { AwinOffersProvider } from "./awin";
```

- [ ] **Step 11: Run provider tests**

Run:

```bash
npx vitest run src/__tests__/lib/providers/remotive.test.ts src/__tests__/lib/providers/usajobs.test.ts src/__tests__/lib/providers/ticketmaster.test.ts src/__tests__/lib/providers/awin.test.ts
```

Expected: PASS.

- [ ] **Step 12: Commit MVP providers**

```bash
git add src/lib/providers src/__tests__/lib/providers
git commit -m "feat: add MVP sync providers"
```

---

### Task 6: Seed Provider Records And Env Documentation

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `README.md`

- [ ] **Step 1: Update provider seed records**

In `prisma/seed.ts`, add or update provider records for the MVP sources:

```ts
remotive: await prisma.provider.create({
  data: {
    name: "Remotive",
    slug: "remotive",
    url: "https://remotive.com",
    logo: "https://remotive.com/favicon.ico",
    description: "Remote jobs with education and EdTech roles",
    apiType: "rest",
    authType: "none",
    syncFrequency: "hourly",
    rateLimitPerMinute: 30,
    complianceNotes: "Requires Remotive attribution and source link.",
  },
}),
usajobs: await prisma.provider.create({
  data: {
    name: "USAJOBS",
    slug: "usajobs",
    url: "https://www.usajobs.gov",
    logo: "https://www.usajobs.gov/favicon.ico",
    description: "Official U.S. government job listings",
    apiType: "rest",
    authType: "api_key",
    syncFrequency: "daily",
    rateLimitPerMinute: 60,
    complianceNotes: "Use official application links and source attribution.",
  },
}),
ticketmaster: await prisma.provider.create({
  data: {
    name: "Ticketmaster",
    slug: "ticketmaster",
    url: "https://www.ticketmaster.com",
    logo: "https://www.ticketmaster.com/favicon.ico",
    description: "Event discovery API for public events",
    apiType: "rest",
    authType: "api_key",
    syncFrequency: "daily",
    rateLimitPerMinute: 300,
    complianceNotes: "Future events only; expire ended events.",
  },
}),
awin: await prisma.provider.create({
  data: {
    name: "Awin",
    slug: "awin",
    url: "https://www.awin.com",
    logo: "https://www.awin.com/favicon.ico",
    description: "Affiliate promotions and voucher codes",
    apiType: "rest",
    authType: "token",
    syncFrequency: "hourly",
    rateLimitPerMinute: 60,
    complianceNotes: "Publisher offers only; use account-approved promotions.",
  },
}),
```

- [ ] **Step 2: Add env vars to README**

In the README environment table, add:

```md
| `USAJOBS_API_KEY` | No | USAJOBS API key for public-sector education job sync |
| `USAJOBS_USER_AGENT` | No | Email/user-agent registered with USAJOBS |
| `TICKETMASTER_API_KEY` | No | Ticketmaster Discovery API key for event sync |
| `AWIN_ACCESS_TOKEN` | No | Awin publisher API token for promotions/deals sync |
| `AWIN_PUBLISHER_ID` | No | Awin publisher account ID |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | No | Reserved for Adzuna jobs provider in the next source expansion |
```

- [ ] **Step 3: Run seed typecheck path**

Run:

```bash
npm run typecheck
```

Expected: PASS or only pre-existing unrelated errors. Provider create calls should typecheck with the new Prisma fields.

- [ ] **Step 4: Commit seed and docs**

```bash
git add prisma/seed.ts README.md
git commit -m "docs: document provider sync credentials"
```

---

### Task 7: Admin Sync Observability

**Files:**
- Modify: `src/app/api/admin/sync/route.ts`
- Modify: `src/app/api/cron/sync/route.ts`
- Modify: `src/app/admin/sync/page.tsx`
- Test: `src/__tests__/api/admin-sync.test.ts`

- [ ] **Step 1: Write admin sync API test**

Create `src/__tests__/api/admin-sync.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockProviderFindMany = vi.fn();
const mockSyncLogFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    provider: { findMany: (...args: unknown[]) => mockProviderFindMany(...args) },
    syncLog: { findMany: (...args: unknown[]) => mockSyncLogFindMany(...args) },
  },
}));

import { GET } from "@/app/api/admin/sync/route";

describe("GET /api/admin/sync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns provider health fields and rich sync logs", async () => {
    mockProviderFindMany.mockResolvedValue([{
      id: "p1",
      name: "Remotive",
      slug: "remotive",
      isActive: true,
      apiType: "rest",
      authType: "none",
      syncFrequency: "hourly",
      lastSyncAt: null,
      lastSuccessfulSyncAt: null,
      lastFailedSyncAt: null,
      failureCount: 0,
      rateLimitPerMinute: 30,
      _count: { listings: 10, syncLogs: 2 },
    }]);
    mockSyncLogFindMany.mockResolvedValue([{
      id: "l1",
      status: "success",
      itemsFound: 10,
      itemsAdded: 7,
      itemsUpdated: 3,
      itemsSkipped: 0,
      itemsExpired: 1,
      durationMs: 500,
      details: null,
      error: null,
      startedAt: new Date(),
      completedAt: new Date(),
      provider: { name: "Remotive", slug: "remotive" },
    }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.providers[0].authType).toBe("none");
    expect(body.recentLogs[0].itemsExpired).toBe(1);
  });
});
```

- [ ] **Step 2: Update admin sync GET select**

In `src/app/api/admin/sync/route.ts`, add provider fields:

```ts
authType: true,
rateLimitPerMinute: true,
lastSuccessfulSyncAt: true,
lastFailedSyncAt: true,
failureCount: true,
complianceNotes: true,
```

Recent logs automatically include the new fields if no restrictive `select` is used. If a `select` is added, include:

```ts
itemsSkipped: true,
itemsExpired: true,
durationMs: true,
details: true,
```

- [ ] **Step 3: Update cron summary**

In `src/app/api/cron/sync/route.ts`, add:

```ts
totalItemsUpdated: results.reduce((sum, r) => sum + (r.result?.itemsUpdated ?? 0), 0),
totalItemsSkipped: results.reduce((sum, r) => sum + (r.result?.itemsSkipped ?? 0), 0),
totalItemsExpired: results.reduce((sum, r) => sum + (r.result?.itemsExpired ?? 0), 0),
```

- [ ] **Step 4: Update admin sync page types**

In `src/app/admin/sync/page.tsx`, extend `ProviderStatus`:

```ts
authType: string;
rateLimitPerMinute: number | null;
lastSuccessfulSyncAt: string | null;
lastFailedSyncAt: string | null;
failureCount: number;
complianceNotes: string | null;
```

Extend `SyncLogEntry`:

```ts
itemsSkipped: number;
itemsExpired: number;
durationMs: number | null;
details: unknown;
```

- [ ] **Step 5: Render provider health metrics**

In the provider card detail block, add rows:

```tsx
<div className="flex justify-between">
  <span>Auth</span>
  <span className="font-medium text-foreground">{p.authType}</span>
</div>
<div className="flex justify-between">
  <span>Rate limit</span>
  <span className="font-medium text-foreground">{p.rateLimitPerMinute ? `${p.rateLimitPerMinute}/min` : "Default"}</span>
</div>
<div className="flex justify-between">
  <span>Failures</span>
  <span className="font-medium text-foreground">{p.failureCount}</span>
</div>
```

- [ ] **Step 6: Render log skipped/expired/duration**

Add table headers:

```tsx
<th className="text-left px-4 py-2 font-medium">Skipped</th>
<th className="text-left px-4 py-2 font-medium">Expired</th>
<th className="text-left px-4 py-2 font-medium">Duration</th>
```

Add row cells:

```tsx
<td className="px-4 py-2">{log.itemsSkipped}</td>
<td className="px-4 py-2">{log.itemsExpired}</td>
<td className="px-4 py-2">{log.durationMs ? `${Math.round(log.durationMs / 100) / 10}s` : "-"}</td>
```

- [ ] **Step 7: Run admin sync test**

Run:

```bash
npx vitest run src/__tests__/api/admin-sync.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit admin observability**

```bash
git add src/app/api/admin/sync/route.ts src/app/api/cron/sync/route.ts src/app/admin/sync/page.tsx src/__tests__/api/admin-sync.test.ts
git commit -m "feat: expand sync observability"
```

---

### Task 8: User-Facing Active Listing Filters

**Files:**
- Modify: `src/app/jobs/page.tsx`
- Modify: `src/app/events/page.tsx`
- Modify: `src/app/courses/page.tsx`
- Modify: `src/app/deals/page.tsx`
- Modify: `src/app/search/page.tsx`
- Modify: `src/app/api/search/route.ts`
- Test: `src/__tests__/api/search.test.ts`

- [ ] **Step 1: Update search API tests for active filter**

In `src/__tests__/api/search.test.ts`, add assertion to the database query test:

```ts
expect(mockedPrisma.$queryRawUnsafe.mock.calls[0][0]).toContain('"status" = $');
expect(mockedPrisma.$queryRawUnsafe.mock.calls[1][0]).toContain('l."status" = $');
```

- [ ] **Step 2: Add status filter in `src/app/api/search/route.ts`**

After the initial `conditions` line, add active status as a parameter:

```ts
const conditions: string[] = [`"searchVector" @@ to_tsquery('english', $1)`];
const params: (string | number)[] = [tsquery];
let paramIdx = 2;

conditions.push(`"status" = $${paramIdx}`);
params.push("active");
paramIdx++;
```

In the listing SQL replacement chain, add:

```ts
.replace(/"status"/g, 'l."status"')
```

- [ ] **Step 3: Filter courses page**

In `src/app/courses/page.tsx`, ensure the base `where` includes:

```ts
const where: Record<string, unknown> = { type: "course" as const, status: "active" };
```

- [ ] **Step 4: Filter jobs page**

In `src/app/jobs/page.tsx`, ensure the base `where` includes:

```ts
const where: Record<string, unknown> = { type: "job" as const, status: "active" };
```

- [ ] **Step 5: Filter events page**

In `src/app/events/page.tsx`, ensure the base `where` includes:

```ts
const where: Record<string, unknown> = {
  type: "event" as const,
  status: "active",
  OR: [
    { endDate: null },
    { endDate: { gte: new Date() } },
  ],
};
```

When adding a query filter, combine it with `AND` instead of replacing `OR`:

```ts
if (query.trim()) {
  where.AND = [{
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ],
  }];
}
```

- [ ] **Step 6: Update deals page to read synced deal listings first**

In `src/app/deals/page.tsx`, add `ListingCard` import:

```ts
import { ListingCard } from "@/components/listing/ListingCard";
```

Fetch deal listings:

```ts
const [dealListings, legacyDeals] = await Promise.all([
  prisma.listing.findMany({
    where: {
      type: "deal",
      status: "active",
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
    },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
    include: {
      provider: { select: { name: true, slug: true, logo: true } },
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true, slug: true } } } },
    },
  }),
  prisma.deal.findMany({
    where: {
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
    },
    orderBy: { createdAt: "desc" },
  }),
]);
```

Render listing deals first:

```tsx
{dealListings.map((listing) => (
  <ListingCard key={listing.id} listing={listing} />
))}
{dealListings.length === 0 && legacyDeals.map((deal) => (
  <DealCard key={deal.id} deal={deal} />
))}
```

Update the count:

```tsx
{(dealListings.length || legacyDeals.length).toLocaleString()} active deals on courses, tools, and learning platforms. Updated regularly.
```

- [ ] **Step 7: Run search tests**

Run:

```bash
npx vitest run src/__tests__/api/search.test.ts
```

Expected: PASS after updating test mock expectations for the extra status parameter.

- [ ] **Step 8: Commit user-facing filters**

```bash
git add src/app/jobs/page.tsx src/app/events/page.tsx src/app/courses/page.tsx src/app/deals/page.tsx src/app/search/page.tsx src/app/api/search/route.ts src/__tests__/api/search.test.ts
git commit -m "feat: hide inactive synced listings"
```

---

### Task 9: Final Verification And Release Notes

**Files:**
- Modify if needed: `docs/superpowers/specs/2026-04-30-data-sync-aggregation-design.md`
- No source changes unless verification reveals a real issue.

- [ ] **Step 1: Run targeted provider tests**

Run:

```bash
npx vitest run src/__tests__/lib/providers/normalization.test.ts src/__tests__/lib/providers/sync.test.ts src/__tests__/lib/providers/remotive.test.ts src/__tests__/lib/providers/usajobs.test.ts src/__tests__/lib/providers/ticketmaster.test.ts src/__tests__/lib/providers/awin.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run targeted API tests**

Run:

```bash
npx vitest run src/__tests__/api/search.test.ts src/__tests__/api/admin-sync.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run full unit suite**

Run:

```bash
npm test
```

Expected: PASS. If unrelated pre-existing failures appear, record the failing test names and rerun the targeted tests to prove this feature is sound.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS or only pre-existing unrelated warnings.

- [ ] **Step 6: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Run a local sync smoke test**

With local database running and optional env vars configured, run:

```bash
npm run db:seed
npm run dev
```

In another terminal:

```bash
curl -s http://localhost:3002/api/cron/sync | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d); console.log({synced:j.synced, skipped:j.skipped, failed:j.failed, totalItemsFound:j.totalItemsFound})})"
```

Expected: Remotive syncs without credentials, providers missing credentials are skipped with clear reasons, and the response includes `totalItemsUpdated`, `totalItemsSkipped`, and `totalItemsExpired`.

- [ ] **Step 8: Check vertical pages manually**

Open:

```text
http://localhost:3002/courses
http://localhost:3002/jobs
http://localhost:3002/events
http://localhost:3002/deals
http://localhost:3002/admin/sync
```

Expected:

- Courses/jobs/events/deals load without runtime errors.
- Expired or hidden listings do not show.
- Admin sync page shows provider health and recent log counts.

- [ ] **Step 9: Final commit if verification fixes were needed**

Only run this if Step 1-8 required code fixes:

```bash
git add .
git commit -m "fix: stabilize data sync aggregation"
```

---

## Execution Notes

- Do not add scraping for LinkedIn, Indeed, Eventbrite pages, or coupon sites in this implementation.
- Do not make all provider credential env vars required globally; missing optional provider credentials should skip that provider only.
- Keep user-facing reads filtered to `status = "active"` so ingestion errors do not leak stale data.
- Keep `Deal` compatibility until synced deal listings are proven stable.
- Use targeted tests after each task, then full verification at the end.
