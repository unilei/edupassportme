export const ACCOUNT_TYPES = ["individual", "organization", "partner"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const INDIVIDUAL_PROFILE_TYPES = [
  "student",
  "learner",
  "parent",
  "educator",
  "job_seeker",
  "career_changer",
  "professional_learner",
] as const;

export type IndividualProfileType = (typeof INDIVIDUAL_PROFILE_TYPES)[number];

export const ORGANIZATION_PROFILE_TYPES = [
  "school",
  "university_program",
  "employer",
  "recruiter",
  "course_provider",
  "event_organizer",
  "education_provider",
] as const;

export type OrganizationProfileType = (typeof ORGANIZATION_PROFILE_TYPES)[number];

export const PARTNER_PROFILE_TYPES = [
  "deal_provider",
  "sponsor",
  "advertiser",
  "affiliate_partner",
  "scholarship_partner",
] as const;

export type PartnerProfileType = (typeof PARTNER_PROFILE_TYPES)[number];

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === "string" && (ACCOUNT_TYPES as readonly string[]).includes(value);
}

export function normalizeAccountType(value: unknown): AccountType {
  if (value === "student") return "individual";
  return isAccountType(value) ? value : "individual";
}

export function isPublicRegistrationAccountType(value: unknown): value is AccountType {
  return isAccountType(value);
}

export function getSessionAccountType(user: unknown): AccountType {
  if (!user || typeof user !== "object") return "individual";
  return normalizeAccountType((user as Record<string, unknown>).accountType);
}

export function canUseIndividualWorkspace(accountType: AccountType) {
  return accountType === "individual";
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
