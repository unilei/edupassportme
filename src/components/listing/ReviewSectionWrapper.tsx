"use client";

import { SessionProvider } from "next-auth/react";
import { ReviewSection } from "./ReviewSection";

export function ReviewSectionWrapper({ slug }: { slug: string }) {
  return (
    <SessionProvider>
      <ReviewSection slug={slug} />
    </SessionProvider>
  );
}
