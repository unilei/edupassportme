# EDU Passport Data Sync Aggregation Design

Date: 2026-04-30
Owner: EDU Passport
Status: Design draft

## Goal

Enrich the `jobs`, `courses`, `events`, and `deals` verticals with real external data from reputable platforms. The product should feel like an education-focused meta-search aggregator: users can discover fresh listings, compare providers, save items, click out to the source, and trust that stale jobs, expired events, and invalid deals are removed automatically.

This is not a one-time seed-data task. It is a reusable data ingestion platform built on the existing `Provider`, `Listing`, `ListingOffer`, and `SyncLog` models.

## Definition of "Real-Time"

Most target platforms do not provide public webhooks for broad marketplace discovery. For this product, "real-time sync" means near real-time freshness with explicit SLAs:

- Jobs: every 1-4 hours for active providers.
- Deals: every 1-4 hours, with stricter expiry cleanup.
- Events: every 6-12 hours, plus immediate removal after end date.
- Courses: daily sync, because catalogs change less frequently.

If a provider supports webhooks or data feeds, we can add push-based ingestion later. The first version should use reliable incremental polling.

## Current Repo Context

The project already has a provider framework:

- `prisma/schema.prisma` defines `Provider`, `Listing`, `ListingOffer`, `SyncLog`, and `ListingType`.
- `src/lib/providers/base.ts` defines a base provider contract.
- `src/lib/providers/sync.ts` upserts provider results into `Listing`.
- `src/lib/providers/registry.ts` maps DB providers to provider implementations.
- `src/app/api/cron/sync/route.ts` runs scheduled provider sync.
- `src/app/api/admin/sync/route.ts` and `src/app/admin/sync/page.tsx` expose basic manual sync monitoring.

Main gaps:

- Only courses have meaningful provider implementations today.
- Jobs, events, and deals are mostly sample/manual data.
- Sync results currently count every successful upsert as added, even when it updates an existing listing.
- There is no cursor, `lastSeenAt`, stale cleanup, provider-level lock, retry budget, or quality score.
- Deals are split between `ListingType.deal` and a separate `Deal` model, which weakens search, saves, click tracking, and recommendation reuse.
- Compliance requirements are not captured per provider.

## Recommended Source Strategy

Use official APIs, approved affiliate APIs, official feeds, and public RSS before considering scraping. Avoid scraping LinkedIn, Indeed, Coursera pages, Eventbrite pages, or coupon sites unless there is a written permission path.

### Courses

MVP sources:

- Udemy Affiliate API: official developer docs say the Affiliate API is open to all.
- edX Course Catalog API: useful for informational catalog data, but the official docs note it should not be used for affiliate marketing; affiliate monetization should go through edX's affiliate program.
- Coursera: keep the existing provider, but treat it as best-effort unless we confirm a current official partner API path.

Phase 2:

- Awin/Rakuten affiliate offers for education merchants.
- Open course feeds from universities, MOOCs, or educational RSS sources.

### Jobs

MVP sources:

- Adzuna Jobs API: official REST API for job ads and employment data.
- USAJOBS API: official U.S. government job API, useful for education, training, research, and public-sector roles.
- Remotive API/RSS: useful for remote education and EdTech jobs, but must show Remotive attribution and link back to the source URL.

Phase 2:

- Greenhouse and Lever company boards for selected EdTech companies.
- Direct employer ATS feeds for EDU Passport partners.

Avoid as default:

- LinkedIn Jobs and Indeed scraping. They are high-value sources, but should be treated as partnership/API-only sources.

### Events

MVP sources:

- Ticketmaster Discovery API: official event search API with broad coverage and clear rate limits.
- Eventbrite API: can work for public events, but terms require direct links and storage restrictions for past events.
- Curated RSS feeds for education conferences, webinars, university events, and EdTech communities.

Phase 2:

- Meetup GraphQL API if EDU Passport has a valid Pro/OAuth access path.
- Partner event feeds from schools, bootcamps, communities, and event organizers.

### Deals

MVP sources:

