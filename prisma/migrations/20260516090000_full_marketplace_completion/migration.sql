-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "canPostJobs" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canPostEvents" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canPostDeals" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canSponsor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jobPostLimit" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "eventPostLimit" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "dealPostLimit" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sponsoredLimit" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "SponsoredListing" ADD COLUMN "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "Listing_organizationId_idx" ON "Listing"("organizationId");

-- CreateIndex
CREATE INDEX "SponsoredListing_organizationId_idx" ON "SponsoredListing"("organizationId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsoredListing" ADD CONSTRAINT "SponsoredListing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
