export function activeListingWhere(now = new Date()) {
  return {
    status: "active",
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      { OR: [{ endDate: null }, { endDate: { gte: now } }] },
    ],
  };
}
