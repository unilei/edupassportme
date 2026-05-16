"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2, Handshake, Loader2, Target, User } from "lucide-react";
import { getDefaultAccountPath } from "@/lib/account-routing";
import { getSessionAccountType, type AccountType } from "@/lib/account-types";
import { AuthRequiredPrompt } from "@/components/auth/AuthRequired";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const EDUCATION_LEVELS = ["High School", "Undergraduate", "Graduate", "PhD", "Professional", "Self-learner"];
const INTEREST_OPTIONS = ["Data Science", "Web Development", "Cybersecurity", "UX Design", "Business", "Finance", "Teaching", "Research"];
const GOAL_OPTIONS = ["Build a portfolio", "Career switch", "Graduate school prep", "Find education discounts", "Attend events", "Earn credentials"];
const TARGET_REGION_OPTIONS = ["United States", "Remote", "Canada", "United Kingdom", "Europe", "Asia-Pacific"];
const PREFERRED_TYPE_OPTIONS = [
  { value: "course", label: "Courses" },
  { value: "job", label: "Jobs" },
  { value: "event", label: "Events" },
  { value: "deal", label: "Deals" },
];

const ORGANIZATION_TYPE_OPTIONS = [
  { value: "school", label: "School" },
  { value: "employer", label: "Employer" },
  { value: "recruiter", label: "Recruiter" },
  { value: "vendor", label: "Vendor" },
  { value: "other", label: "Other" },
];

type ProfileResponse = {
  user?: {
    name?: string | null;
    accountType?: AccountType | null;
    profile?: {
      educationLevel?: string | null;
      interests?: string[];
      goals?: string[];
      targetRegions?: string[];
      preferredTypes?: string[];
    } | null;
    organizations?: {
      name?: string | null;
      type?: string | null;
      website?: string | null;
      description?: string | null;
    }[];
    dealProgramRequests?: {
      contactName?: string | null;
      contactEmail?: string | null;
      proposedOffer?: string | null;
      targetAudience?: string | null;
    }[];
  } | null;
};

