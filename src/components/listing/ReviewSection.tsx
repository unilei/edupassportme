"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Star, User, Loader2 } from "lucide-react";
import { VoteButtons, ReplyThread, ReportButton } from "./ReviewActions";
import Link from "next/link";

interface ReviewUser {
  id: string;
  name: string | null;
  avatar: string | null;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  helpful: number;
  createdAt: string;
  user: ReviewUser;
}

interface ReviewStats {
  average: number | null;
  count: number;
  distribution: Record<number, number>;
}

interface ReviewData {
  reviews: Review[];
  total: number;
  page: number;
  totalPages: number;
  stats: ReviewStats;
  userReview: Review | null;
}

function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}) {
  const [hover, setHover] = useState(0);
  const cls = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
        >
          <Star
            className={`${cls} transition-colors ${
              star <= (hover || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function RatingBar({ label, count, total }: { label: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-right text-muted-foreground">{label}</span>
      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
    </div>
  );
}

export function ReviewSection({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const isUser = userId && userId !== "admin";

  const fetchReviews = useCallback(
    (p: number) => {
      fetch(`/api/listings/${slug}/reviews?page=${p}`)
        .then((r) => r.json())
        .then((d: ReviewData) => {
          setData(d);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    },
    [slug],
  );

  useEffect(() => {
    fetchReviews(page);
  }, [fetchReviews, page]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/listings/${slug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title, body }),
      });
      const result: { error?: string } = await res.json();
      if (!res.ok) {
        setError(result.error || "Failed to submit review");
      } else {
        setShowForm(false);
        setRating(0);
        setTitle("");
        setBody("");
        fetchReviews(1);
        setPage(1);
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
      </div>
    );
  }

  if (!data) return null;

  const { reviews, stats, userReview, totalPages } = data;

  return (
    <section className="mt-10 pt-8 border-t">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Reviews</h2>
        {isUser && !userReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Stats summary */}
      {stats.count > 0 && (
        <div className="flex flex-col sm:flex-row gap-6 mb-6 p-4 rounded-xl border bg-card">
          <div className="flex flex-col items-center justify-center min-w-24">
            <p className="text-4xl font-bold">{stats.average}</p>
            <StarRating value={Math.round(stats.average || 0)} readonly size="sm" />
            <p className="text-xs text-muted-foreground mt-1">{stats.count} review{stats.count !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => (
              <RatingBar key={n} label={n} count={stats.distribution[n] || 0} total={stats.count} />
            ))}
          </div>
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-xl border p-5 space-y-4">
          <h3 className="font-semibold">Your Review</h3>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div>
            <label className="text-sm font-medium block mb-1">Rating</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Summarize your experience"
              maxLength={120}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Review (optional)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-24 resize-y"
              placeholder="Share your thoughts..."
              maxLength={2000}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(""); }}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Already reviewed notice */}
      {userReview && (
        <div className="mb-6 rounded-xl border bg-primary/5 p-4">
          <p className="text-sm text-muted-foreground">You reviewed this listing</p>
          <div className="flex items-center gap-2 mt-1">
            <StarRating value={userReview.rating} readonly size="sm" />
            {userReview.title && <span className="text-sm font-medium">{userReview.title}</span>}
          </div>
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 && !showForm ? (
        <p className="text-sm text-muted-foreground py-4">
          No reviews yet.{" "}
          {isUser ? (
            <button onClick={() => setShowForm(true)} className="text-primary hover:underline">
              Be the first to review!
            </button>
          ) : (
            <Link href="/auth/signin" className="text-primary hover:underline">Sign in to review</Link>
          )}
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <Link
                      href={`/user/${review.user.id}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {review.user.name || "Anonymous"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <StarRating value={review.rating} readonly size="sm" />
              </div>
              {review.title && <p className="font-medium text-sm mb-1">{review.title}</p>}
              {review.body && (
                <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>
              )}
              <div className="flex items-center gap-3 mt-3 pt-2 border-t">
                <VoteButtons reviewId={review.id} helpful={review.helpful} />
                <ReplyThread reviewId={review.id} />
                <div className="ml-auto">
                  <ReportButton reviewId={review.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 hover:bg-muted transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded border text-sm disabled:opacity-50 hover:bg-muted transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
