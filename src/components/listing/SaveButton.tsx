"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getSessionAccountType } from "@/lib/account-types";

interface SaveButtonProps {
  listingId: string;
  initialSaved?: boolean;
  size?: "sm" | "md";
}

export function SaveButton({ listingId, initialSaved = false, size = "sm" }: SaveButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (status === "loading") return;

    if (!session?.user || (session.user as Record<string, unknown>).id === "admin") {
      router.push("/auth/signin");
      return;
    }

    if (getSessionAccountType(session.user) !== "individual") {
      setError("Use an individual account to save opportunities.");
      return;
    }

    setLoading(true);
    setError("");
    const res = await fetch("/api/user/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });

    if (res.ok) {
      const data = await res.json();
      setSaved(data.saved);
    } else if (res.status === 403) {
      const data = await res.json().catch(() => null) as { code?: string; error?: string } | null;
      if (data?.code === "SAVE_LIMIT_REACHED") {
        setError(data.error || "Free accounts can track up to 20 opportunities.");
        router.push("/pricing");
      } else {
        setError(data?.error || "Unable to save this opportunity.");
      }
    } else {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      setError(data?.error || "Unable to save this opportunity.");
    }
    setLoading(false);
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const label = error || (saved ? "Remove from saved" : "Save opportunity");

  return (
    <button
      onClick={handleToggle}
      disabled={loading || status === "loading"}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-full transition-colors ${
        size === "sm" ? "h-7 w-7" : "h-9 w-9"
      } ${
        saved
          ? "text-red-500 hover:text-red-600"
          : "text-muted-foreground hover:text-red-500"
      }`}
      title={label}
    >
      <Heart className={`${iconSize} ${saved ? "fill-current" : ""}`} />
    </button>
  );
}
