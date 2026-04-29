"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, X } from "lucide-react";

interface AiSummaryButtonProps {
  slug: string;
}

export function AiSummaryButton({ slug }: AiSummaryButtonProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    if (summary) {
      setSummary(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate summary");
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : summary ? (
          <X className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        )}
        {loading ? "Analyzing..." : summary ? "Hide Summary" : "AI Summary"}
      </Button>

      {error && (
        <p className="text-xs text-destructive mt-2">{error}</p>
      )}

      {summary && (
        <div className="mt-3 rounded-xl border bg-amber-50 dark:bg-amber-900/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold">AI Summary</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {summary}
          </p>
        </div>
      )}
    </div>
  );
}
