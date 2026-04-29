"use client";

import { SessionProvider } from "next-auth/react";
import { BottomNav } from "./BottomNav";

export function BottomNavWrapper() {
  return (
    <SessionProvider>
      <BottomNav />
    </SessionProvider>
  );
}