- Awin Offers API: publisher API for promotions and voucher codes.
- Rakuten Advertising Coupon Feed API: validated coupons and promotional link data.
- Manual editorial deals for strategic education tools where APIs are not available.

Phase 2:

- CJ, Impact, and other affiliate networks once publisher accounts and merchant approvals are ready.
- Merchant-specific feeds for Coursera, edX, Udemy, Grammarly, Notion, Canva, DataCamp, Brilliant, etc.

## Architecture

### 1. Provider Connector Layer

Each external source gets one connector under `src/lib/providers`. A connector owns:

- Authentication and environment variables.
- API pagination and rate limits.
- Retry rules for 429 and transient 5xx errors.
- Raw response validation.
- Mapping into the internal normalized shape.
- Provider-specific compliance metadata.

Example connector names:

- `AdzunaProvider`
- `UsaJobsProvider`
- `RemotiveProvider`
- `TicketmasterProvider`
- `AwinOffersProvider`
- `RakutenCouponsProvider`
- `EdxProvider`

### 2. Normalization Layer

All connectors output a shared normalized type. `RawListing` should be extended to support:

- `sourceUpdatedAt`
- `publishedAt`
- `lastSeenAt`
- `status`
- `companyName`
- `salaryMin`
- `salaryMax`
- `salaryCurrency`
- `couponCode`
- `discountText`
- `venueName`
- `country`
- `region`
- `metadata`
- `compliance`

The normalization layer should also standardize:

- Date parsing and timezone handling.
- Price and salary formatting.
- Location fields.
- Language codes.
- Category and tag inference.
- Affiliate URL construction.
- Canonical URLs.

### 3. Sync Orchestrator

The current cron endpoint can remain, but provider execution should be upgraded:

- Run providers independently instead of one large all-or-nothing batch.
- Use provider-level locks to prevent overlapping syncs.
- Store cursors or `updatedSince` values where providers support incremental sync.
- Track `itemsFound`, `itemsAdded`, `itemsUpdated`, `itemsSkipped`, `itemsExpired`, and `errors`.
- Enforce per-provider limits so a broken source cannot exhaust runtime.
- Mark missing listings as stale only after a grace period, not after one failed sync.
- Auto-expire by `expiresAt` or event `endDate`.

The MVP can keep the Next.js cron route. If volume grows, move orchestration to a job runner such as Inngest, Trigger.dev, pg-boss, BullMQ, or a small worker service.

### 4. Deduplication

Use two levels of dedupe:

- Source-level: `providerId + externalId`.
- Cross-source: a computed fingerprint from normalized title, canonical URL, company/provider, location, start date, and type.

For courses, cross-source duplicates should merge into one canonical `Listing` with multiple `ListingOffer` rows. For jobs/events/deals, duplicate merging should be conservative because the same title can represent different openings, sessions, or coupon campaigns.

### 5. Quality And Ranking

Every ingested listing should receive a quality score. The score should prefer:

- Complete title, description, URL, provider, category, and image.
- Fresh posting or updated date.
- Valid future date for jobs/events/deals.
- Recognized provider and valid source attribution.
- Strong user value: free, discount, certificate, remote, salary present, rating present, beginner-friendly, or relevant education tags.

Low-quality listings should be hidden by default or routed to moderation.

### 6. Compliance Rules

Provider-specific rules must be stored and enforced in code:

- Required attribution text.
- Required source link behavior.
- Past-event storage limits.
- Whether affiliate links are allowed.
- Whether cached descriptions/images are allowed.
- Required logo/branding restrictions.
- Data retention requirements.

This prevents us from treating all APIs as if they had the same rights.

## Data Model Changes

Add or migrate fields on `Listing`:

- `status`: `active | stale | expired | hidden | needs_review`
- `lastSeenAt`: last time provider returned this listing.
- `sourceUpdatedAt`: provider-side updated timestamp.
- `publishedAt`: provider-side published/posting timestamp.
- `canonicalUrl`: normalized source URL without tracking noise.
- `fingerprint`: cross-source dedupe key.
- `qualityScore`: numeric ranking signal.
- `metadata`: JSON for source-specific fields.
- `compliance`: JSON or provider-level config reference.

Add provider fields:

- `authType`
- `rateLimitPerMinute`
- `syncCursor`
- `lastSuccessfulSyncAt`
- `lastFailedSyncAt`
- `failureCount`
- `complianceNotes`

Deals recommendation:

- New synced deals should be represented as `Listing` rows with `type = "deal"`.
- Keep the existing `Deal` model only for backward compatibility or migrate it into `Listing`.

Sync logs:

- Add `itemsSkipped`, `itemsExpired`, `durationMs`, and structured error details.

## Frontend Behavior

The existing vertical pages should continue reading from `Listing`, with filters expanded by vertical:

- Jobs: location, remote, salary, employer, freshness.
- Courses: provider, price, level, duration, certificate, rating.
- Events: date range, online/offline, city, price, organizer.
- Deals: active/expiring soon, provider, discount, code/no-code.

Listing cards should show:

- Provider/source attribution.
- Last updated or freshness label.
- Expiry/end date when relevant.
- Direct source link or affiliate link through the existing click tracking endpoint.

## Admin Requirements

Extend the Sync Dashboard to show:

- Provider status and credentials health.
- Last successful sync and last failure.
- New, updated, skipped, expired counts.
- Current cursor or updated-since marker.
- Provider-specific error messages.
- Manual sync by provider and by listing type.
- Toggle provider active/inactive.
- Moderation queue for low-quality or suspicious listings.

## Rollout Plan

### Phase 1: Foundation

- Add schema fields and migration.
- Extend `RawListing` and sync result types.
- Fix add/update counting.
- Add stale cleanup and provider-level locking.
- Add test coverage for upsert, update, expire, and error logging.

### Phase 2: MVP Providers

- Courses: Udemy, edX, existing Coursera cleanup.
- Jobs: Adzuna, USAJOBS, Remotive.
- Events: Ticketmaster, Eventbrite after API key and compliance confirmation, plus curated education RSS feeds.
- Deals: Awin or Rakuten, plus manual editorial deals.

### Phase 3: Admin And QA

- Expand sync dashboard.
- Add provider health checks.
- Add moderation status and quality score.
- Add source-specific compliance display.

### Phase 4: Growth Sources

- Greenhouse/Lever EdTech employers.
- Meetup if API access is approved.
- CJ/Impact/Rakuten/Awin merchant expansion.
- Partner feeds from bootcamps, schools, and education communities.

## Acceptance Criteria

- Each vertical has at least one real synced provider in production-like configuration.
- Sync can be run from cron and admin UI.
- Existing listings update rather than duplicate.
- Expired jobs/events/deals are removed or hidden automatically.
- Provider failures are isolated and visible in sync logs.
- Every external listing has source attribution and a valid outbound link.
- User-facing pages show fresh counts and filter correctly.
- Tests cover normalized ingestion, duplicate handling, update handling, expiry cleanup, and sync log outcomes.

## Open Decisions

- Which affiliate networks EDU Passport already has accounts for.
- Whether deals should be migrated fully from `Deal` to `Listing`.
- Whether we prioritize U.S.-only sources first or global English-language sources.
- Whether the first release should include admin moderation before publishing synced items, or publish active high-quality items directly.
- Whether sync workers will stay inside Next.js cron for MVP or move to a dedicated background job runner immediately.

## External References Checked

- Udemy Developers: https://www.udemy.com/developers/
- edX Course Catalog API guide: https://course-catalog-api-guide.readthedocs.io/
- Adzuna API overview: https://developer.adzuna.com/overview
- Remotive public API terms: https://remotive.com/remote-jobs/api
- USAJOBS API reference: https://developer.usajobs.gov/api-reference/
- Ticketmaster Discovery API: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
- Eventbrite API terms: https://www.eventbrite.com/help/en-us/articles/833731/eventbrite-api-terms-of-use/
- Meetup API access notes: https://help.meetup.com/hc/en-us/articles/41453576628749
- Rakuten Advertising Coupon Feed API: https://pubhelp.rakutenadvertising.com/hc/en-us/articles/5949828511757-Coupon-Feed-API
- Awin Retrieve Offers API: https://help.awin.com/apidocs/promotions
