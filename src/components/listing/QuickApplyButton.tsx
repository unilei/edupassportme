"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Send, Check, Lock, Loader2 } from "lucide-react";
import Link from "next/link";

interface QuickApplyButtonProps {
  listingId: string;
  listingType: string;
  initialApplied?: boolean;
}

export function QuickApplyButton({ listingId, listingType, initialApplied = false }: QuickApplyButtonProps) {
  const { data: session } = useSession();
  const [applied, setApplied] = useState(initialApplied);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [coverNote, setCoverNote] = useState("");

  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const userTier = (session?.user as Record<string, unknown> | undefined)?.tier as string | undefined;
  const isPro = userTier === "pro";
  const isUser = userId && userId !== "admin";

  // Only show for job listings
  if (listingType !== "job") return null;

  // Not logged in
  if (!isUser) {
    return (
      <Link href="/auth/signin">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border text-muted-foreground hover:bg-accent transition-colors">
          <Send className="h-3 w-3" /> Quick Apply
        </button>
      </Link>
    );
  }

  // Not pro
  if (!isPro) {
    return (
      <Link href="/pricing">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
          <Lock className="h-3 w-3" /> Quick Apply
          <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">PRO</span>
        </button>
      </Link>
    );
  }

  // Already applied
  if (applied) {
    return (
      <button disabled className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 border border-green-200 dark:border-green-800">
        <Check className="h-3 w-3" /> Applied
      </button>
    );
  }

  const handleApply = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/user/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, coverNote: coverNote || undefined }),
      });
      if (res.ok) {
        setApplied(true);
        setShowNote(false);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to apply");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {showNote ? (
        <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border bg-card shadow-lg p-3 z-50">
          <textarea
            className="w-full rounded-lg border px-2 py-1.5 text-xs resize-none h-16"
            placeholder="Optional cover note..."
            value={coverNote}
            onChange={(e) => setCoverNote(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleApply}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Apply
            </button>
            <button
              onClick={() => setShowNote(false)}
              className="px-2 py-1 text-xs font-medium rounded-lg border hover:bg-accent"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      ) : null}
      <button
        onClick={() => setShowNote(true)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        Quick Apply
      </button>
    </div>
  );
}
