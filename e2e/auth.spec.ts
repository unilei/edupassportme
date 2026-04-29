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

  test("should show error for invalid sign in credentials", async ({ page }, testInfo) => {
    const unknownEmail = `invalid-login-${testInfo.workerIndex}-${Date.now()}@example.invalid`;

    await page.goto("/auth/signin");
    await page.locator('input[type="email"]').fill(unknownEmail);
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.locator("main").getByRole("button", { name: /Sign In|登录/ }).click();
    // Wait for error message to appear
    await expect(page.locator("main").getByText("Invalid email or password")).toBeVisible({ timeout: 10_000 });
  });

  test("should show billing sign in prompt for unauthenticated users", async ({ page }) => {
    await page.goto("/billing");
    await expect(page.getByText("Please sign in to manage your billing.")).toBeVisible();
  });

  test("should link between sign in and sign up pages", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByRole("link", { name: /Sign Up|注册/ }).click();
    await expect(page).toHaveURL(/\/auth\/signup/);

    await page.getByRole("link", { name: /Sign In|登录/ }).click();
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
