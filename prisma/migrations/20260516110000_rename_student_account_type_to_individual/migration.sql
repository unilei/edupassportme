ALTER TYPE "AccountType" RENAME VALUE 'student' TO 'individual';
ALTER TABLE "AppUser" ALTER COLUMN "accountType" SET DEFAULT 'individual';
