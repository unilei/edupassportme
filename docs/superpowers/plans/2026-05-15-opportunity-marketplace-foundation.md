# Opportunity Marketplace Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade EDU Passport from a student-only opportunity workspace into the first working slice of an education opportunity marketplace with public positioning, organization-backed submissions, admin review, publishing, and a richer jobs application lifecycle.

**Architecture:** Keep the current Next.js App Router, Prisma, PostgreSQL, NextAuth, Vitest, and existing admin patterns. Add marketplace supply-side models beside the existing `Listing` system instead of replacing it; external/provider data and user/business submissions both publish into the same `Listing` table after review.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7, PostgreSQL, NextAuth, Vitest, Testing Library, Tailwind, existing UI components in `src/components/ui`.

---

## Scope

This plan implements the first milestone from the approved spec:

- Reposition public product language from student-only workspace to education opportunity marketplace.
- Preserve `/workspace` as the personal opportunity workspace.
- Add `Organization`, `ListingSubmission`, and `DealProgramApplication` data foundations.
- Add a public authenticated opportunity submission flow.
- Add admin submission review and publish flow.
- Expand job application statuses so the jobs loop can support a real hiring pipeline.

This plan does not implement a full Business/Vendor dashboard, Stripe payments, claimable organization pages, social feed, credits, affiliate payouts, chat, or the old Flask/Mongo service.

## File Structure

### Data and Domain

- Modify: `prisma/schema.prisma`
  - Adds organization and submission models.
  - Adds richer application statuses and interview/offer fields.
- Create: `src/lib/marketplace/submissions.ts`
  - Normalizes and validates public submission payloads.
- Create: `src/lib/marketplace/publish-submission.ts`
  - Converts approved submissions into published `Listing` records.
- Create: `src/__tests__/schema/marketplace-schema.test.ts`
  - Guards the Prisma schema additions.
- Create: `src/__tests__/lib/marketplace-submissions.test.ts`
  - Tests submission normalization and validation.
- Create: `src/__tests__/lib/publish-submission.test.ts`
  - Tests publishing logic without a real database.

### Public Submission Flow

- Create: `src/app/submit-opportunity/page.tsx`
  - Authenticated user form for submitting course/job/event/deal opportunities.
- Create: `src/app/api/marketplace/submissions/route.ts`
  - `GET` returns the current user's submissions.
  - `POST` creates an organization when needed and creates a pending submission.
- Create: `src/__tests__/api/marketplace-submissions.test.ts`
  - Tests auth, validation, organization reuse, and submission creation.

### Admin Review Flow

- Create: `src/app/admin/submissions/page.tsx`
  - Admin review queue for pending submissions.
- Modify: `src/app/admin/layout.tsx`
  - Adds the Submissions nav item.
- Create: `src/app/api/admin/submissions/route.ts`
  - `GET` lists submissions.
  - `PATCH` approves, rejects, or sends a submission back to review.
- Create: `src/__tests__/api/admin-submissions.test.ts`
  - Tests admin authorization, filters, approve/publish, reject, and audit logging.

### Application Lifecycle

- Modify: `src/app/api/user/applications/route.ts`
  - Accepts richer status values and optional interview/offer fields.
- Modify: `src/app/applications/page.tsx`
  - Shows richer status options and summary buckets.
- Create: `src/__tests__/api/applications-lifecycle.test.ts`
  - Tests current-user-only status updates and validation.

### Positioning

- Modify: `src/components/home/AggregatorHero.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/pricing/page.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/lib/i18n/en.json`
- Modify: `src/lib/i18n/zh.json`
- Create: `src/__tests__/components/marketplace-positioning.test.tsx`

---

## Task 1: Public Marketplace Positioning

**Files:**
- Modify: `src/components/home/AggregatorHero.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/pricing/page.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/lib/i18n/en.json`
- Modify: `src/lib/i18n/zh.json`
- Test: `src/__tests__/components/marketplace-positioning.test.tsx`

- [ ] **Step 1: Write the failing hero positioning test**

Create `src/__tests__/components/marketplace-positioning.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AggregatorHero } from "@/components/home/AggregatorHero";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("marketplace positioning", () => {
  it("presents EDU Passport as an education opportunity marketplace", () => {
    render(<AggregatorHero />);

    expect(screen.getByText("Education Opportunity Marketplace")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Find education opportunities, then keep every next step moving.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Search courses, jobs, events, and partner deals, then save, apply, register, redeem, and track progress in one workspace.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Submit Opportunity" })).toHaveAttribute(
      "href",
      "/submit-opportunity",
    );
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- src/__tests__/components/marketplace-positioning.test.tsx
```

Expected: FAIL because `Education Opportunity Marketplace` and `Submit Opportunity` are not rendered yet.

- [ ] **Step 3: Update the hero copy and CTA**

In `src/components/home/AggregatorHero.tsx`, make these exact content changes:

```tsx
const verticals = [
  { key: "courses", label: "Courses", icon: GraduationCap, placeholder: "Search courses, certificates, training..." },
  { key: "jobs", label: "Jobs", icon: Briefcase, placeholder: "Search education jobs, internships, roles..." },
  { key: "events", label: "Events", icon: Calendar, placeholder: "Search conferences, workshops, webinars..." },
  { key: "deals", label: "Deals", icon: Tag, placeholder: "Search partner deals, discounts, tools..." },
] as const;
```

Replace the badge, heading, subtitle, and secondary CTA block with:

