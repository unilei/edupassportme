import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createMetadata } from "@/lib/metadata";
import { User, Star, GraduationCap, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.appUser.findUnique({
    where: { id },
    select: { name: true, email: true },
  });
  if (!user) return {};
  const displayName = user.name || "User";
  return createMetadata({
    title: `${displayName}'s Profile`,
    description: `View ${displayName}'s reviews and interests on EDU Passport.`,
    path: `/user/${id}`,
    noIndex: true,
  });
}

export default async function PublicUserProfilePage({ params }: PageProps) {
  const { id } = await params;

  const user = await prisma.appUser.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      avatar: true,
      tier: true,
      createdAt: true,
      profile: {
        select: {
          educationLevel: true,
          interests: true,
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          listing: {
            select: { title: true, slug: true, type: true },
          },
        },
      },
      _count: {
        select: { reviews: true, savedListings: true },
      },
    },
  });

  if (!user) notFound();

  const displayName = user.name || "Anonymous User";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{displayName}</h1>
            {user.tier === "pro" && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Pro
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <span>·</span>
            <span>{user._count.reviews} review{user._count.reviews !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{user._count.savedListings} saved</span>
          </div>
        </div>
      </div>

      {/* Education & Interests */}
      {(user.profile?.educationLevel || (user.profile?.interests && user.profile.interests.length > 0)) && (
        <div className="rounded-xl border p-5 mb-8">
          {user.profile?.educationLevel && (
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{user.profile.educationLevel}</span>
            </div>
          )}
          {user.profile?.interests && user.profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {user.profile.interests.map((interest) => (
                <Badge key={interest} variant="secondary" className="text-xs">
                  {interest}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reviews */}
      <div>
        <h2 className="text-lg font-bold mb-4">Reviews ({user._count.reviews})</h2>
        {user.reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {user.reviews.map((review) => (
              <div key={review.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Link
                      href={`/listing/${review.listing.slug}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {review.listing.title}
                    </Link>
                    <p className="text-xs text-muted-foreground capitalize">{review.listing.type}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
                {review.body && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(review.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
