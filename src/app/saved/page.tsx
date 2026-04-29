"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, SessionProvider } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart, Loader2, Trash2 } from "lucide-react";
import { ListingCard } from "@/components/listing/ListingCard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Button } from "@/components/ui/button";

interface SavedEntry {
  id: string;
  createdAt: string;
  listing: {
    id: string;
    slug: string;
    title: string;
    type: "course" | "job" | "event" | "deal";
    description: string;
    url: string;
    image?: string | null;
    price?: number | null;
    priceLabel?: string | null;
    rating?: number | null;
    reviewCount?: number | null;
    duration?: string | null;
    level?: string | null;
    location?: string | null;
    provider: { name: string; slug: string; logo?: string | null };
    category?: { name: string; slug: string } | null;
    tags?: { tag: { name: string; slug: string } }[];
  };
}

function SavedContent() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = useCallback(() => {
    fetch("/api/user/saved")
      .then((r) => r.json())
      .then((data: { saved: SavedEntry[] }) => {
        setItems(data.saved || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchSaved();
    else if (status === "unauthenticated") router.push("/auth/signin?callbackUrl=/saved");
  }, [status, fetchSaved, router]);

  const handleRemove = async (listingId: string) => {
    await fetch("/api/user/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    setItems((prev) => prev.filter((i) => i.listing.id !== listingId));
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={[{ label: "Saved Listings" }]} />
      <div className="flex items-center gap-2 mb-2">
        <Heart className="h-6 w-6 text-red-500 fill-red-500" />
        <h1 className="text-3xl font-bold">Saved Listings</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        {items.length} saved {items.length === 1 ? "listing" : "listings"}
      </p>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">You haven&apos;t saved any listings yet.</p>
          <Button variant="outline" onClick={() => router.push("/courses")}>Browse Courses</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="flex-1">
                <ListingCard listing={item.listing} />
              </div>
              <button
                onClick={() => handleRemove(item.listing.id)}
                className="mt-4 p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                title="Remove from saved"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SavedPage() {
  return (
    <SessionProvider>
      <SavedContent />
    </SessionProvider>
  );
}