```tsx
<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
  <Sparkles className="h-4 w-4" />
  <span>Education Opportunity Marketplace</span>
</div>

<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-balance">
  Find education opportunities, then keep every next step moving.
</h1>
<p className="text-muted-foreground text-lg sm:text-xl mb-10 max-w-2xl mx-auto text-balance">
  Search courses, jobs, events, and partner deals, then save, apply, register, redeem, and track progress in one workspace.
</p>
```

Replace the CTA links with:

```tsx
<div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
  <Link href="/workspace">
    <Button size="lg" variant="outline" className="h-11 px-6">
      Open Workspace
    </Button>
  </Link>
  <Link href="/submit-opportunity">
    <Button size="lg" variant="ghost" className="h-11 px-6">
      Submit Opportunity
    </Button>
  </Link>
</div>
```

Replace popular searches with:

```tsx
{["Teaching jobs", "Career events", "Education discounts", "Certificate courses"].map((term) => (
  <button
    key={term}
    onClick={() => { setQuery(term); router.push(`/search?q=${encodeURIComponent(term)}`); }}
    className="text-sm text-primary hover:underline hover:text-primary/80 transition-colors"
  >
    {term}
  </button>
))}
```

- [ ] **Step 4: Update public homepage section copy**

In `src/app/page.tsx`, change the workspace section badge from `From discovery to done` to `Marketplace to workspace`.

Change the section heading to:

```tsx
<h2 className="text-2xl font-bold">Turn marketplace discovery into a focused opportunity workflow.</h2>
```

Change the paragraph to:

```tsx
<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
  Browse learning, career, event, and partner opportunities, then use Workspace to track priority, status, deadlines, applications, and reminders.
</p>
```

- [ ] **Step 5: Add the public submit link to the header**

In `src/components/layout/Header.tsx`, add one nav key:

```tsx
const navKeys = [
  { href: "/courses", key: "nav.courses" },
  { href: "/jobs", key: "nav.jobs" },
  { href: "/events", key: "nav.events" },
  { href: "/deals", key: "nav.deals" },
  { href: "/category", key: "nav.directory" },
  { href: "/submit-opportunity", key: "nav.submitOpportunity" },
];
```

Add these translation keys:

`src/lib/i18n/en.json`:

```json
"submitOpportunity": "Submit"
```

`src/lib/i18n/zh.json`:

```json
"submitOpportunity": "提交机会"
```

- [ ] **Step 6: Update pricing copy to include marketplace supply-side plans**

In `src/app/pricing/page.tsx`, keep the current Free and Pro cards, then add a small contact section below the two cards:

```tsx
<div className="mt-10 rounded-2xl border bg-muted/30 p-6 text-left max-w-4xl mx-auto">
  <p className="text-sm font-semibold">Business, school, and partner plans</p>
  <p className="mt-2 text-sm text-muted-foreground">
    Organizations can request posting, review, sponsored placement, and Deal Program access. EDU Passport activates these plans manually while the marketplace is being validated.
  </p>
  <a href="mailto:support@edupassport.me?subject=Marketplace%20Partner%20Plan" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
    Contact EDU Passport for organization access
  </a>
</div>
```

- [ ] **Step 7: Run the positioning test**

Run:

```bash
npm test -- src/__tests__/components/marketplace-positioning.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit Task 1**

```bash
git add src/components/home/AggregatorHero.tsx src/app/page.tsx src/app/pricing/page.tsx src/components/layout/Header.tsx src/lib/i18n/en.json src/lib/i18n/zh.json src/__tests__/components/marketplace-positioning.test.tsx
git commit -m "feat: reposition edu passport as opportunity marketplace"
```

---

## Task 2: Marketplace Data Model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/__tests__/schema/marketplace-schema.test.ts`

- [ ] **Step 1: Write the failing schema guard test**

Create `src/__tests__/schema/marketplace-schema.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");

describe("marketplace Prisma schema", () => {
  it("defines organization-backed listing submissions", () => {
    expect(schema).toContain("enum OrganizationType");
    expect(schema).toContain("model Organization");
    expect(schema).toContain("model ListingSubmission");
    expect(schema).toContain("model DealProgramApplication");
    expect(schema).toMatch(/organizations\s+Organization\[\]/);
    expect(schema).toMatch(/submissions\s+ListingSubmission\[\]/);
  });

  it("defines the richer application lifecycle fields", () => {
    expect(schema).toContain("under_review");
    expect(schema).toContain("interview_scheduled");
    expect(schema).toContain("offer_extended");
    expect(schema).toContain("offer_accepted");
    expect(schema).toContain("hired");
    expect(schema).toContain("interviewAt");
    expect(schema).toContain("meetingUrl");
    expect(schema).toContain("offerLetterUrl");
  });
});
```

- [ ] **Step 2: Run the schema test and verify it fails**

Run:

```bash
npm test -- src/__tests__/schema/marketplace-schema.test.ts
```

Expected: FAIL because the new models and lifecycle fields do not exist.

- [ ] **Step 3: Add AppUser relations**

In `prisma/schema.prisma`, inside `model AppUser`, after `learningProgress LearningProgress[]`, add:

```prisma
  organizations        Organization[]         @relation("OrganizationOwner")
  listingSubmissions   ListingSubmission[]    @relation("ListingSubmissionSubmitter")
  reviewedSubmissions  ListingSubmission[]    @relation("ListingSubmissionReviewer")
  dealProgramRequests  DealProgramApplication[] @relation("DealProgramSubmitter")
  reviewedDealPrograms DealProgramApplication[] @relation("DealProgramReviewer")
```

- [ ] **Step 4: Add Listing relation to published submissions**

