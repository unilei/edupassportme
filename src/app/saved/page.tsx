"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Button } from "@/components/ui/button";
import { AuthRequiredPrompt } from "@/components/auth/AuthRequired";
import { IndividualAccountRequired } from "@/components/auth/AccountTypeRequired";
import { OpportunityWorkspacePanel, type OpportunityWorkspaceEntry } from "@/components/workspace/OpportunityWorkspacePanel";

type SavedEntry = OpportunityWorkspaceEntry;

function SavedContent() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authExpired, setAuthExpired] = useState(false);

  const fetchSaved = useCallback(() => {
    fetch("/api/user/saved")
      .then((r) => {
        if (r.status === 401) {
          setAuthExpired(true);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((data: { saved: SavedEntry[] } | null) => {
        if (!data) return;
        setItems(data.saved || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchSaved();
  }, [status, fetchSaved, router]);

  const handleRemove = async (listingId: string) => {
    await fetch("/api/user/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    setItems((prev) => prev.filter((i) => i.listing.id !== listingId));
  };

  const handleUpdate = async (savedId: string, payload: Record<string, string | null>) => {
    const res = await fetch("/api/user/saved", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ savedId, ...payload }),
    });
    if (!res.ok) return;
    const data = await res.json() as { saved: SavedEntry };
    setItems((prev) => prev.map((item) => (item.id === savedId ? data.saved : item)));
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (authExpired) {
    return (
      <AuthRequiredPrompt
        callbackUrl="/saved"
        title="Sign in to view saved listings"
        description="Saved listings are stored in your EDU Passport account."
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={[{ label: "Saved Listings" }]} />
      <div className="flex items-center gap-2 mb-2">
        <Heart className="h-6 w-6 text-red-500 fill-red-500" />
        <h1 className="text-3xl font-bold">Saved Opportunities</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        {items.length} saved {items.length === 1 ? "opportunity" : "opportunities"} ready to organize.
      </p>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">You haven&apos;t saved any listings yet.</p>
          <Button variant="outline" onClick={() => router.push("/courses")}>Browse Courses</Button>
        </div>
      ) : (
        <OpportunityWorkspacePanel entries={items} onUpdate={handleUpdate} onRemove={handleRemove} />
      )}
    </div>
  );
}

export default function SavedPage() {
  return (
    <IndividualAccountRequired
      callbackUrl="/saved"
      title="Sign in to view saved listings"
      description="Saved listings are stored in your EDU Passport account."
    >
      <SavedContent />
    </IndividualAccountRequired>
  );
}
