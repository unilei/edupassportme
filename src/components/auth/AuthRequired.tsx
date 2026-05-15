"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthRequiredProps {
  children: ReactNode;
  callbackUrl: string;
  title?: string;
  description?: string;
}

interface AuthRequiredPromptProps {
  callbackUrl: string;
  title: string;
  description: string;
}

export function AuthRequiredPrompt({ callbackUrl, title, description }: AuthRequiredPromptProps) {
  const signInHref = `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h1 className="mb-2 text-2xl font-bold">{title}</h1>
      <p className="mb-6 text-muted-foreground">{description}</p>
      <Button asChild>
        <Link href={signInHref}>Sign In</Link>
      </Button>
    </div>
  );
}

export function AuthRequired({
  children,
  callbackUrl,
  title = "Sign in required",
  description = "Sign in to continue to your EDU Passport account.",
}: AuthRequiredProps) {
  const { status } = useSession();

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

  return <>{children}</>;
}