Inside `model Listing`, after `learningProgress LearningProgress[]`, add:

```prisma
  sourceSubmission ListingSubmission? @relation("PublishedListingSubmission")
```

- [ ] **Step 5: Replace ApplicationStatus enum**

Replace the current `ApplicationStatus` enum with:

```prisma
enum ApplicationStatus {
  draft
  applied
  under_review
  shortlisted
  screening
  interview_scheduled
  interviewing
  decision_pending
  offer_extended
  offer_accepted
  hired
  rejected
  offer_declined
  withdrawn
  position_closed
}
```

- [ ] **Step 6: Add richer Application fields**

Inside `model Application`, after `resumeUrl String?`, add:

```prisma
  interviewAt       DateTime?
  interviewTimezone String?
  meetingUrl        String?
  employerNote      String?
  candidateNote     String?
  offerLetterUrl    String?
  contractUrl       String?
  withdrawnAt       DateTime?
```

- [ ] **Step 7: Add marketplace enums and models**

Append these models after `SavedListing` and before `SyncLog`:

```prisma
enum OrganizationType {
  school
  recruiter
  vendor
  partner
  employer
  other
}

enum OrganizationStatus {
  pending
  active
  suspended
  rejected
}

enum ListingSubmissionStatus {
  pending_review
  needs_changes
  approved
  rejected
  published
  archived
}

enum DealProgramStatus {
  pending
  approved
  rejected
  invited
  active
  suspended
}

model Organization {
  id          String             @id @default(cuid())
  name        String
  type        OrganizationType   @default(other)
  website     String?
  description String?
  status      OrganizationStatus @default(pending)
  verifiedAt  DateTime?
  ownerId     String
  owner       AppUser            @relation("OrganizationOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  submissions ListingSubmission[]
  dealProgramApplications DealProgramApplication[]
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@index([ownerId])
  @@index([type, status])
  @@index([createdAt])
}

model ListingSubmission {
  id          String                  @id @default(cuid())
  type        ListingType
  source      String                  @default("manual")
  title       String
  description String
  url         String
  image       String?
  companyName String?
  location    String?
  country     String?
  region      String?
  startDate   DateTime?
  endDate     DateTime?
  expiresAt   DateTime?
  priceLabel  String?
  couponCode  String?
  metadata    Json?
  status      ListingSubmissionStatus @default(pending_review)
  reviewNote  String?
  submittedById String
  submittedBy   AppUser              @relation("ListingSubmissionSubmitter", fields: [submittedById], references: [id], onDelete: Cascade)
  organizationId String?
  organization   Organization?        @relation(fields: [organizationId], references: [id], onDelete: SetNull)
  reviewedById   String?
  reviewedBy     AppUser?             @relation("ListingSubmissionReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  reviewedAt     DateTime?
  publishedListingId String?          @unique
  publishedListing   Listing?         @relation("PublishedListingSubmission", fields: [publishedListingId], references: [id], onDelete: SetNull)
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt

  @@index([submittedById])
  @@index([organizationId])
  @@index([type, status])
  @@index([createdAt])
}

model DealProgramApplication {
  id             String            @id @default(cuid())
  organizationId String
  organization   Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  submittedById  String
  submittedBy    AppUser           @relation("DealProgramSubmitter", fields: [submittedById], references: [id], onDelete: Cascade)
  contactName    String
  contactEmail   String
  proposedOffer  String
  targetAudience String?
  status         DealProgramStatus @default(pending)
  reviewNote     String?
  reviewedById   String?
  reviewedBy     AppUser?          @relation("DealProgramReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)
  reviewedAt     DateTime?
  invitationToken String?
  invitedAt       DateTime?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([organizationId])
  @@index([submittedById])
  @@index([status])
  @@index([createdAt])
}
```

- [ ] **Step 8: Generate and inspect the migration**

Run:

```bash
npm run db:migrate -- --name marketplace_foundation
```

Expected: Prisma creates a migration under `prisma/migrations/<timestamp>_marketplace_foundation/migration.sql`.

Inspect the migration:

```bash
sed -n '1,260p' prisma/migrations/*_marketplace_foundation/migration.sql
```

Expected: migration creates the new enums and tables, alters `ApplicationStatus`, adds Application fields, and adds foreign keys for `Organization`, `ListingSubmission`, and `DealProgramApplication`.

- [ ] **Step 9: Regenerate Prisma client**

Run:

```bash
npm run db:generate
```

Expected: command exits 0 and updates generated Prisma client.

- [ ] **Step 10: Run schema test**

Run:

```bash
npm test -- src/__tests__/schema/marketplace-schema.test.ts
```

Expected: PASS.

- [ ] **Step 11: Commit Task 2**

```bash
git add prisma/schema.prisma prisma/migrations src/__tests__/schema/marketplace-schema.test.ts
git commit -m "feat: add marketplace foundation schema"
```

---

## Task 3: Submission Validation Library

**Files:**
- Create: `src/lib/marketplace/submissions.ts`
- Test: `src/__tests__/lib/marketplace-submissions.test.ts`

- [ ] **Step 1: Write the failing validation tests**

