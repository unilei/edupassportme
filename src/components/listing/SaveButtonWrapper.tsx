"use client";

import { SaveButton } from "./SaveButton";

interface SaveButtonWrapperProps {
  listingId: string;
  initialSaved?: boolean;
}

export function SaveButtonWrapper({ listingId, initialSaved }: SaveButtonWrapperProps) {
  return <SaveButton listingId={listingId} initialSaved={initialSaved} />;
}
