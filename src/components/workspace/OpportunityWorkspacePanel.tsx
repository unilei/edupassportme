"use client";

import { CalendarClock, Clock3, Flag, Trash2 } from "lucide-react";
import { ListingCard } from "@/components/listing/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ListingType } from "@/generated/prisma/enums";

export interface OpportunityWorkspaceEntry {
  id: string;
  createdAt: string;
  status: string;
  priority: string;
  note?: string | null;
  deadlineAt?: string | null;
  nextActionAt?: string | null;
  listing: {
    id: string;
    slug: string;
    title: string;
    type: ListingType;
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

interface OpportunityWorkspacePanelProps {
  entries: OpportunityWorkspaceEntry[];
  onUpdate: (savedId: string, payload: Record<string, string | null>) => Promise<void> | void;
  onRemove: (listingId: string) => Promise<void> | void;
}

const statuses = [
  { value: "saved", label: "Saved" },
  { value: "researching", label: "Researching" },
  { value: "applying", label: "Applying" },
  { value: "applied", label: "Applied" },
  { value: "completed", label: "Completed" },
  { value: "dismissed", label: "Dismissed" },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateInputValue(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}

function fromDateTimeLocalValue(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function OpportunityWorkspacePanel({ entries, onUpdate, onRemove }: OpportunityWorkspacePanelProps) {
  return (
    <section aria-labelledby="opportunity-workspace-heading" className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="opportunity-workspace-heading" className="text-2xl font-bold">Opportunity Workspace</h2>
          <p className="text-sm text-muted-foreground">
            Track next actions, deadlines, and priority across every saved opportunity.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          {entries.length} active item{entries.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="space-y-5">
        {entries.map((entry) => (
          <article
            key={entry.id}
            id={`workspace-item-${entry.id}`}
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]"
          >
            <ListingCard listing={entry.listing} />

            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Tracking</p>
                  <p className="text-xs text-muted-foreground">Saved {new Date(entry.createdAt).toLocaleDateString()}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                  onClick={() => onRemove(entry.listing.id)}
                  aria-label={`Remove ${entry.listing.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs font-medium">
                  Status
                  <select
                    aria-label={`Status for ${entry.listing.title}`}
                    defaultValue={entry.status || "saved"}
                    onChange={(event) => onUpdate(entry.id, { status: event.target.value })}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm font-normal"
                  >
                    {statuses.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium">
                  Priority
                  <select
                    aria-label={`Priority for ${entry.listing.title}`}
                    defaultValue={entry.priority || "medium"}
                    onChange={(event) => onUpdate(entry.id, { priority: event.target.value })}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm font-normal"
                  >
                    {priorities.map((priority) => (
                      <option key={priority.value} value={priority.value}>{priority.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 space-y-3">
                <label className="space-y-1 text-xs font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 text-amber-600" />
                    Deadline
                  </span>
                  <Input
                    type="date"
                    defaultValue={toDateInputValue(entry.deadlineAt)}
                    onChange={(event) => onUpdate(entry.id, { deadlineAt: fromDateInputValue(event.target.value) })}
                    className="h-9"
                  />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                    Next action
                  </span>
                  <Input
                    type="datetime-local"
                    defaultValue={toDateTimeLocalValue(entry.nextActionAt)}
                    onChange={(event) => onUpdate(entry.id, { nextActionAt: fromDateTimeLocalValue(event.target.value) })}
                    className="h-9"
                  />
                </label>
                <label className="space-y-1 text-xs font-medium">
                  Note
                  <Input
                    defaultValue={entry.note || ""}
                    placeholder="Add a next step or reminder context"
                    onBlur={(event) => onUpdate(entry.id, { note: event.target.value || null })}
                    className="h-9"
                  />
                </label>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