Create `src/__tests__/lib/marketplace-submissions.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeListingSubmissionInput } from "@/lib/marketplace/submissions";

describe("normalizeListingSubmissionInput", () => {
  it("normalizes a valid job submission", () => {
    const result = normalizeListingSubmissionInput({
      type: "job",
      title: "  STEM Program Manager  ",
      description: "Lead STEM programming for high school students.",
      url: "https://example.org/jobs/stem-manager",
      organizationName: " Example School ",
      organizationType: "school",
      companyName: "Example School",
      location: "New York, NY",
      region: "NY",
      country: "US",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.title).toBe("STEM Program Manager");
    expect(result.data.type).toBe("job");
    expect(result.data.organizationName).toBe("Example School");
    expect(result.data.organizationType).toBe("school");
  });

  it("rejects unsupported opportunity types", () => {
    const result = normalizeListingSubmissionInput({
      type: "scholarship",
      title: "Scholarship",
      description: "A student award.",
      url: "https://example.org",
    });

    expect(result).toEqual({
      ok: false,
      error: "Opportunity type must be course, job, event, or deal.",
    });
  });

  it("rejects invalid URLs and short descriptions", () => {
    expect(normalizeListingSubmissionInput({
      type: "event",
      title: "Info night",
      description: "short",
      url: "not-a-url",
    })).toEqual({
      ok: false,
      error: "Description must be at least 20 characters.",
    });
  });
});
```

- [ ] **Step 2: Run the validation tests and verify they fail**

Run:

```bash
npm test -- src/__tests__/lib/marketplace-submissions.test.ts
```

Expected: FAIL because `src/lib/marketplace/submissions.ts` does not exist.

- [ ] **Step 3: Create the validation library**

Create `src/lib/marketplace/submissions.ts`:

```ts
const LISTING_TYPES = new Set(["course", "job", "event", "deal"]);
const ORGANIZATION_TYPES = new Set(["school", "recruiter", "vendor", "partner", "employer", "other"]);

export type NormalizedListingSubmission = {
  type: "course" | "job" | "event" | "deal";
  title: string;
  description: string;
  url: string;
  image?: string;
  organizationName?: string;
  organizationType: "school" | "recruiter" | "vendor" | "partner" | "employer" | "other";
  organizationWebsite?: string;
  companyName?: string;
  location?: string;
  country?: string;
  region?: string;
  startDate?: Date;
  endDate?: Date;
  expiresAt?: Date;
  priceLabel?: string;
  couponCode?: string;
};

type ParseResult =
  | { ok: true; data: NormalizedListingSubmission }
  | { ok: false; error: string };

function cleanString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return undefined;
  return cleaned.slice(0, maxLength);
}

function parseUrl(value: unknown, field: string): { ok: true; value?: string } | { ok: false; error: string } {
  const raw = cleanString(value, 500);
  if (!raw) return { ok: true };
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { ok: false, error: `${field} must be an http or https URL.` };
    }
    return { ok: true, value: url.toString() };
  } catch {
    return { ok: false, error: `${field} must be a valid URL.` };
  }
}

function parseDate(value: unknown, field: string): { ok: true; value?: Date } | { ok: false; error: string } {
  const raw = cleanString(value, 80);
  if (!raw) return { ok: true };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { ok: false, error: `${field} must be a valid date.` };
  return { ok: true, value: date };
}

export function normalizeListingSubmissionInput(input: Record<string, unknown>): ParseResult {
  const type = cleanString(input.type, 20);
  if (!type || !LISTING_TYPES.has(type)) {
    return { ok: false, error: "Opportunity type must be course, job, event, or deal." };
  }

  const title = cleanString(input.title, 160);
  if (!title || title.length < 4) return { ok: false, error: "Title must be at least 4 characters." };

  const description = cleanString(input.description, 3000);
  if (!description || description.length < 20) {
    return { ok: false, error: "Description must be at least 20 characters." };
  }

  const url = parseUrl(input.url, "URL");
  if (!url.ok) return url;
  if (!url.value) return { ok: false, error: "URL is required." };

  const image = parseUrl(input.image, "Image URL");
  if (!image.ok) return image;

  const organizationWebsite = parseUrl(input.organizationWebsite, "Organization website");
  if (!organizationWebsite.ok) return organizationWebsite;

  const startDate = parseDate(input.startDate, "Start date");
  if (!startDate.ok) return startDate;
  const endDate = parseDate(input.endDate, "End date");
  if (!endDate.ok) return endDate;
  const expiresAt = parseDate(input.expiresAt, "Expiration date");
  if (!expiresAt.ok) return expiresAt;

  const organizationTypeRaw = cleanString(input.organizationType, 40) || "other";
  const organizationType = ORGANIZATION_TYPES.has(organizationTypeRaw) ? organizationTypeRaw : "other";

  return {
    ok: true,
    data: {
      type: type as NormalizedListingSubmission["type"],
      title,
      description,
      url: url.value,
      ...(image.value && { image: image.value }),
      ...(cleanString(input.organizationName, 160) && { organizationName: cleanString(input.organizationName, 160) }),
      organizationType: organizationType as NormalizedListingSubmission["organizationType"],
      ...(organizationWebsite.value && { organizationWebsite: organizationWebsite.value }),
      ...(cleanString(input.companyName, 160) && { companyName: cleanString(input.companyName, 160) }),
      ...(cleanString(input.location, 160) && { location: cleanString(input.location, 160) }),
      ...(cleanString(input.country, 80) && { country: cleanString(input.country, 80) }),
      ...(cleanString(input.region, 80) && { region: cleanString(input.region, 80) }),
      ...(startDate.value && { startDate: startDate.value }),
      ...(endDate.value && { endDate: endDate.value }),
      ...(expiresAt.value && { expiresAt: expiresAt.value }),
      ...(cleanString(input.priceLabel, 120) && { priceLabel: cleanString(input.priceLabel, 120) }),
      ...(cleanString(input.couponCode, 80) && { couponCode: cleanString(input.couponCode, 80) }),
    },
  };
}
```

