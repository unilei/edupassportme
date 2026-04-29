"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Flag,
  Loader2,
  User,
  Send,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ---------- Vote Buttons ----------

interface VoteButtonsProps {
  reviewId: string;
  helpful: number;
  initialVote?: number | null;
}

export function VoteButtons({ reviewId, helpful, initialVote }: VoteButtonsProps) {
  const { data: session } = useSession();
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const isUser = !!userId && userId !== "admin";

  const [currentVote, setCurrentVote] = useState<number | null>(initialVote ?? null);
  const [score, setScore] = useState(helpful);
  const [loading, setLoading] = useState(false);

  const handleVote = async (value: 1 | -1) => {
    if (!isUser || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      const data = await res.json();
      if (res.ok) {
        const newVote = data.vote as number | null;
        // Update score locally
        const diff = (newVote ?? 0) - (currentVote ?? 0);
        setScore((s) => s + diff);
        setCurrentVote(newVote);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote(1)}
        disabled={!isUser || loading}
        className={`p-1 rounded transition-colors ${
          currentVote === 1 ? "text-green-600" : "text-muted-foreground hover:text-green-600"
        } disabled:opacity-40`}
        title="Helpful"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      {score !== 0 && (
        <span className={`text-xs font-medium ${score > 0 ? "text-green-600" : "text-red-500"}`}>
          {score > 0 ? `+${score}` : score}
        </span>
      )}
      <button
        onClick={() => handleVote(-1)}
        disabled={!isUser || loading}
        className={`p-1 rounded transition-colors ${
          currentVote === -1 ? "text-red-500" : "text-muted-foreground hover:text-red-500"
        } disabled:opacity-40`}
        title="Not helpful"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------- Reply Thread ----------

interface ReplyUser {
  id: string;
  name: string | null;
  avatar: string | null;
}

interface ReplyItem {
  id: string;
  body: string;
  createdAt: string;
  user: ReplyUser;
  children?: ReplyItem[];
}

interface ReplyThreadProps {
  reviewId: string;
}

export function ReplyThread({ reviewId }: ReplyThreadProps) {
  const { data: session } = useSession();
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const isUser = !!userId && userId !== "admin";

  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleReplies = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/replies`);
      const data = await res.json();
      setReplies(data.replies || []);
    } finally {
      setLoading(false);
      setOpen(true);
    }
  };

  const handleSubmit = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText, parentId: replyTo }),
      });
      if (res.ok) {
        const data = await res.json();
        if (replyTo) {
          // Add as child
          setReplies((prev) =>
            prev.map((r) =>
              r.id === replyTo
                ? { ...r, children: [...(r.children || []), data.reply] }
                : r,
            ),
          );
        } else {
          setReplies((prev) => [...prev, { ...data.reply, children: [] }]);
        }
        setReplyText("");
        setReplyTo(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderReply = (reply: ReplyItem, depth: number) => (
    <div key={reply.id} className={`${depth > 0 ? "ml-6 border-l pl-3" : ""}`}>
      <div className="flex items-start gap-2 py-2">
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
          <User className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/user/${reply.user.id}`} className="text-xs font-medium hover:text-primary">
              {reply.user.name || "Anonymous"}
            </Link>
            <span className="text-[10px] text-muted-foreground">
              {new Date(reply.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{reply.body}</p>
          {isUser && depth === 0 && (
            <button
              onClick={() => setReplyTo(replyTo === reply.id ? null : reply.id)}
              className="text-[10px] text-primary hover:underline mt-1"
            >
              Reply
            </button>
          )}
        </div>
      </div>
      {reply.children?.map((child) => renderReply(child, depth + 1))}
      {replyTo === reply.id && (
        <div className="ml-8 mt-1 mb-2 flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <Button size="icon" variant="ghost" onClick={handleSubmit} disabled={submitting || !replyText.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <button
        onClick={toggleReplies}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
        {open ? "Hide replies" : "Replies"}
      </button>

      {open && (
        <div className="mt-2">
          {replies.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No replies yet.</p>
          )}
          {replies.map((r) => renderReply(r, 0))}

          {/* Top-level reply input */}
          {isUser && !replyTo && (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <Button size="icon" variant="ghost" onClick={handleSubmit} disabled={submitting || !replyText.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Report Button ----------

interface ReportButtonProps {
  reviewId?: string;
  replyId?: string;
}

export function ReportButton({ reviewId, replyId }: ReportButtonProps) {
  const { data: session } = useSession();
  const userId = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const isUser = !!userId && userId !== "admin";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, replyId, reason, details }),
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => setDialogOpen(false), 1500);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit report");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isUser) return null;

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
        title="Report"
      >
        <Flag className="h-3 w-3" />
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Content</DialogTitle>
          </DialogHeader>
          {done ? (
            <p className="text-sm text-green-600 py-4">Report submitted. Thank you.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a reason</option>
                  <option value="spam">Spam</option>
                  <option value="harassment">Harassment</option>
                  <option value="misinformation">Misinformation</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Details (optional)</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-16 resize-y"
                  placeholder="Provide additional context..."
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={handleSubmit} disabled={!reason || submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Report"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
