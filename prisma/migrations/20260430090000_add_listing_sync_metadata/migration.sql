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
