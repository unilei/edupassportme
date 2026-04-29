import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show sign in form with email and password fields", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should show sign up form with name, email, and password fields", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should show forgot password link on sign in page", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.getByRole("link", { name: /Forgot password|忘记密码/ })).toBeVisible();
  });

  test("should navigate to forgot password page", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByRole("link", { name: /Forgot password|忘记密码/ }).click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
  });

  test("should show error for invalid sign in credentials", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.locator('input[type="email"]').fill("nonexistent@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /Sign In|登录/ }).click();
    // Wait for error message to appear
    await expect(page.locator('[class*="text-red"], [class*="text-destructive"]')).toBeVisible({ timeout: 10_000 });
  });

  test("should link between sign in and sign up pages", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByRole("link", { name: /Sign Up|注册/ }).click();
    await expect(page).toHaveURL(/\/auth\/signup/);

    await page.getByRole("link", { name: /Sign In|登录/ }).click();
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
