export const ACCOUNT_TYPES = ["student", "organization", "partner"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === "string" && (ACCOUNT_TYPES as readonly string[]).includes(value);
}

export function normalizeAccountType(value: unknown): AccountType {
  return isAccountType(value) ? value : "student";
}

export function getSessionAccountType(user: unknown): AccountType {
  if (!user || typeof user !== "object") return "student";
  return normalizeAccountType((user as Record<string, unknown>).accountType);
}

export function canUseBusinessWorkspace(accountType: AccountType) {
  return accountType === "organization" || accountType === "partner";
}

export function canSubmitOpportunities(accountType: AccountType) {
  return accountType === "organization";
}

export function canUseDealProgram(accountType: AccountType) {
  return accountType === "partner";
}
