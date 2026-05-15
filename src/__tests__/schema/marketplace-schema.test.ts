import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");

function schemaBlock(kind: "enum" | "model", name: string) {
  const match = schema.match(new RegExp(`${kind}\\s+${name}\\s+\\{([\\s\\S]*?)\\n\\}`));

  expect(match, `${kind} ${name} should exist`).not.toBeNull();

  return match?.[1] ?? "";
}

describe("marketplace Prisma schema", () => {
  it("defines organization-backed listing submissions", () => {
    schemaBlock("enum", "OrganizationType");
    schemaBlock("model", "Organization");
    schemaBlock("model", "ListingSubmission");
    schemaBlock("model", "DealProgramApplication");

    const appUser = schemaBlock("model", "AppUser");
    const organization = schemaBlock("model", "Organization");
    const listing = schemaBlock("model", "Listing");
    const sponsoredListing = schemaBlock("model", "SponsoredListing");

    expect(appUser).toMatch(/organizations\s+Organization\[\]\s+@relation\("OrganizationOwner"\)/);
    expect(appUser).toMatch(
      /listingSubmissions\s+ListingSubmission\[\]\s+@relation\("ListingSubmissionSubmitter"\)/,
    );
    expect(organization).toMatch(/plan\s+String\s+@default\("free"\)/);
    expect(organization).toMatch(/canPostDeals\s+Boolean\s+@default\(false\)/);
    expect(organization).toMatch(/jobPostLimit\s+Int\s+@default\(3\)/);
    expect(organization).toMatch(/listings\s+Listing\[\]/);
    expect(listing).toMatch(/organizationId\s+String\?/);
    expect(listing).toMatch(
      /organization\s+Organization\?\s+@relation\(fields: \[organizationId\], references: \[id\], onDelete: SetNull\)/,
    );
    expect(sponsoredListing).toMatch(/organizationId\s+String\?/);
  });

  it("defines the richer application lifecycle fields", () => {
    const statusEnum = schemaBlock("enum", "ApplicationStatus");

    for (const status of [
      "under_review",
      "interview_scheduled",
      "offer_extended",
      "offer_accepted",
      "hired",
    ]) {
      expect(statusEnum).toMatch(new RegExp(`\\b${status}\\b`));
    }

    const application = schemaBlock("model", "Application");

    expect(application).toMatch(/interviewAt\s+DateTime\?/);
    expect(application).toMatch(/meetingUrl\s+String\?/);
    expect(application).toMatch(/offerLetterUrl\s+String\?/);
  });
});
