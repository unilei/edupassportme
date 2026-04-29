import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should load homepage with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/EDU Passport/);
  });

  test("should display header with nav links", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    await expect(header).toBeVisible();
    await expect(header.getByRole("link", { name: /EDU Passport/ })).toBeVisible();
  });

  test("should navigate to courses page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Courses|课程/ }).first().click();
    await expect(page).toHaveURL(/\/courses/);
  });

  test("should navigate to search page", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Search|搜索/);
  });

  test("should show sign in and sign up buttons for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Sign In|登录/ }).first()).toBeVisible();
  });

  test("should navigate to sign in page", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator("main").getByRole("heading", { level: 1 })).toContainText(/Welcome Back|欢迎回来/);
  });

  test("should navigate to sign up page", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.locator("main").getByRole("heading", { level: 1 })).toContainText(/Create Account|创建账户/);
  });

  test("should have footer with links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByRole("link", { name: "EDU Passport" })).toBeVisible();
  });
});
