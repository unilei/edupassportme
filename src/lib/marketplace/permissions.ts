export type MarketplaceOpportunityType = "course" | "job" | "event" | "deal";

export type MarketplacePlan = "free" | "business" | "partner" | "enterprise";

export type OrganizationPermissionSnapshot = {
  status?: string | null;
  plan?: string | null;
  canPostJobs?: boolean | null;
  canPostEvents?: boolean | null;
  canPostDeals?: boolean | null;
  canSponsor?: boolean | null;
  jobPostLimit?: number | null;
  eventPostLimit?: number | null;
  dealPostLimit?: number | null;
  sponsoredLimit?: number | null;
};

type ResolvedOrganizationPermissions = {
  status: string;
  plan: MarketplacePlan;
  canPostJobs: boolean;
  canPostEvents: boolean;
  canPostDeals: boolean;
  canSponsor: boolean;
  jobPostLimit: number;
  eventPostLimit: number;
  dealPostLimit: number;
  sponsoredLimit: number;
};

type PlanDefaults = Omit<ResolvedOrganizationPermissions, "status">;

const PLAN_DEFAULTS: Record<MarketplacePlan, PlanDefaults> = {
  free: {
    plan: "free",
    canPostJobs: true,
    canPostEvents: true,
    canPostDeals: false,
    canSponsor: false,
    jobPostLimit: 3,
    eventPostLimit: 3,
    dealPostLimit: 0,
    sponsoredLimit: 0,
  },
  business: {
    plan: "business",
    canPostJobs: true,
    canPostEvents: true,
    canPostDeals: false,
    canSponsor: true,
    jobPostLimit: 25,
    eventPostLimit: 25,
    dealPostLimit: 0,
    sponsoredLimit: 3,
  },
  partner: {
    plan: "partner",
    canPostJobs: true,
    canPostEvents: true,
    canPostDeals: true,
    canSponsor: true,
    jobPostLimit: 100,
    eventPostLimit: 100,
    dealPostLimit: 100,
    sponsoredLimit: 10,
  },
  enterprise: {
    plan: "enterprise",
    canPostJobs: true,
    canPostEvents: true,
    canPostDeals: true,
    canSponsor: true,
    jobPostLimit: 1000,
    eventPostLimit: 1000,
    dealPostLimit: 1000,
    sponsoredLimit: 100,
  },
};

export const MARKETPLACE_PLAN_NAMES = Object.keys(PLAN_DEFAULTS) as MarketplacePlan[];

function normalizePlan(plan: string | null | undefined): MarketplacePlan {
  return MARKETPLACE_PLAN_NAMES.includes(plan as MarketplacePlan)
    ? (plan as MarketplacePlan)
    : "free";
}

export function getMarketplacePlanDefaults(plan: string | null | undefined): PlanDefaults {
  return PLAN_DEFAULTS[normalizePlan(plan)];
}

export function mergeOrganizationPermissions(
  organization: OrganizationPermissionSnapshot,
): ResolvedOrganizationPermissions {
  const defaults = getMarketplacePlanDefaults(organization.plan);

  return {
    status: organization.status ?? "pending",
    plan: defaults.plan,
    canPostJobs: organization.canPostJobs ?? defaults.canPostJobs,
    canPostEvents: organization.canPostEvents ?? defaults.canPostEvents,
    canPostDeals: organization.canPostDeals ?? defaults.canPostDeals,
    canSponsor: organization.canSponsor ?? defaults.canSponsor,
    jobPostLimit: organization.jobPostLimit ?? defaults.jobPostLimit,
    eventPostLimit: organization.eventPostLimit ?? defaults.eventPostLimit,
    dealPostLimit: organization.dealPostLimit ?? defaults.dealPostLimit,
    sponsoredLimit: organization.sponsoredLimit ?? defaults.sponsoredLimit,
  };
}

export function getOrganizationTypePermission(
  organization: OrganizationPermissionSnapshot,
  type: MarketplaceOpportunityType,
): { allowed: true } | { allowed: false; reason: string } {
  const permissions = mergeOrganizationPermissions(organization);

  if (permissions.status === "suspended" || permissions.status === "rejected") {
    return {
      allowed: false,
      reason: "Organization is not active for marketplace publishing.",
    };
  }

  if (type === "course") return { allowed: true };
  if (type === "job" && permissions.canPostJobs) return { allowed: true };
  if (type === "event" && permissions.canPostEvents) return { allowed: true };
  if (type === "deal" && permissions.canPostDeals) return { allowed: true };

  if (type === "deal") {
    return {
      allowed: false,
      reason: "Deal submissions require an approved partner organization.",
    };
  }

  return {
    allowed: false,
    reason: `Organization is not allowed to publish ${type} opportunities.`,
  };
}

export function getSubmissionLimitForType(
  organization: OrganizationPermissionSnapshot,
  type: MarketplaceOpportunityType,
) {
  const permissions = mergeOrganizationPermissions(organization);
  if (type === "job") return permissions.jobPostLimit;
  if (type === "event") return permissions.eventPostLimit;
  if (type === "deal") return permissions.dealPostLimit;
  return Number.MAX_SAFE_INTEGER;
}

export function evaluateSubmissionQuota(
  organization: OrganizationPermissionSnapshot,
  type: MarketplaceOpportunityType,
  used: number,
): { allowed: true; limit: number; used: number } | { allowed: false; limit: number; used: number; reason: string } {
  const limit = getSubmissionLimitForType(organization, type);
  if (used < limit) return { allowed: true, limit, used };

  return {
    allowed: false,
    limit,
    used,
    reason: `Organization has reached its ${type} posting limit.`,
  };
}

export function buildPlanPermissionUpdate(plan: string) {
  const defaults = getMarketplacePlanDefaults(plan);
  return {
    plan: defaults.plan,
    canPostJobs: defaults.canPostJobs,
    canPostEvents: defaults.canPostEvents,
    canPostDeals: defaults.canPostDeals,
    canSponsor: defaults.canSponsor,
    jobPostLimit: defaults.jobPostLimit,
    eventPostLimit: defaults.eventPostLimit,
    dealPostLimit: defaults.dealPostLimit,
    sponsoredLimit: defaults.sponsoredLimit,
  };
}
