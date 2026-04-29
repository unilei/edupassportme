"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface SaveButtonProps {
  listingId: string;
  initialSaved?: boolean;
  size?: "sm" | "md";
}

export function SaveButton({ listingId, initialSaved = false, size = "sm" }: SaveButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user || (session.user as Record<string, unknown>).id === "admin") {
      router.push("/auth/signin");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/user/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });

    if (res.ok) {
      const data = await res.json();
      setSaved(data.saved);
    }
    setLoading(false);
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-full transition-colors ${
        size === "sm" ? "h-7 w-7" : "h-9 w-9"
      } ${
        saved
          ? "text-red-500 hover:text-red-600"
          : "text-muted-foreground hover:text-red-500"
      }`}
      title={saved ? "Remove from saved" : "Save listing"}
    >
      <Heart className={`${iconSize} ${saved ? "fill-current" : ""}`} />
    </button>
  );
}
