"use client";

import { SessionProvider } from "next-auth/react";
import { QuickApplyButton } from "./QuickApplyButton";

interface QuickApplyWrapperProps {
  listingId: string;
  listingType: string;
  initialApplied?: boolean;
}

export function QuickApplyWrapper({ listingId, listingType, initialApplied }: QuickApplyWrapperProps) {
  return (
    <SessionProvider>
      <QuickApplyButton listingId={listingId} listingType={listingType} initialApplied={initialApplied} />
    </SessionProvider>
  );
}
