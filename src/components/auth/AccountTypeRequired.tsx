"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  getSessionAccountType,
  type AccountType,
} from "@/lib/account-types";
import { Button } from "@/components/ui/button";
import { AuthRequiredPrompt } from "@/components/auth/AuthRequired";

interface AccountTypeRequiredProps {
  allowed: AccountType[];
  children: ReactNode;
  callbackUrl: string;
  title: string;
  description: string;
  blockedTitle: string;
  blockedDescription: string;
}

export function AccountTypeRequired({
  allowed,
  children,
  callbackUrl,
  title,
  description,
  blockedTitle,
  blockedDescription,
}: AccountTypeRequiredProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <AuthRequiredPrompt
        callbackUrl={callbackUrl}
        title={title}
        description={description}
      />
    );
  }

  const accountType = getSessionAccountType(session?.user);
  if (!allowed.includes(accountType)) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">{blockedTitle}</h1>
        <p className="mb-6 text-muted-foreground">{blockedDescription}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/guide">Open user guide</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/profile">Profile</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function IndividualAccountRequired({
  children,
  callbackUrl,
  title,
  description,
}: {
  children: ReactNode;
  callbackUrl: string;
  title: string;
  description: string;
}) {
  return (
    <AccountTypeRequired
      allowed={["individual"]}
      callbackUrl={callbackUrl}
      title={title}
      description={description}
      blockedTitle="Individual account required"
      blockedDescription="This workspace is for individual accounts. Use Business or Deal Program for organization or partner workflows."
    >
      {children}
    </AccountTypeRequired>
  );
}
