"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Star,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  helpful: number;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
  listing: { id: string; title: string; slug: string; type: string };
}

interface ReviewsResponse {
  reviews: ReviewItem[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminReviewsPage() {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [ratingFilter, setRatingFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (ratingFilter) params.set("rating", ratingFilter);

    let cancelled = false;
    fetch(`/api/admin/reviews?${params}`)
      .then((r) => r.json())
      .then((d: ReviewsResponse) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, ratingFilter, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE" });
    reload();
  };

  const stars = (n: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${i < n ? "text-amber-500 fill-amber-500" : "text-gray-300"}`}
      />
    ));

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      course: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      job: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      event: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      deal: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[type] || "bg-gray-100 text-gray-700"}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-muted-foreground text-sm">
            {data ? `${data.total} reviews total` : "Loading..."}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/admin/export?type=reviews" download>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </a>
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select
          value={ratingFilter}
          onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All ratings</option>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Rating</th>
              <th className="text-left p-3 font-medium">Review</th>
              <th className="text-left p-3 font-medium">Listing</th>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.reviews.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No reviews found</td></tr>
            ) : (
              data?.reviews.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="flex">{stars(r.rating)}</div>
                  </td>
                  <td className="p-3 max-w-xs">
                    {r.title && <p className="font-medium text-sm">{r.title}</p>}
                    {r.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{r.body}</p>}
                    {!r.title && !r.body && <span className="text-xs text-muted-foreground">No content</span>}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      {typeBadge(r.listing.type)}
                      <span className="text-xs truncate max-w-32">{r.listing.title}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-xs">{r.user.name || r.user.email}</div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
