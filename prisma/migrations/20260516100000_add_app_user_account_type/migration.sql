CREATE TYPE "AccountType" AS ENUM ('student', 'organization', 'partner');

ALTER TABLE "AppUser"
  ADD COLUMN "accountType" "AccountType" NOT NULL DEFAULT 'student';

UPDATE "AppUser"
SET "accountType" = 'partner'
WHERE id IN (
  SELECT "ownerId"
  FROM "Organization"
  WHERE "type" = 'partner'
)
OR id IN (
  SELECT "submittedById"
  FROM "DealProgramApplication"
);

UPDATE "AppUser"
SET "accountType" = 'organization'
WHERE "accountType" = 'student'
AND id IN (
  SELECT "ownerId"
  FROM "Organization"
);