- [ ] **Step 4: Run the validation tests**

Run:

```bash
npm test -- src/__tests__/lib/marketplace-submissions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add src/lib/marketplace/submissions.ts src/__tests__/lib/marketplace-submissions.test.ts
git commit -m "feat: validate marketplace opportunity submissions"
```

---

## Task 4: Public Opportunity Submission API

**Files:**
- Create: `src/app/api/marketplace/submissions/route.ts`
- Test: `src/__tests__/api/marketplace-submissions.test.ts`

- [ ] **Step 1: Write the failing API tests**

Create `src/__tests__/api/marketplace-submissions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  organizationFindFirst: vi.fn(),
  organizationCreate: vi.fn(),
  listingSubmissionCreate: vi.fn(),
  listingSubmissionFindMany: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findFirst: mocks.organizationFindFirst,
      create: mocks.organizationCreate,
    },
    listingSubmission: {
      create: mocks.listingSubmissionCreate,
      findMany: mocks.listingSubmissionFindMany,
    },
  },
}));

import { GET, POST } from "@/app/api/marketplace/submissions/route";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/marketplace/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/marketplace/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    mocks.organizationFindFirst.mockResolvedValue(null);
    mocks.organizationCreate.mockResolvedValue({ id: "org_1", name: "Example School" });
    mocks.listingSubmissionCreate.mockResolvedValue({ id: "sub_1", status: "pending_review" });
  });

  it("rejects guests", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const res = await POST(postRequest({}));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("creates an organization and pending submission for the current user", async () => {
    const res = await POST(postRequest({
      type: "job",
      title: "STEM Program Manager",
      description: "Lead STEM programming for high school students.",
      url: "https://example.org/jobs/stem-manager",
      organizationName: "Example School",
      organizationType: "school",
    }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual({ submission: { id: "sub_1", status: "pending_review" } });
    expect(mocks.organizationCreate).toHaveBeenCalledWith({
      data: {
        name: "Example School",
        type: "school",
        website: null,
        ownerId: "user_1",
      },
    });
    expect(mocks.listingSubmissionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        submittedById: "user_1",
        organizationId: "org_1",
        type: "job",
        title: "STEM Program Manager",
        status: "pending_review",
      }),
      select: expect.objectContaining({ id: true, status: true }),
    });
  });

  it("lists only the current user's submissions", async () => {
    mocks.listingSubmissionFindMany.mockResolvedValue([{ id: "sub_1", title: "STEM Program Manager" }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.submissions).toHaveLength(1);
    expect(mocks.listingSubmissionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { submittedById: "user_1" },
    }));
  });
});
```

- [ ] **Step 2: Run the API tests and verify they fail**

Run:

```bash
npm test -- src/__tests__/api/marketplace-submissions.test.ts
```

Expected: FAIL because the API route does not exist.

- [ ] **Step 3: Create the route**

Create `src/app/api/marketplace/submissions/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeListingSubmissionInput } from "@/lib/marketplace/submissions";

async function getUserId() {
  const session = await getServerSession(authOptions);
  const id = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  return id && id !== "admin" ? id : null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submissions = await prisma.listingSubmission.findMany({
    where: { submittedById: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      reviewNote: true,
      createdAt: true,
      publishedListing: { select: { slug: true } },
      organization: { select: { name: true, type: true } },
    },
  });

  return NextResponse.json({ submissions });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const normalized = normalizeListingSubmissionInput(body as Record<string, unknown>);
  if (!normalized.ok) return NextResponse.json({ error: normalized.error }, { status: 400 });

  const data = normalized.data;
  let organizationId: string | null = null;

  if (data.organizationName) {
    const existing = await prisma.organization.findFirst({
      where: {
        ownerId: userId,
        name: data.organizationName,
      },
      select: { id: true },
    });

    const organization = existing ?? await prisma.organization.create({
      data: {
        name: data.organizationName,
        type: data.organizationType,
        website: data.organizationWebsite ?? null,
        ownerId: userId,
      },
    });
    organizationId = organization.id;
  }

  const submission = await prisma.listingSubmission.create({
    data: {
      submittedById: userId,
      organizationId,
      type: data.type,
      title: data.title,
      description: data.description,
      url: data.url,
      image: data.image ?? null,
      companyName: data.companyName ?? data.organizationName ?? null,
      location: data.location ?? null,
      country: data.country ?? null,
      region: data.region ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      expiresAt: data.expiresAt ?? null,
      priceLabel: data.priceLabel ?? null,
      couponCode: data.couponCode ?? null,
      metadata: { submittedFrom: "public_form" },
      status: "pending_review",
    },
    select: {
      id: true,
      status: true,
      title: true,
      type: true,
    },
  });

  return NextResponse.json({ submission }, { status: 201 });
}
```

- [ ] **Step 4: Run the API tests**

Run:

```bash
npm test -- src/__tests__/api/marketplace-submissions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/app/api/marketplace/submissions/route.ts src/__tests__/api/marketplace-submissions.test.ts
git commit -m "feat: add public marketplace submission api"
```

---

## Task 5: Public Opportunity Submission Page

**Files:**
- Create: `src/app/submit-opportunity/page.tsx`

- [ ] **Step 1: Create the page shell**

Create `src/app/submit-opportunity/page.tsx` as a client page that uses `useSession`, protects guests with a sign-in CTA, and posts to `/api/marketplace/submissions`.

Use this exact field set:

