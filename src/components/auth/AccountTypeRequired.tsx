"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Loader2, ShieldAlert, UserCheck } from "lucide-react";
import {
  getSessionAccountType,
  hasCompletedOnboarding,
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
  requireOnboarding?: boolean;
}

type OnboardingState = "checking" | "complete" | "incomplete" | "error";
type OnboardingCheck = {
  key: string;
  state: OnboardingState;
};

function onboardingCopy(accountType: AccountType) {
  if (accountType === "organization") {
    return {
      title: "Complete organization setup",
      description: "Add your organization identity before using Business tools or submitting marketplace supply.",
    };
  }

  if (accountType === "partner") {
    return {
      title: "Complete partner setup",
      description: "Add your partner organization, contact details, and proposed offer before using the Deal Program.",
    };
  }

  return {
    title: "Complete individual setup",
    description: "Choose your goals, interests, regions, and preferred opportunity types before using your workspace.",
  };
}

function OnboardingPrompt({ accountType, error }: { accountType: AccountType; error?: boolean }) {
  const copy = onboardingCopy(accountType);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UserCheck className="h-6 w-6" />
      </div>
      <h1 className="mb-2 text-2xl font-bold">{error ? "Setup check unavailable" : copy.title}</h1>
      <p className="mb-6 text-muted-foreground">
        {error ? "We could not verify your setup status. Open onboarding to confirm your account details." : copy.description}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/onboarding">Complete setup</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/guide">Open user guide</Link>
        </Button>
      </div>
    </div>
  );
}

export function OnboardingRequired({
  children,
  accountType,
}: {
  children: ReactNode;
  accountType: AccountType;
}) {
  const { data: session, status } = useSession();
  const [check, setCheck] = useState<OnboardingCheck | null>(null);
  const sessionCompleted = hasCompletedOnboarding(session?.user);
  const sessionUserId = (session?.user as Record<string, unknown> | undefined)?.id;
  const checkKey = `${sessionUserId || "unknown"}:${accountType}`;
  const state: OnboardingState = sessionCompleted
    ? "complete"
    : check?.key === checkKey
      ? check.state
      : "checking";

  useEffect(() => {
    if (status !== "authenticated" || sessionCompleted) return;

    let cancelled = false;

    async function checkOnboarding() {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          setCheck({ key: checkKey, state: "error" });
          return;
        }

        const data = await res.json() as {
          user?: { profile?: { onboardingCompletedAt?: string | null } | null } | null;
          profileCompletion?: { onboardingCompleted?: boolean } | null;
        };
        const completed = Boolean(
          data.user?.profile?.onboardingCompletedAt ||
          data.profileCompletion?.onboardingCompleted,
        );
        setCheck({ key: checkKey, state: completed ? "complete" : "incomplete" });
      } catch {
        if (!cancelled) setCheck({ key: checkKey, state: "error" });
      }
    }

    void checkOnboarding();
    return () => { cancelled = true; };
  }, [checkKey, sessionCompleted, status]);

  if (status === "unauthenticated") {
    return (
      <AuthRequiredPrompt
        callbackUrl="/onboarding"
        title="Sign in to complete setup"
        description="Your account setup is saved to your EDU Passport profile."
      />
    );
  }

  if (status === "loading" || state === "checking") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "error") {
    return <OnboardingPrompt accountType={accountType} error />;
  }

  if (state === "incomplete") {
    return <OnboardingPrompt accountType={accountType} />;
  }

  return <>{children}</>;
}

export function AccountTypeRequired({
  allowed,
  children,
  callbackUrl,
  title,
  description,
  blockedTitle,
  blockedDescription,
  requireOnboarding = false,
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

  if (requireOnboarding) {
    return <OnboardingRequired accountType={accountType}>{children}</OnboardingRequired>;
  }

  return <>{children}</>;
}

export function IndividualAccountRequired({
  children,
  callbackUrl,
  title,
  description,
  requireOnboarding = true,
}: {
  children: ReactNode;
  callbackUrl: string;
  title: string;
  description: string;
  requireOnboarding?: boolean;
}) {
  return (
    <AccountTypeRequired
      allowed={["individual"]}
      callbackUrl={callbackUrl}
      title={title}
      description={description}
      blockedTitle="Individual account required"
      blockedDescription="This workspace is for individual accounts. Use Business or Deal Program for organization or partner workflows."
      requireOnboarding={requireOnboarding}
    >
      {children}
    </AccountTypeRequired>
  );
}
