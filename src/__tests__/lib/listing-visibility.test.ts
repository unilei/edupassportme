import { describe, expect, it } from "vitest";
import { activeListingWhere } from "@/lib/listing-visibility";

describe("activeListingWhere", () => {
  it("requires active listings that have not expired by listing or event end date", () => {
    const now = new Date("2026-04-30T00:00:00.000Z");

    expect(activeListingWhere(now)).toEqual({
      status: "active",
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] },
      ],
    });
  });
});
