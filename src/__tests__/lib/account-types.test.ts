import { describe, expect, it } from "vitest";
import {
  getSessionOnboardingCompletedAt,
  hasCompletedOnboarding,
  normalizeAccountType,
} from "@/lib/account-types";

describe("account types", () => {
  it("normalizes legacy student accounts as individual accounts", () => {
    expect(normalizeAccountType("student")).toBe("individual");
  });

  it("reads onboarding completion from direct session fields", () => {
    expect(getSessionOnboardingCompletedAt({
      onboardingCompletedAt: "2026-05-16T00:00:00.000Z",
    })).toBe("2026-05-16T00:00:00.000Z");
  });

  it("reads onboarding completion from nested profile fields", () => {
    const completedAt = new Date("2026-05-16T00:00:00.000Z");

    expect(getSessionOnboardingCompletedAt({
      profile: { onboardingCompletedAt: completedAt },
    })).toBe("2026-05-16T00:00:00.000Z");
    expect(hasCompletedOnboarding({ profile: { onboardingCompletedAt: completedAt } })).toBe(true);
  });

  it("treats missing onboarding completion as incomplete", () => {
    expect(getSessionOnboardingCompletedAt({ profile: { onboardingCompletedAt: null } })).toBeNull();
    expect(hasCompletedOnboarding({ profile: { onboardingCompletedAt: null } })).toBe(false);
  });
});
