"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { ArrowRight, Loader2, Send, ShieldAlert, Sparkles } from "lucide-react";
import { canSubmitOpportunities, getSessionAccountType } from "@/lib/account-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialForm = {
  type: "job",
  title: "",
  description: "",
  url: "",
  organizationName: "",
  organizationType: "other",
  organizationWebsite: "",
  companyName: "",
  location: "",
  country: "",
  region: "",
  startDate: "",
  endDate: "",
  expiresAt: "",
  priceLabel: "",
  couponCode: "",
};

const typeOptions = [
  { value: "job", label: "Job" },
  { value: "event", label: "Event" },
  { value: "course", label: "Course" },
  { value: "deal", label: "Deal" },
];

const organizationTypeOptions = [
  { value: "school", label: "School" },
  { value: "recruiter", label: "Recruiter" },
  { value: "vendor", label: "Vendor" },
  { value: "partner", label: "Partner" },
  { value: "employer", label: "Employer" },
  { value: "other", label: "Other" },
];

const textFields = [
  { name: "title", label: "Title", placeholder: "Opportunity title", type: "text", required: true },
  { name: "url", label: "URL", placeholder: "https://example.com/opportunity", type: "url", required: true },
  { name: "organizationName", label: "Organization name", placeholder: "School, partner, or organizer", type: "text", required: false },
  { name: "organizationWebsite", label: "Organization website", placeholder: "https://example.com", type: "url", required: false },
  { name: "companyName", label: "Company name", placeholder: "Employer or sponsor, if different", type: "text", required: false },
  { name: "location", label: "Location", placeholder: "City, campus, remote, or hybrid", type: "text", required: false },
  { name: "country", label: "Country", placeholder: "Country", type: "text", required: false },
  { name: "region", label: "Region", placeholder: "State, province, or region", type: "text", required: false },
  { name: "priceLabel", label: "Price label", placeholder: "Free, $49, Scholarship available...", type: "text", required: false },
  { name: "couponCode", label: "Coupon code", placeholder: "Optional deal or partner code", type: "text", required: false },
] as const;

const dateFields = [
  { name: "startDate", label: "Start date" },
  { name: "endDate", label: "End date" },
  { name: "expiresAt", label: "Expires at" },
] as const;

type SubmitOpportunityForm = typeof initialForm;
type SubmitOpportunityField = keyof SubmitOpportunityForm;

export default function SubmitOpportunityPage() {
  const { data: session, status } = useSession();
  const [form, setForm] = useState<SubmitOpportunityForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateField = (field: SubmitOpportunityField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    updateField(event.target.name as SubmitOpportunityField, event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/marketplace/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({})) as { message?: string; error?: string };

      if (!res.ok) {
        setError(data.error || "Unable to submit this opportunity.");
        return;
      }

      setMessage(data.message || "Opportunity submitted for review.");
      setForm(initialForm);
    } catch {
      setError("Unable to submit this opportunity.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Submit an education opportunity</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Sign in to submit jobs, events, courses, and partner deals for marketplace review.
        </p>
        <Button asChild size="lg" className="mt-7">
          <Link href="/auth/signin?callbackUrl=/submit-opportunity">
            Sign in to submit <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  const accountType = getSessionAccountType(session?.user);
  if (!canSubmitOpportunities(accountType)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Organization account required</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Individual accounts are for finding, saving, and tracking opportunities. Use an organization account to submit listings. Partner accounts should use the Deal Program workflow for offers.
        </p>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/guide">Open user guide</Link>
          </Button>
          {accountType === "partner" ? (
            <Button asChild variant="outline">
              <Link href="/deal-program">Deal Program</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/workspace">Workspace</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Marketplace review
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Submit an education opportunity</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Jobs, events, courses, and partner deals are reviewed before they appear in the EDU Passport marketplace.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            <span>Type</span>
            <select
              name="type"
              value={form.type}
              onChange={handleInputChange}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {textFields.map((field) => (
            <label key={field.name} className="space-y-2 text-sm font-medium">
              <span>{field.label}</span>
              <Input
                name={field.name}
                type={field.type}
                value={form[field.name]}
                onChange={handleInputChange}
                placeholder={field.placeholder}
                required={field.required}
                className="h-10"
              />
            </label>
          ))}

          <label className="space-y-2 text-sm font-medium">
            <span>Organization type</span>
            <select
              name="organizationType"
              value={form.organizationType}
              onChange={handleInputChange}
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            >
              {organizationTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {dateFields.map((field) => (
            <label key={field.name} className="space-y-2 text-sm font-medium">
              <span>{field.label}</span>
              <Input
                name={field.name}
                type="date"
                value={form[field.name]}
                onChange={handleInputChange}
                className="h-10"
              />
            </label>
          ))}

          <label className="space-y-2 text-sm font-medium md:col-span-2">
            <span>Description</span>
            <Textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              placeholder="Summarize who this is for, requirements, benefits, and review context."
              required
              className="min-h-32"
            />
          </label>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit for review
          </Button>
        </div>
      </form>
    </div>
  );
}
