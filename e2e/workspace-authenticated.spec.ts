import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { hash } from "bcryptjs";
import { Pool } from "pg";

const runDbE2E = process.env.RUN_DB_E2E === "1";
const describeDb = runDbE2E ? test.describe : test.describe.skip;
const pool = runDbE2E ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

const suffix = Date.now();
const email = `workspace-e2e-${suffix}@example.invalid`;
const password = "WorkspacePass123!";
const userId = `workspace-e2e-user-${suffix}`;
const profileId = `workspace-e2e-profile-${suffix}`;
const providerId = `workspace-e2e-provider-${suffix}`;
const providerSlug = `workspace-e2e-provider-${suffix}`;
const categoryId = `workspace-e2e-category-${suffix}`;
const categorySlug = `workspace-e2e-category-${suffix}`;
const listingId = `workspace-e2e-listing-${suffix}`;
const listingSlug = `workspace-e2e-listing-${suffix}`;

async function db(sql: string, params: unknown[] = []) {
  if (!pool) {
    throw new Error("RUN_DB_E2E=1 is required for database-backed workspace tests.");
  }
  return pool.query(sql, params);
}

function waitForSavedPatch(page: Page) {
  return page.waitForResponse((response) => (
    response.url().includes("/api/user/saved") &&
    response.request().method() === "PATCH"
  ));
}

describeDb("Authenticated opportunity workspace", () => {
  test.beforeAll(async () => {
    const passwordHash = await hash(password, 12);

    await db(
      `INSERT INTO "Provider" ("id", "name", "slug", "url", "apiType", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [providerId, "Workspace E2E Provider", providerSlug, "https://example.com", "manual"],
    );

    await db(
      `INSERT INTO "Category" ("id", "name", "slug", "groupName", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [categoryId, "Workspace E2E Category", categorySlug, "Testing"],
    );

    await db(
      `INSERT INTO "AppUser" ("id", "email", "passwordHash", "name", "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [userId, email, passwordHash, "Workspace E2E User", true],
    );

    await db(
      `INSERT INTO "UserProfile" (
         "id", "userId", "interests", "goals", "targetRegions", "preferredTypes", "skills", "createdAt", "updatedAt"
       )
       VALUES ($1, $2, $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], NOW(), NOW())`,
      [profileId, userId, [], [], [], [], []],
    );

    await db(
      `INSERT INTO "Listing" (
         "id", "title", "slug", "type", "description", "url", "priceLabel", "level", "location",
         "providerId", "categoryId", "externalId", "status", "createdAt", "updatedAt"
       )
       VALUES ($1, $2, $3, $4::"ListingType", $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
      [
        listingId,
        "Workspace E2E Data Internship Prep",
        listingSlug,
        "course",
        "Build internship-ready skills for students in the United States.",
        "https://example.com/workspace-e2e",
        "Free",
        "Beginner",
        "United States",
        providerId,
        categoryId,
        listingSlug,
        "active",
      ],
    );
  });

  test.afterAll(async () => {
    await db(`DELETE FROM "Notification" WHERE "userId" = $1`, [userId]);
    await db(`DELETE FROM "Application" WHERE "userId" = $1`, [userId]);
    await db(`DELETE FROM "SavedListing" WHERE "userId" = $1`, [userId]);
    await db(`DELETE FROM "SavedSearch" WHERE "userId" = $1`, [userId]);
    await db(`DELETE FROM "UserProfile" WHERE "userId" = $1`, [userId]);
    await db(`DELETE FROM "AppUser" WHERE "id" = $1`, [userId]);
    await db(`DELETE FROM "Listing" WHERE "id" = $1`, [listingId]);
    await db(`DELETE FROM "Category" WHERE "id" = $1`, [categoryId]);
    await db(`DELETE FROM "Provider" WHERE "id" = $1`, [providerId]);
    await pool?.end();
  });

  test("completes profile preferences, saves an opportunity, and tracks it in workspace", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator("main").getByRole("button", { name: /Sign In|登录/ }).click();
    await expect(page).toHaveURL(/\/profile|\/$/);

    await page.goto("/profile");
    await page.getByRole("button", { name: "Undergraduate" }).click();
    await page.getByRole("button", { name: "Data Science" }).click();
    await page.getByRole("button", { name: "Internship-ready skills" }).click();
    await page.getByRole("button", { name: "United States" }).click();
    await page.getByRole("button", { name: "Courses" }).click();
    await page.getByRole("button", { name: "Save and Open Workspace" }).click();
    await expect(page).toHaveURL(/\/workspace/);

    await page.goto(`/listing/${listingSlug}`);
    const savedResponse = page.waitForResponse((response) => (
      response.url().includes("/api/user/saved") &&
      response.request().method() === "POST"
    ));
    await page.getByRole("button", { name: "Save opportunity" }).click();
    await expect((await savedResponse).ok()).toBe(true);

    await page.goto("/workspace");
    await expect(page.getByRole("heading", { name: "Keep every next step moving." })).toBeVisible();
    await expect(page.getByText("Workspace E2E Data Internship Prep").first()).toBeVisible();

    const statusPatch = waitForSavedPatch(page);
    await page.getByLabel("Status for Workspace E2E Data Internship Prep").selectOption("researching");
    await expect((await statusPatch).ok()).toBe(true);
    const priorityPatch = waitForSavedPatch(page);
    await page.getByLabel("Priority for Workspace E2E Data Internship Prep").selectOption("high");
    await expect((await priorityPatch).ok()).toBe(true);
    const notePatch = waitForSavedPatch(page);
    await page.getByPlaceholder("Add a next step or reminder context").fill("Review scholarship requirements");
    await page.getByPlaceholder("Add a next step or reminder context").blur();
    await expect((await notePatch).ok()).toBe(true);

    await page.reload();
    await expect(page.getByLabel("Status for Workspace E2E Data Internship Prep")).toHaveValue("researching");
    await expect(page.getByLabel("Priority for Workspace E2E Data Internship Prep")).toHaveValue("high");
    await expect(page.getByPlaceholder("Add a next step or reminder context")).toHaveValue("Review scholarship requirements");
  });
});
