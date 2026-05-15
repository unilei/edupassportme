import { expect, type Page, test } from "@playwright/test";

const userOnlyPages = [
  { path: "/feed", label: "activity feed" },
  { path: "/learning", label: "learning" },
  { path: "/badges", label: "badges" },
  { path: "/profile", label: "profile" },
  { path: "/saved", label: "saved listings" },
  { path: "/workspace", label: "opportunity workspace" },
  { path: "/for-you", label: "recommendations" },
  { path: "/applications", label: "applications" },
];

async function expectSignedOutProtection(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle").catch(() => {});

  const currentUrl = new URL(page.url());
  if (currentUrl.pathname === "/auth/signin") {
    expect(currentUrl.searchParams.get("callbackUrl")).toBe(path);
    await expect(page.locator("main").getByRole("heading", { name: /Welcome Back|Sign In|登录/i })).toBeVisible();
    return;
  }

  const main = page.locator("main");
  await expect(
    main
      .getByText(/please sign in|sign in to|log in to|login to/i)
      .or(main.getByRole("link", { name: /^Sign In$|^Sign in$|登录/ }))
      .or(main.getByRole("button", { name: /^Sign In$|^Sign in$|登录/ }))
      .first(),
  ).toBeVisible({ timeout: 10_000 });
}

test.describe("User system signed-out behavior", () => {
  for (const userOnlyPage of userOnlyPages) {
    test(`should protect ${userOnlyPage.label} for signed-out users`, async ({ page }) => {
      await expectSignedOutProtection(page, userOnlyPage.path);
    });
  }
});
