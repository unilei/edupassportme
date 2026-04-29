/*
  Warnings:

  - Added the required column `passwordHash` to the `AppUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AppUser" ADD COLUMN     "passwordHash" TEXT NOT NULL;