```ts
type FormState = {
  type: "course" | "job" | "event" | "deal";
  title: string;
  description: string;
  url: string;
  organizationName: string;
  organizationType: "school" | "recruiter" | "vendor" | "partner" | "employer" | "other";
  organizationWebsite: string;
  companyName: string;
  location: string;
  country: string;
  region: string;
  startDate: string;
  endDate: string;
  expiresAt: string;
  priceLabel: string;
  couponCode: string;
};
```

Initialize it with:

```ts
const initialForm: FormState = {
  type: "job",
  title: "",
  description: "",
  url: "",
  organizationName: "",
  organizationType: "other",
  organizationWebsite: "",
  companyName: "",
  location: "",
  country: "US",
  region: "",
  startDate: "",
  endDate: "",
  expiresAt: "",
  priceLabel: "",
  couponCode: "",
};
```

- [ ] **Step 2: Implement submit behavior**

Use this submit handler:

```tsx
const handleSubmit = async (event: React.FormEvent) => {
  event.preventDefault();
  setError(null);
  setSuccess(null);
  setSubmitting(true);

  const res = await fetch("/api/marketplace/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  const body = await res.json();
  setSubmitting(false);

  if (!res.ok) {
    setError(body.error || "Unable to submit opportunity.");
    return;
  }

  setSuccess("Your opportunity was submitted for EDU Passport review.");
  setForm(initialForm);
};
```

- [ ] **Step 3: Use existing UI controls**

Use imports:

```tsx
import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
```

The rendered page must include:

- Heading: `Submit an education opportunity`
- Subheading: `Jobs, events, courses, and partner deals are reviewed before they appear in the EDU Passport marketplace.`
- A type select with `course`, `job`, `event`, `deal`.
- Required inputs for `title`, `description`, and `url`.
- Organization section with `organizationName`, `organizationType`, and `organizationWebsite`.
- Optional detail fields for location, dates, expiration, price label, coupon code.
- Submit button text `Submit for review`.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit Task 5**

```bash
git add src/app/submit-opportunity/page.tsx
git commit -m "feat: add opportunity submission page"
```

---

## Task 6: Admin Submission Review and Publishing

**Files:**
- Create: `src/lib/marketplace/publish-submission.ts`
- Create: `src/app/api/admin/submissions/route.ts`
- Modify: `src/app/admin/layout.tsx`
- Create: `src/app/admin/submissions/page.tsx`
- Test: `src/__tests__/lib/publish-submission.test.ts`
- Test: `src/__tests__/api/admin-submissions.test.ts`

- [ ] **Step 1: Write the publishing helper test**

Create `src/__tests__/lib/publish-submission.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { buildListingDataFromSubmission, createListingSlug } from "@/lib/marketplace/publish-submission";

describe("publish submission helpers", () => {
  it("creates readable unique listing slugs", () => {
    expect(createListingSlug("STEM Program Manager", "sub_123")).toBe("stem-program-manager-sub-123");
  });

  it("maps a job submission into listing create data", () => {
    const data = buildListingDataFromSubmission({
      id: "sub_123",
      type: "job",
      title: "STEM Program Manager",
      description: "Lead STEM programming for high school students.",
      url: "https://example.org/jobs/stem-manager",
      image: null,
      companyName: "Example School",
      location: "New York, NY",
      country: "US",
      region: "NY",
      startDate: null,
      endDate: null,
      expiresAt: null,
      priceLabel: null,
      couponCode: null,
      metadata: { submittedFrom: "public_form" },
    }, "provider_1");

    expect(data).toMatchObject({
      title: "STEM Program Manager",
      slug: "stem-program-manager-sub-123",
      type: "job",
      url: "https://example.org/jobs/stem-manager",
      providerId: "provider_1",
      status: "active",
      verified: true,
      companyName: "Example School",
      location: "New York, NY",
      country: "US",
      region: "NY",
    });
  });
});
```

- [ ] **Step 2: Create the publishing helper**

Create `src/lib/marketplace/publish-submission.ts`:

```ts
import type { Prisma } from "@/generated/prisma/client";

type PublishableSubmission = {
  id: string;
  type: "course" | "job" | "event" | "deal";
  title: string;
  description: string;
  url: string;
  image: string | null;
  companyName: string | null;
  location: string | null;
  country: string | null;
  region: string | null;
  startDate: Date | null;
  endDate: Date | null;
  expiresAt: Date | null;
  priceLabel: string | null;
  couponCode: string | null;
  metadata: Prisma.JsonValue | null;
};

export function createListingSlug(title: string, submissionId: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return `${base || "opportunity"}-${submissionId.replace(/_/g, "-")}`;
}

export function buildListingDataFromSubmission(
  submission: PublishableSubmission,
  providerId: string,
): Prisma.ListingUncheckedCreateInput {
  return {
    title: submission.title,
    slug: createListingSlug(submission.title, submission.id),
    type: submission.type,
    description: submission.description,
    url: submission.url,
    image: submission.image,
    priceLabel: submission.priceLabel,
    location: submission.location,
    startDate: submission.startDate,
    endDate: submission.endDate,
    expiresAt: submission.expiresAt,
    companyName: submission.companyName,
    couponCode: submission.couponCode,
    country: submission.country,
    region: submission.region,
    metadata: submission.metadata === null ? undefined : submission.metadata as Prisma.InputJsonValue,
    providerId,
    status: "active",
    verified: true,
    publishedAt: new Date(),
    lastSeenAt: new Date(),
    qualityScore: 0.8,
  };
}
```

- [ ] **Step 3: Run publishing helper test**

Run:

```bash
npm test -- src/__tests__/lib/publish-submission.test.ts
```

Expected: PASS.

