-- Add profile preferences used by the Student Opportunity Workspace onboarding flow.
ALTER TABLE "UserProfile"
ADD COLUMN "goals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "targetRegions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "preferredTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Add tracking fields so each saved listing can become an actionable opportunity.
ALTER TABLE "SavedListing"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'saved',
ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN "deadlineAt" TIMESTAMP(3),
ADD COLUMN "nextActionAt" TIMESTAMP(3);

CREATE INDEX "SavedListing_userId_status_idx" ON "SavedListing"("userId", "status");
CREATE INDEX "SavedListing_deadlineAt_idx" ON "SavedListing"("deadlineAt");
CREATE INDEX "SavedListing_nextActionAt_idx" ON "SavedListing"("nextActionAt");
