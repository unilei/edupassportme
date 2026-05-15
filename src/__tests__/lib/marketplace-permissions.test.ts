import { describe, expect, it } from "vitest";
import {
  evaluateSubmissionQuota,
  getMarketplacePlanDefaults,
  getOrganizationTypePermission,
} from "@/lib/marketplace/permissions";

describe("marketplace organization permissions", () => {
  it("keeps free organizations focused on jobs and events", () => {
    const free = getMarketplacePlanDefaults("free");

    expect(free).toMatchObject({
      plan: "free",
      canPostJobs: true,
      canPostEvents: true,
      canPostDeals: false,
      canSponsor: false,
      jobPostLimit: 3,
      eventPostLimit: 3,
      dealPostLimit: 0,
    });

    expect(getOrganizationTypePermission(free, "job")).toEqual({ allowed: true });
    expect(getOrganizationTypePermission(free, "deal")).toEqual({
      allowed: false,
      reason: "Deal submissions require an approved partner organization.",
    });
  });

  it("lets partner organizations post every marketplace type", () => {
    const partner = getMarketplacePlanDefaults("partner");

    expect(getOrganizationTypePermission(partner, "job")).toEqual({ allowed: true });
    expect(getOrganizationTypePermission(partner, "event")).toEqual({ allowed: true });
    expect(getOrganizationTypePermission(partner, "deal")).toEqual({ allowed: true });
  });

  it("blocks suspended organizations regardless of explicit permissions", () => {
    expect(
      getOrganizationTypePermission(
        {
          ...getMarketplacePlanDefaults("partner"),
          status: "suspended",
          canPostDeals: true,
        },
        "deal",
      ),
    ).toEqual({
      allowed: false,
      reason: "Organization is not active for marketplace publishing.",
    });
  });

  it("returns quota decisions for type-specific limits", () => {
    const organization = {
      ...getMarketplacePlanDefaults("business"),
      jobPostLimit: 2,
    };

    expect(evaluateSubmissionQuota(organization, "job", 1)).toEqual({
      allowed: true,
      limit: 2,
      used: 1,
    });
    expect(evaluateSubmissionQuota(organization, "job", 2)).toEqual({
      allowed: false,
      limit: 2,
      used: 2,
      reason: "Organization has reached its job posting limit.",
    });
  });
});