- [ ] **Step 4: Write admin API tests**

Create `src/__tests__/api/admin-submissions.test.ts` with the same mocking style as `src/__tests__/api/admin-listings.test.ts`. Cover these cases:

```ts
it("rejects non-admin users", async () => {
  mockRequireAdmin.mockResolvedValue(null);
  const res = await GET(new NextRequest("http://localhost/api/admin/submissions"));
  expect(res.status).toBe(401);
});

it("lists submissions by status and type", async () => {
  mockListingSubmissionFindMany.mockResolvedValue([{ id: "sub_1", status: "pending_review" }]);
  mockListingSubmissionCount.mockResolvedValue(1);
  const res = await GET(new NextRequest("http://localhost/api/admin/submissions?status=pending_review&type=job"));
  expect(res.status).toBe(200);
  expect(mockListingSubmissionFindMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { status: "pending_review", type: "job" },
  }));
});

it("rejects a submission with review note", async () => {
  mockListingSubmissionUpdate.mockResolvedValue({ id: "sub_1", status: "rejected" });
  const res = await PATCH(patchRequest({ id: "sub_1", action: "reject", reviewNote: "Missing official URL" }));
  expect(res.status).toBe(200);
  expect(mockListingSubmissionUpdate).toHaveBeenCalledWith(expect.objectContaining({
    where: { id: "sub_1" },
    data: expect.objectContaining({
      status: "rejected",
      reviewNote: "Missing official URL",
      reviewedAt: expect.any(Date),
    }),
  }));
});
```

The mocks must include:

```ts
mockRequireAdmin
mockAuditLog
mockListingSubmissionFindMany
mockListingSubmissionCount
mockListingSubmissionFindUnique
mockListingSubmissionUpdate
mockProviderUpsert
mockListingCreate
```

- [ ] **Step 5: Create admin submissions API**

Create `src/app/api/admin/submissions/route.ts` with:

- `GET`: requires `requireAdmin()`, supports `status`, `type`, `page`, `limit`, returns submissions, total, page, totalPages.
- `PATCH`: supports `approve`, `reject`, `needs_changes`, and `archive`.
- `approve`: loads submission, upserts manual provider, creates `Listing`, updates submission to `published`, stores `publishedListingId`, and writes audit log.
- `reject`: updates status to `rejected`, stores `reviewNote`, and writes audit log.
- `needs_changes`: updates status to `needs_changes`, stores `reviewNote`, and writes audit log.
- `archive`: updates status to `archived` and writes audit log.

Use this action guard:

```ts
const ACTIONS = ["approve", "reject", "needs_changes", "archive"] as const;
type Action = (typeof ACTIONS)[number];

function isAction(value: unknown): value is Action {
  return typeof value === "string" && ACTIONS.includes(value as Action);
}
```

Use this provider upsert in approve:

```ts
const provider = await prisma.provider.upsert({
  where: { slug: "manual-submissions" },
  update: { isActive: true },
  create: {
    name: "Manual Submissions",
    slug: "manual-submissions",
    url: "https://edupassport.me",
    description: "EDU Passport reviewed public and partner submissions.",
    apiType: "manual",
    isActive: true,
  },
  select: { id: true },
});
```

- [ ] **Step 6: Add admin navigation link**

In `src/app/admin/layout.tsx`, import `Inbox` from `lucide-react` and add this link after Dashboard:

```tsx
{ href: "/admin/submissions", label: "Submissions", icon: Inbox },
```

- [ ] **Step 7: Create admin submissions page**

Create `src/app/admin/submissions/page.tsx` as a client page that:

- Fetches `/api/admin/submissions?status=pending_review`.
- Renders a table with columns: Type, Title, Organization, Submitted, Status, Actions.
- Has filter buttons for `pending_review`, `needs_changes`, `rejected`, `published`.
- Calls `PATCH /api/admin/submissions` with `{ id, action: "approve" }` for approval.
- Prompts for review note before `reject` or `needs_changes`.
- Refetches the list after any successful action.

Use button labels:

- `Approve and publish`
- `Request changes`
- `Reject`

- [ ] **Step 8: Run admin tests**

Run:

```bash
npm test -- src/__tests__/lib/publish-submission.test.ts src/__tests__/api/admin-submissions.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 6**

```bash
git add src/lib/marketplace/publish-submission.ts src/app/api/admin/submissions/route.ts src/app/admin/layout.tsx src/app/admin/submissions/page.tsx src/__tests__/lib/publish-submission.test.ts src/__tests__/api/admin-submissions.test.ts
git commit -m "feat: add admin submission review workflow"
```

---

## Task 7: Jobs Application Lifecycle Upgrade

**Files:**
- Modify: `src/app/api/user/applications/route.ts`
- Modify: `src/app/applications/page.tsx`
- Test: `src/__tests__/api/applications-lifecycle.test.ts`

- [ ] **Step 1: Write the failing lifecycle API test**

Create `src/__tests__/api/applications-lifecycle.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  applicationUpdateMany: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    application: {
      updateMany: mocks.applicationUpdateMany,
    },
  },
}));

