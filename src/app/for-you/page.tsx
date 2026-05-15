"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Sparkles, Loader2, Settings } from "lucide-react";
import { ListingCard } from "@/components/listing/ListingCard";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Button } from "@/components/ui/button";
import { AuthRequired, AuthRequiredPrompt } from "@/components/auth/AuthRequired";

interface ListingData {
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
  fitScore?: number;
  fitReasons?: string[];
}

function ForYouContent() {
  const { status } = useSession();
  const [listings, setListings] = useState<ListingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [authExpired, setAuthExpired] = useState(false);

  const fetchRecs = useCallback(() => {
    fetch("/api/user/recommendations")
      .then((r) => {
        if (r.status === 401) {
          setAuthExpired(true);
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((data: { listings: ListingData[] } | null) => {
        if (!data) return;
        setListings(data.listings || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchRecs();
  }, [status, fetchRecs]);

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
        callbackUrl="/for-you"
        title="Sign in to see your recommendations"
        description="Your recommendations are personalized from your profile and saved activity."
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb items={[{ label: "For You" }]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Recommended For You</h1>
          </div>
          <p className="text-muted-foreground">
            Personalized picks based on your goals, interests, saved activity, and preferred opportunity types
          </p>
        </div>
        <Link href="/profile">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" /> Update Interests
          </Button>
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">We need more data to personalize your experience.</p>
          <p className="text-sm text-muted-foreground mb-4">
            Update your interests in your profile or save some listings to get started.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/profile">
              <Button variant="outline">Set Interests</Button>
            </Link>
            <Link href="/courses">
              <Button>Browse Courses</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <div key={listing.id} className="space-y-2">
              <ListingCard listing={listing} />
              {(listing.fitReasons?.length || listing.fitScore) && (
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {listing.fitScore !== undefined && (
                    <span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
                      {listing.fitScore}% fit
                    </span>
                  )}
                  {listing.fitReasons?.slice(0, 2).map((reason) => (
                    <span key={reason} className="rounded-full border px-2 py-1 text-muted-foreground">{reason}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ForYouPage() {
  return (
    <AuthRequired
      callbackUrl="/for-you"
      title="Sign in to see your recommendations"
      description="Your recommendations are personalized from your profile and saved activity."
    >
      <ForYouContent />
    </AuthRequired>
  );
}
