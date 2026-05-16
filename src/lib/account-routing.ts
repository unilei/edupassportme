import type { AccountType } from "@/lib/account-types";
import { normalizeAccountType } from "@/lib/account-types";

type PostLoginInput = {
  role?: string | null;
  accountType?: AccountType | "student" | null;
  onboardingCompletedAt?: string | Date | null;
};

export function getDefaultAccountPath(accountType: AccountType | "student" | null | undefined) {
  const normalized = normalizeAccountType(accountType);

  if (normalized === "organization") return "/business";
  if (normalized === "partner") return "/deal-program";
  return "/workspace";
}

export function getPostLoginPath(input: PostLoginInput) {
  if (input.role === "admin") return "/admin";
  if (!input.onboardingCompletedAt) return "/onboarding";
  return getDefaultAccountPath(input.accountType);
}
