import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.describe.configure({ mode: "serial" });

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

  test("should show check-email success state after registration without using a real mailbox", async ({ page }, testInfo) => {
    const uniqueEmail = `signup-success-${testInfo.workerIndex}-${Date.now()}@example.invalid`;
    let registerRequestBody: Record<string, string> | undefined;
    let signInAttempted = false;

    await page.route("**/api/auth/register", async (route) => {
      const request = route.request();
      registerRequestBody = JSON.parse(request.postData() || "{}") as Record<string, string>;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: `e2e-${Date.now()}`,
            email: uniqueEmail,
            name: "E2E Signup User",
          },
          message: "Verification email sent",
        }),
      });
    });

    await page.route("**/api/auth/callback/**", async (route) => {
      signInAttempted = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "/profile" }),
      });
    });

    await page.goto("/auth/signup");
    await page.locator('input[name="name"]').fill("E2E Signup User");
    await page.locator('input[type="email"]').fill(uniqueEmail);
    await page.locator('input[type="password"]').fill("ValidPass123!");
    await page.locator("main").getByRole("button", { name: /Create Account|注册/ }).click();

    const successMessage = page.locator("main").getByText(/check.*email|verify.*email|verification email sent/i).first();
    await expect
      .poll(
        async () => {
          if (signInAttempted) return "sign-in attempted";
          return (await successMessage.isVisible()) ? "success" : "pending";
        },
        { timeout: 10_000 },
      )
      .toBe("success");
    expect(registerRequestBody).toMatchObject({
      email: uniqueEmail,
      password: "ValidPass123!",
      name: "E2E Signup User",
    });
    expect(signInAttempted).toBe(false);
    await expect(page).not.toHaveURL(/\/profile/);
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
