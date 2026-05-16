import { describe, expect, it } from "vitest";
import { getDefaultAccountPath, getPostLoginPath } from "@/lib/account-routing";

describe("account routing", () => {
  it("routes completed accounts to their account-specific workspace", () => {
    expect(getDefaultAccountPath("individual")).toBe("/workspace");
    expect(getDefaultAccountPath("organization")).toBe("/business");
    expect(getDefaultAccountPath("partner")).toBe("/deal-program");
  });

  it("routes incomplete non-admin accounts to onboarding first", () => {
    expect(getPostLoginPath({ accountType: "individual", onboardingCompletedAt: null })).toBe("/onboarding");
    expect(getPostLoginPath({ accountType: "organization", onboardingCompletedAt: null })).toBe("/onboarding");
    expect(getPostLoginPath({ accountType: "partner", onboardingCompletedAt: null })).toBe("/onboarding");
  });

  it("keeps admin users on the admin surface", () => {
    expect(getPostLoginPath({ role: "admin", accountType: "organization", onboardingCompletedAt: null })).toBe("/admin");
  });
});
