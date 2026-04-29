export interface ProviderCompliance {
  attributionRequired: boolean;
  attributionText?: string;
  directLinkRequired: boolean;
  affiliateAllowed: boolean;
  pastEventStorageAllowed: boolean;
  notes: string;
}

export const PROVIDER_COMPLIANCE: Record<string, ProviderCompliance> = {
  remotive: {
    attributionRequired: true,
    attributionText: "Source: Remotive",
    directLinkRequired: true,
    affiliateAllowed: false,
    pastEventStorageAllowed: true,
    notes: "Display Remotive as source and link back to the Remotive job URL.",
  },
  usajobs: {
    attributionRequired: true,
    attributionText: "Source: USAJOBS",
    directLinkRequired: true,
    affiliateAllowed: false,
    pastEventStorageAllowed: true,
    notes: "Use the official USAJOBS application URL and keep government source attribution.",
  },
  ticketmaster: {
    attributionRequired: true,
    attributionText: "Source: Ticketmaster",
    directLinkRequired: true,
    affiliateAllowed: false,
    pastEventStorageAllowed: false,
    notes: "Use Discovery API data for future events and expire ended events.",
  },
  eventbrite: {
    attributionRequired: true,
    attributionText: "Source: Eventbrite",
    directLinkRequired: true,
    affiliateAllowed: false,
    pastEventStorageAllowed: false,
    notes: "Store future events only unless explicit organizer permission exists.",
  },
  awin: {
    attributionRequired: false,
    directLinkRequired: false,
    affiliateAllowed: true,
    pastEventStorageAllowed: true,
    notes: "Publisher promotions and voucher codes can use tracked links when account access permits it.",
  },
};

export function getProviderCompliance(slug: string): ProviderCompliance | undefined {
  return PROVIDER_COMPLIANCE[slug];
}
