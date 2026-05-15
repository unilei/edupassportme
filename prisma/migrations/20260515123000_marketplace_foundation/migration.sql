-- CreateEnum
CREATE TYPE "ApplicationStatus_new" AS ENUM ('draft', 'applied', 'under_review', 'shortlisted', 'screening', 'interview_scheduled', 'interviewing', 'decision_pending', 'offer_extended', 'offer_accepted', 'hired', 'rejected', 'offer_declined', 'withdrawn', 'position_closed');

-- AlterEnum
ALTER TABLE "Application" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Application" ALTER COLUMN "status" TYPE "ApplicationStatus_new" USING (
  CASE "status"::text
    WHEN 'viewed' THEN 'under_review'
    WHEN 'interview' THEN 'interview_scheduled'
    WHEN 'offered' THEN 'offer_extended'
    WHEN 'draft' THEN 'draft'
    WHEN 'applied' THEN 'applied'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'withdrawn' THEN 'withdrawn'
    ELSE 'under_review'
  END
)::"ApplicationStatus_new";
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";
DROP TYPE "ApplicationStatus_old";
ALTER TABLE "Application" ALTER COLUMN "status" SET DEFAULT 'applied';

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('school', 'recruiter', 'vendor', 'partner', 'employer', 'other');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('pending', 'active', 'suspended', 'rejected');

-- CreateEnum
CREATE TYPE "ListingSubmissionStatus" AS ENUM ('pending_review', 'needs_changes', 'approved', 'rejected', 'published', 'archived');

-- CreateEnum
CREATE TYPE "DealProgramStatus" AS ENUM ('pending', 'approved', 'rejected', 'invited', 'active', 'suspended');

-- AlterTable
ALTER TABLE "Application"
ADD COLUMN     "interviewAt" TIMESTAMP(3),
ADD COLUMN     "interviewTimezone" TEXT,
ADD COLUMN     "meetingUrl" TEXT,
ADD COLUMN     "employerNote" TEXT,
ADD COLUMN     "candidateNote" TEXT,
ADD COLUMN     "offerLetterUrl" TEXT,
ADD COLUMN     "contractUrl" TEXT,
ADD COLUMN     "withdrawnAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL DEFAULT 'other',
    "website" TEXT,
    "description" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingSubmission" (
    "id" TEXT NOT NULL,
    "type" "ListingType" NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "image" TEXT,
    "companyName" TEXT,
    "location" TEXT,
    "country" TEXT,
    "region" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "priceLabel" TEXT,
    "couponCode" TEXT,
    "metadata" JSONB,
    "status" "ListingSubmissionStatus" NOT NULL DEFAULT 'pending_review',
    "reviewNote" TEXT,
    "submittedById" TEXT NOT NULL,
    "organizationId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedListingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealProgramApplication" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "proposedOffer" TEXT NOT NULL,
    "targetAudience" TEXT,
    "status" "DealProgramStatus" NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "invitationToken" TEXT,
    "invitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealProgramApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_ownerId_idx" ON "Organization"("ownerId");

-- CreateIndex
CREATE INDEX "Organization_type_status_idx" ON "Organization"("type", "status");

-- CreateIndex
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListingSubmission_publishedListingId_key" ON "ListingSubmission"("publishedListingId");

-- CreateIndex
CREATE INDEX "ListingSubmission_submittedById_idx" ON "ListingSubmission"("submittedById");

-- CreateIndex
CREATE INDEX "ListingSubmission_organizationId_idx" ON "ListingSubmission"("organizationId");

-- CreateIndex
CREATE INDEX "ListingSubmission_type_status_idx" ON "ListingSubmission"("type", "status");

-- CreateIndex
CREATE INDEX "ListingSubmission_createdAt_idx" ON "ListingSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "DealProgramApplication_organizationId_idx" ON "DealProgramApplication"("organizationId");

-- CreateIndex
CREATE INDEX "DealProgramApplication_submittedById_idx" ON "DealProgramApplication"("submittedById");

-- CreateIndex
CREATE INDEX "DealProgramApplication_status_idx" ON "DealProgramApplication"("status");

-- CreateIndex
CREATE INDEX "DealProgramApplication_createdAt_idx" ON "DealProgramApplication"("createdAt");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingSubmission" ADD CONSTRAINT "ListingSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingSubmission" ADD CONSTRAINT "ListingSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingSubmission" ADD CONSTRAINT "ListingSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingSubmission" ADD CONSTRAINT "ListingSubmission_publishedListingId_fkey" FOREIGN KEY ("publishedListingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealProgramApplication" ADD CONSTRAINT "DealProgramApplication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealProgramApplication" ADD CONSTRAINT "DealProgramApplication_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealProgramApplication" ADD CONSTRAINT "DealProgramApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