function toggle(value: string, current: string[], setValue: (items: string[]) => void) {
  setValue(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
}

function PillButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const accountType = getSessionAccountType(session?.user);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [targetRegions, setTargetRegions] = useState<string[]>([]);
  const [preferredTypes, setPreferredTypes] = useState<string[]>([]);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationWebsite, setOrganizationWebsite] = useState("");
  const [organizationType, setOrganizationType] = useState("other");
  const [organizationDescription, setOrganizationDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [proposedOffer, setProposedOffer] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    async function loadProfile() {
      setLoadingProfile(true);
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const body = await res.json() as ProfileResponse;
        const user = body.user;
        const profile = user?.profile;
        const organization = user?.organizations?.[0];
        const dealProgram = user?.dealProgramRequests?.[0];

        setName(user?.name || "");
        setEducationLevel(profile?.educationLevel || "");
        setInterests(profile?.interests || []);
        setGoals(profile?.goals || []);
        setTargetRegions(profile?.targetRegions || []);
        setPreferredTypes(profile?.preferredTypes || []);
        setOrganizationName(organization?.name || "");
        setOrganizationWebsite(organization?.website || "");
        setOrganizationType(organization?.type || (accountType === "partner" ? "partner" : "other"));
        setOrganizationDescription(organization?.description || "");
        setContactName(dealProgram?.contactName || "");
        setContactEmail(dealProgram?.contactEmail || "");
        setProposedOffer(dealProgram?.proposedOffer || "");
        setTargetAudience(dealProgram?.targetAudience || "");
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [accountType, status]);

  const pageConfig = useMemo(() => {
    if (accountType === "organization") {
      return {
        icon: Building2,
        title: "Set up your organization workspace",
        subtitle: "Create the business identity used for submissions, reviews, and applicant management.",
      };
    }
    if (accountType === "partner") {
      return {
        icon: Handshake,
        title: "Set up your partner workspace",
        subtitle: "Create the partner identity used for deal program review and offer management.",
      };
    }
    return {
      icon: User,
      title: "Set up your individual workspace",
      subtitle: "Tune recommendations, saved opportunities, and next-step reminders around your goals.",
    };
  }, [accountType]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    const body = accountType === "individual"
      ? {
        name,
        educationLevel,
        interests,
        goals,
        targetRegions,
        preferredTypes,
        completeOnboarding: true,
      }
      : {
        name,
        organizationName,
        organizationWebsite,
        organizationType: accountType === "partner" ? "partner" : organizationType,
        organizationDescription,
        contactName,
        contactEmail,
        proposedOffer,
        targetAudience,
        completeOnboarding: true,
      };

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { error?: string; nextPath?: string };

      if (!res.ok) {
        setError(data.error || "Unable to save onboarding.");
        return;
      }

      router.push(data.nextPath || getDefaultAccountPath(accountType));
    } catch {
      setError("Unable to save onboarding.");
    } finally {
      setSaving(false);
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
      <AuthRequiredPrompt
        callbackUrl="/onboarding"
        title="Sign in to continue setup"
        description="Your onboarding choices are saved to your EDU Passport account."
      />
    );
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const Icon = pageConfig.icon;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Target className="h-3.5 w-3.5" />
          Account setup
        </div>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{pageConfig.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{pageConfig.subtitle}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-card p-5">
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Display name</label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
        </div>

        {accountType === "individual" ? (
          <>
            <section className="space-y-2">
              <label className="text-sm font-medium">Education level</label>
              <div className="flex flex-wrap gap-2">
                {EDUCATION_LEVELS.map((level) => (
                  <PillButton key={level} label={level} selected={educationLevel === level} onClick={() => setEducationLevel(level)} />
                ))}
              </div>
            </section>
            <section className="space-y-2">
              <label className="text-sm font-medium">Interests</label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => (
                  <PillButton key={interest} label={interest} selected={interests.includes(interest)} onClick={() => toggle(interest, interests, setInterests)} />
                ))}
              </div>
            </section>
            <section className="space-y-2">
              <label className="text-sm font-medium">Goals</label>
              <div className="flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((goal) => (
                  <PillButton key={goal} label={goal} selected={goals.includes(goal)} onClick={() => toggle(goal, goals, setGoals)} />
                ))}
              </div>
            </section>
            <section className="space-y-2">
              <label className="text-sm font-medium">Target regions</label>
              <div className="flex flex-wrap gap-2">
                {TARGET_REGION_OPTIONS.map((region) => (
                  <PillButton key={region} label={region} selected={targetRegions.includes(region)} onClick={() => toggle(region, targetRegions, setTargetRegions)} />
                ))}
              </div>
            </section>
            <section className="space-y-2">
              <label className="text-sm font-medium">Opportunity types</label>
              <div className="flex flex-wrap gap-2">
                {PREFERRED_TYPE_OPTIONS.map((type) => (
                  <PillButton key={type.value} label={type.label} selected={preferredTypes.includes(type.value)} onClick={() => toggle(type.value, preferredTypes, setPreferredTypes)} />
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="organizationName" className="text-sm font-medium">Organization name</label>
                <Input id="organizationName" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <label htmlFor="organizationWebsite" className="text-sm font-medium">Website</label>
                <Input id="organizationWebsite" value={organizationWebsite} onChange={(event) => setOrganizationWebsite(event.target.value)} placeholder="https://example.com" />
              </div>
            </div>
            {accountType === "organization" ? (
              <div className="space-y-2">
                <label htmlFor="organizationType" className="text-sm font-medium">Organization type</label>
                <select
                  id="organizationType"
                  value={organizationType}
                  onChange={(event) => setOrganizationType(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {ORGANIZATION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="organizationDescription" className="text-sm font-medium">Description</label>
              <Textarea id="organizationDescription" value={organizationDescription} onChange={(event) => setOrganizationDescription(event.target.value)} />
            </div>
            {accountType === "partner" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="contactName" className="text-sm font-medium">Contact name</label>
                    <Input id="contactName" value={contactName} onChange={(event) => setContactName(event.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="contactEmail" className="text-sm font-medium">Contact email</label>
                    <Input id="contactEmail" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="proposedOffer" className="text-sm font-medium">Proposed offer</label>
                  <Textarea id="proposedOffer" value={proposedOffer} onChange={(event) => setProposedOffer(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="targetAudience" className="text-sm font-medium">Target audience</label>
                  <Textarea id="targetAudience" value={targetAudience} onChange={(event) => setTargetAudience(event.target.value)} />
                </div>
              </>
            ) : null}
          </>
        )}

        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Finish setup"}
          </Button>
        </div>
      </form>
    </main>
  );
}