import { PATCH } from "@/app/api/user/applications/route";

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/user/applications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/user/applications lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    mocks.applicationUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("accepts detailed lifecycle statuses for the current user only", async () => {
    const res = await PATCH(patchRequest({
      applicationId: "app_1",
      status: "interview_scheduled",
      interviewAt: "2026-06-01T15:00:00.000Z",
      interviewTimezone: "America/New_York",
      meetingUrl: "https://meet.example.org/stem",
      candidateNote: "Prepare portfolio examples.",
    }));

    expect(res.status).toBe(200);
    expect(mocks.applicationUpdateMany).toHaveBeenCalledWith({
      where: { id: "app_1", userId: "user_1" },
      data: expect.objectContaining({
        status: "interview_scheduled",
        interviewAt: new Date("2026-06-01T15:00:00.000Z"),
        interviewTimezone: "America/New_York",
        meetingUrl: "https://meet.example.org/stem",
        candidateNote: "Prepare portfolio examples.",
      }),
    });
  });

  it("rejects unknown statuses", async () => {
    const res = await PATCH(patchRequest({ applicationId: "app_1", status: "waiting" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid status" });
  });
});
```

- [ ] **Step 2: Run lifecycle test and verify it fails**

Run:

```bash
npm test -- src/__tests__/api/applications-lifecycle.test.ts
```

Expected: FAIL because the current route only accepts the old status list and fields.

- [ ] **Step 3: Update application route statuses**

In `src/app/api/user/applications/route.ts`, replace `validStatuses` with:

```ts
const validStatuses = [
  "draft",
  "applied",
  "under_review",
  "shortlisted",
  "screening",
  "interview_scheduled",
  "interviewing",
  "decision_pending",
  "offer_extended",
  "offer_accepted",
  "hired",
  "rejected",
  "offer_declined",
  "withdrawn",
  "position_closed",
];
```

Parse optional fields:

```ts
const {
  applicationId,
  status,
  interviewAt,
  interviewTimezone,
  meetingUrl,
  employerNote,
  candidateNote,
  offerLetterUrl,
  contractUrl,
} = body as {
  applicationId?: string;
  status?: string;
  interviewAt?: string;
  interviewTimezone?: string;
  meetingUrl?: string;
  employerNote?: string;
  candidateNote?: string;
  offerLetterUrl?: string;
  contractUrl?: string;
};
```

Build update data:

```ts
const updateData: Record<string, unknown> = { status };
if (interviewAt !== undefined) updateData.interviewAt = interviewAt ? new Date(interviewAt) : null;
if (interviewTimezone !== undefined) updateData.interviewTimezone = interviewTimezone || null;
if (meetingUrl !== undefined) updateData.meetingUrl = meetingUrl || null;
if (employerNote !== undefined) updateData.employerNote = employerNote || null;
if (candidateNote !== undefined) updateData.candidateNote = candidateNote || null;
if (offerLetterUrl !== undefined) updateData.offerLetterUrl = offerLetterUrl || null;
if (contractUrl !== undefined) updateData.contractUrl = contractUrl || null;
if (status === "withdrawn") updateData.withdrawnAt = new Date();
```

Use `data: updateData` in `prisma.application.updateMany`.

- [ ] **Step 4: Update applications page status options**

In `src/app/applications/page.tsx`, replace the status arrays:

```tsx
const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  applied: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  under_review: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  shortlisted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  screening: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  interview_scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  interviewing: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  decision_pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  offer_extended: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  offer_accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  hired: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  offer_declined: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  withdrawn: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  position_closed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const applicationStatuses = [
  "draft",
  "applied",
  "under_review",
  "shortlisted",
  "screening",
  "interview_scheduled",
  "interviewing",
  "decision_pending",
  "offer_extended",
  "offer_accepted",
  "hired",
  "rejected",
  "offer_declined",
  "withdrawn",
  "position_closed",
];
```

Change status summary buckets to:

```tsx
{["applied", "under_review", "interview_scheduled", "offer_extended"].map((s) => (
```

Display labels with:

```tsx
{status.replace(/_/g, " ")}
```

- [ ] **Step 5: Run lifecycle tests**

Run:

```bash
npm test -- src/__tests__/api/applications-lifecycle.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 7**

```bash
git add src/app/api/user/applications/route.ts src/app/applications/page.tsx src/__tests__/api/applications-lifecycle.test.ts
git commit -m "feat: expand application lifecycle tracking"
```

---

## Task 8: Final Verification

**Files:**
- No source files unless verification exposes a defect.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- src/__tests__/components/marketplace-positioning.test.ts src/__tests__/schema/marketplace-schema.test.ts src/__tests__/lib/marketplace-submissions.test.ts src/__tests__/lib/publish-submission.test.ts src/__tests__/api/marketplace-submissions.test.ts src/__tests__/api/admin-submissions.test.ts src/__tests__/api/applications-lifecycle.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Verify migration deployment command locally**

Run:

```bash
npm run db:deploy
```

Expected: PASS against the configured local database. If the local database is not configured in this shell, run this command in the same deployment-like environment used for the current project.

- [ ] **Step 7: Commit verification fixes**

If verification required small fixes, commit them with explicit paths from `git status --short`. For example, if the final fix only touched the admin submission route:

```bash
git add src/app/api/admin/submissions/route.ts
git commit -m "fix: stabilize marketplace foundation verification"
```

If no files changed, do not create an empty commit. If different files changed, replace the example path with the exact changed paths shown by `git status --short`.

## Execution Notes

Use subagent-driven execution for this plan because the work has independent slices:

- Worker 1: Task 1 positioning.
- Worker 2: Task 2 schema.
- Worker 3: Tasks 3 and 4 validation/API.
- Worker 4: Tasks 6 admin review.
- Worker 5: Task 7 application lifecycle.

Workers are not alone in the codebase. Each worker must only edit the files owned by their task, must not revert edits from other workers, and must adjust their implementation to accommodate already-landed changes.

The integration owner should run Task 8 after all task branches or patches are merged into the current workspace.
