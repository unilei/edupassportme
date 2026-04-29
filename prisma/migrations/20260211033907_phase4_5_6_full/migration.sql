-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('draft', 'applied', 'viewed', 'interview', 'offered', 'rejected', 'withdrawn');

-- AlterTable
ALTER TABLE "AppUser" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "proExpiresAt" TIMESTAMP(3),
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'free';

-- AlterTable
ALTER TABLE "ClickEvent" ADD COLUMN     "affiliateTag" TEXT,
ADD COLUMN     "commission" DOUBLE PRECISION,
ADD COLUMN     "offerId" TEXT;

-- AlterTable
ALTER TABLE "ListingOffer" ADD COLUMN     "affiliateUrl" TEXT;

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "affiliateTag" TEXT,
ADD COLUMN     "commissionRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "experience" JSONB,
ADD COLUMN     "headline" TEXT,
ADD COLUMN     "notifyNewMatch" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNewsletter" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyPriceDrop" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "resumeUrl" TEXT,
ADD COLUMN     "skills" TEXT[];

-- CreateTable
CREATE TABLE "SponsoredListing" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Sponsored',
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsoredListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'applied',
    "coverNote" TEXT,
    "resumeUrl" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SponsoredListing_position_isActive_idx" ON "SponsoredListing"("position", "isActive");

-- CreateIndex
CREATE INDEX "SponsoredListing_startDate_idx" ON "SponsoredListing"("startDate");

-- CreateIndex
CREATE INDEX "SponsoredListing_endDate_idx" ON "SponsoredListing"("endDate");

-- CreateIndex
CREATE INDEX "Application_userId_idx" ON "Application"("userId");

-- CreateIndex
CREATE INDEX "Application_listingId_idx" ON "Application"("listingId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_listingId_key" ON "Application"("userId", "listingId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_userId_idx" ON "VerificationToken"("userId");

-- CreateIndex
CREATE INDEX "VerificationToken_token_idx" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "PriceHistory_listingId_idx" ON "PriceHistory"("listingId");

-- CreateIndex
CREATE INDEX "PriceHistory_recordedAt_idx" ON "PriceHistory"("recordedAt");

-- CreateIndex
CREATE INDEX "ClickEvent_affiliateTag_idx" ON "ClickEvent"("affiliateTag");

-- AddForeignKey
ALTER TABLE "SponsoredListing" ADD CONSTRAINT "SponsoredListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
