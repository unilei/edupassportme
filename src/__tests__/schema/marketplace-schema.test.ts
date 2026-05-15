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

    expect(appUser).toMatch(/organizations\s+Organization\[\]\s+@relation\("OrganizationOwner"\)/);
    expect(appUser).toMatch(
      /listingSubmissions\s+ListingSubmission\[\]\s+@relation\("ListingSubmissionSubmitter"\)/,
    );
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
