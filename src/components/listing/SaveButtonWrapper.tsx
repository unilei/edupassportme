"use client";

import { SessionProvider } from "next-auth/react";
import { SaveButton } from "./SaveButton";

interface SaveButtonWrapperProps {
  listingId: string;
  initialSaved?: boolean;
}

export function SaveButtonWrapper({ listingId, initialSaved }: SaveButtonWrapperProps) {
  return (
    <SessionProvider>
      <SaveButton listingId={listingId} initialSaved={initialSaved} />
    </SessionProvider>
  );
}
