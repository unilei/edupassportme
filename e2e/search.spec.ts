import { test, expect } from "@playwright/test";

test.describe("Search", () => {
  test("should show search input on search page", async ({ page }) => {
    await page.goto("/search");
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();
  });

  test("should show empty state when no query", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByText(/Enter a search term|输入关键词/)).toBeVisible();
  });

  test("should display results when searching", async ({ page }) => {
    await page.goto("/search?q=machine");
    await expect(page.getByText("Machine Learning Specialization")).toBeVisible({ timeout: 10_000 });
  });

  test("should show search input on homepage", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator('input[type="search"]').first();
    await expect(searchInput).toBeVisible();
  });

  test("should navigate to search results when submitting search form", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill("python");
    await searchInput.press("Enter");
    await expect(page).toHaveURL(/\/courses\?q=python/);
  });
});
