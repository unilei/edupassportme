# Account Identity Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate EDU Passport from `student | organization | partner` account types to the broader `individual | organization | partner` model, while preserving permissions, logout behavior, business workflows, and production migration safety.

**Architecture:** Keep `accountType` as the broad product actor enum and rename `student` to `individual`. Keep `role` for admin authorization and `tier` for paid capability. Collect more specific identities in a separate profile/onboarding phase, not through broad account permissions.

**Tech Stack:** Next.js App Router, NextAuth JWT sessions, Prisma/Postgres, Vitest, React Testing Library, TypeScript.

---

## File Structure

- `prisma/schema.prisma`: rename enum value `student` to `individual` and update the `AppUser.accountType` default.
- `prisma/migrations/20260516110000_rename_student_account_type_to_individual/migration.sql`: production-safe enum migration.
- `src/lib/account-types.ts`: central account type contract, normalization, profile type constants, and access helpers.
- `src/lib/auth.ts`: session and JWT normalization should emit `individual` instead of `student`.
- `src/app/api/auth/register/route.ts`: accept `individual`, reject `student` on new registration, and keep existing validation centralized.
- `src/app/auth/signup/page.tsx`: replace Student option with Individual and update copy.
- `src/components/layout/Header.tsx`: use `individual` for the personal workflow menu.
- `src/components/auth/AccountTypeRequired.tsx`: no structural change expected, but tests should confirm it handles `individual`.
- `src/app/submit-opportunity/page.tsx`: wrong-account copy should mention individual accounts, not student accounts.
- `src/app/deal-program/page.tsx`: wrong-account copy should mention individual accounts, not student accounts.
- `src/app/guide/page.tsx`: rewrite guide sections around Individual, Organization, Partner, and Admin.
- `src/lib/i18n/en.json`: update any student-only account type labels if present.
- `src/lib/i18n/zh.json`: update any student-only account type labels if present.
- `src/__tests__/api/register.test.ts`: update accepted and rejected account type coverage.
- `src/__tests__/api/auth-login.test.ts`: ensure session normalization uses `individual`.
- `src/__tests__/components/signup-account-type.test.tsx`: update signup expectations.
- `src/__tests__/components/header-account-type.test.tsx`: update personal workflow expectations.
- `src/__tests__/components/user-guide-page.test.tsx`: update guide expectations.
- `src/__tests__/api/marketplace-submissions.test.ts`: update wrong-account tests from `student` to `individual`.
- `src/__tests__/api/deal-program.test.ts`: update wrong-account tests from `student` to `individual`.
- `src/__tests__/api/business-overview.test.ts`: update wrong-account tests from `student` to `individual`.
- `src/__tests__/api/business-applications.test.ts`: update wrong-account tests from `student` to `individual`.

---

### Task 1: Lock the Account Type Contract in Tests

**Files:**
- Modify: `src/__tests__/api/register.test.ts`
- Modify: `src/__tests__/components/signup-account-type.test.tsx`
- Modify: `src/__tests__/components/header-account-type.test.tsx`

- [ ] **Step 1: Update register tests for the new accepted value**

In `src/__tests__/api/register.test.ts`, add or update a success case so the API accepts `individual`:

```ts
it("should create an individual user and return 201 on success", async () => {
  mockFindUnique.mockResolvedValue(null);
  mockCreate.mockResolvedValue({
    id: "new-user-id",
    email: "new@test.com",
    name: "Test User",
    accountType: "individual",
  });

  const res = await POST(makeRequest({
    email: "new@test.com",
    password: "123456",
    name: "Test User",
    accountType: "individual",
  }));
  const body = await res.json();

  expect(res.status).toBe(201);
  expect(body.user.email).toBe("new@test.com");
  expect(body.user.accountType).toBe("individual");
  expect(body.requiresVerification).toBe(true);
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({
      accountType: "individual",
    }),
  }));
});
```

- [ ] **Step 2: Add a register test that rejects the old public value**

In `src/__tests__/api/register.test.ts`, add:

```ts
it("should reject the retired student account type for new registrations", async () => {
  mockFindUnique.mockResolvedValue(null);

  const res = await POST(makeRequest({
    email: "new@test.com",
    password: "123456",
    accountType: "student",
  }));
  const body = await res.json();

  expect(res.status).toBe(400);
  expect(body.error).toBe("Choose a valid account type.");
  expect(mockCreate).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Update signup component expectations**

In `src/__tests__/components/signup-account-type.test.tsx`, replace the current Student assertion with Individual:

```ts
expect(screen.getByRole("radio", { name: /Individual/i })).toBeChecked();
expect(screen.queryByRole("radio", { name: /Student/i })).not.toBeInTheDocument();
expect(screen.getByRole("radio", { name: /Organization/i })).toBeInTheDocument();
expect(screen.getByRole("radio", { name: /Partner/i })).toBeInTheDocument();
```

Keep the Organization selection path and assert the submitted payload still sends:

```ts
accountType: "organization",
```

- [ ] **Step 4: Update header component test type literals**

In `src/__tests__/components/header-account-type.test.tsx`, change the helper signature to:

```ts
function renderHeader(accountType: "individual" | "organization" | "partner") {
```

Rename the first test to:

```ts
it("shows individual workflow links only for individual accounts", async () => {
  renderHeader("individual");
```

Keep the expected individual menu labels:

```ts
expect(within(menu).getByText("Workspace")).toBeInTheDocument();
expect(within(menu).getByText("For You")).toBeInTheDocument();
expect(within(menu).getByText("Saved")).toBeInTheDocument();
expect(within(menu).queryByText("Business")).not.toBeInTheDocument();
expect(within(menu).queryByText("Submit")).not.toBeInTheDocument();
expect(within(menu).queryByText("Deal Program")).not.toBeInTheDocument();
```

- [ ] **Step 5: Run focused tests and confirm RED**

Run:

```bash
npm test -- src/__tests__/api/register.test.ts src/__tests__/components/signup-account-type.test.tsx src/__tests__/components/header-account-type.test.tsx
```

Expected result before implementation: failures showing `individual` is not accepted and the signup/header UI still uses `student`.

---

### Task 2: Migrate Prisma AccountType Safely

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260516110000_rename_student_account_type_to_individual/migration.sql`

- [ ] **Step 1: Update Prisma enum and default**

In `prisma/schema.prisma`, replace:

```prisma
enum AccountType {
  student
  organization
  partner
}
```

with:

```prisma
enum AccountType {
  individual
  organization
  partner
}
```

Replace:

```prisma
accountType          AccountType              @default(student)
```

with:

```prisma
accountType          AccountType              @default(individual)
```

- [ ] **Step 2: Add production-safe migration SQL**

Create `prisma/migrations/20260516110000_rename_student_account_type_to_individual/migration.sql`:

```sql
ALTER TYPE "AccountType" RENAME VALUE 'student' TO 'individual';
ALTER TABLE "AppUser" ALTER COLUMN "accountType" SET DEFAULT 'individual';
```

This migration is correct for PostgreSQL enum rename semantics and preserves existing rows by renaming the enum value in place.

- [ ] **Step 3: Regenerate Prisma client**

Run:

```bash
npm run db:generate
```

Expected result: Prisma client generation completes without schema errors.

- [ ] **Step 4: Validate Prisma schema**

Run:

```bash
npx prisma validate
```

Expected result: `The schema at prisma/schema.prisma is valid`.

---

### Task 3: Update Central Account Helpers

**Files:**
- Modify: `src/lib/account-types.ts`
- Test: `src/__tests__/api/register.test.ts`
- Test: `src/__tests__/components/header-account-type.test.tsx`

- [ ] **Step 1: Replace broad account values**

Update `src/lib/account-types.ts` to:

```ts
export const ACCOUNT_TYPES = ["individual", "organization", "partner"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const INDIVIDUAL_PROFILE_TYPES = [
  "student",
  "learner",
  "parent",
  "educator",
  "job_seeker",
  "career_changer",
  "professional_learner",
] as const;

export type IndividualProfileType = (typeof INDIVIDUAL_PROFILE_TYPES)[number];

export const ORGANIZATION_PROFILE_TYPES = [
  "school",
  "university_program",
  "employer",
  "recruiter",
  "course_provider",
  "event_organizer",
  "education_provider",
] as const;

export type OrganizationProfileType = (typeof ORGANIZATION_PROFILE_TYPES)[number];

export const PARTNER_PROFILE_TYPES = [
  "deal_provider",
  "sponsor",
  "advertiser",
  "affiliate_partner",
  "scholarship_partner",
] as const;

export type PartnerProfileType = (typeof PARTNER_PROFILE_TYPES)[number];

export function isAccountType(value: unknown): value is AccountType {
  return typeof value === "string" && (ACCOUNT_TYPES as readonly string[]).includes(value);
}

export function normalizeAccountType(value: unknown): AccountType {
  if (value === "student") return "individual";
  return isAccountType(value) ? value : "individual";
}

export function isPublicRegistrationAccountType(value: unknown): value is AccountType {
  return isAccountType(value);
}

export function getSessionAccountType(user: unknown): AccountType {
  if (!user || typeof user !== "object") return "individual";
  return normalizeAccountType((user as Record<string, unknown>).accountType);
}

export function canUseIndividualWorkspace(accountType: AccountType) {
  return accountType === "individual";
}

export function canUseBusinessWorkspace(accountType: AccountType) {
  return accountType === "organization" || accountType === "partner";
}

export function canSubmitOpportunities(accountType: AccountType) {
  return accountType === "organization";
}

export function canUseDealProgram(accountType: AccountType) {
  return accountType === "partner";
}
```

This keeps legacy session normalization safe while preventing new public registrations from using `student`.

- [ ] **Step 2: Run helper-dependent focused tests**

Run:

```bash
npm test -- src/__tests__/api/register.test.ts src/__tests__/components/header-account-type.test.tsx
```

Expected result at this point: register may still fail until the register API uses `isPublicRegistrationAccountType`; header may still fail until UI code is updated.

---

### Task 4: Update Register API and Auth Session Normalization

**Files:**
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/lib/auth.ts`
- Test: `src/__tests__/api/register.test.ts`
- Test: `src/__tests__/api/auth-login.test.ts`

- [ ] **Step 1: Use public registration validation**

In `src/app/api/auth/register/route.ts`, replace:

```ts
import { isAccountType, normalizeAccountType } from "@/lib/account-types";
```

with:

```ts
import { isPublicRegistrationAccountType, normalizeAccountType } from "@/lib/account-types";
```

Replace:

```ts
if (accountType !== undefined && !isAccountType(accountType)) {
```

with:

```ts
if (accountType !== undefined && !isPublicRegistrationAccountType(accountType)) {
```

The default path should continue to use:

```ts
accountType: normalizeAccountType(accountType),
```

so missing account type becomes `individual`.

- [ ] **Step 2: Update test fixtures in auth tests**

In `src/__tests__/api/auth-login.test.ts`, replace user/session fixtures that use:

```ts
accountType: "student",
```

with:

```ts
accountType: "individual",
```

If the test covers legacy values, add a focused assertion that `normalizeAccountType("student")` produces `individual` through the session callback.

- [ ] **Step 3: Update explicit fallback values in auth implementation**

In `src/lib/auth.ts`, replace any literal fallback:

```ts
accountType: "student"
```

with:

```ts
accountType: "individual"
```

Keep all calls to `normalizeAccountType(...)`; that helper handles old JWT/database values safely.

- [ ] **Step 4: Run API/auth tests**

Run:

```bash
npm test -- src/__tests__/api/register.test.ts src/__tests__/api/auth-login.test.ts
```

Expected result: both test files pass.

---

### Task 5: Update Signup UI and Identity Copy

**Files:**
- Modify: `src/app/auth/signup/page.tsx`
- Test: `src/__tests__/components/signup-account-type.test.tsx`

- [ ] **Step 1: Update imports and icons if needed**

Keep the existing icon set. `GraduationCap` can still represent education, but the option label must not be Student.

- [ ] **Step 2: Replace the first signup account option**

In `src/app/auth/signup/page.tsx`, replace:

```ts
{
  value: "student",
  label: "Student",
  description: "Discover, save, and track education opportunities.",
  icon: GraduationCap,
},
```

with:

```ts
{
  value: "individual",
  label: "Individual",
  description: "Find, save, and track education and career opportunities.",
  icon: GraduationCap,
},
```

- [ ] **Step 3: Update the default state**

Replace:

```ts
const [accountType, setAccountType] = useState<AccountType>("student");
```

with:

```ts
const [accountType, setAccountType] = useState<AccountType>("individual");
```

- [ ] **Step 4: Update benefit copy**

Replace student-only benefit copy with broader personal-account copy:

```tsx
<p className="text-sm font-medium mb-1">Why join EDU Passport?</p>
<ul className="text-xs text-muted-foreground space-y-1">
  <li>Save and organize education and career opportunities</li>
  <li>Get personalized recommendations based on your goals</li>
  <li>Track applications, learning, and next steps</li>
  <li>Use one workspace for courses, jobs, events, and deals</li>
</ul>
```

- [ ] **Step 5: Run signup component test**

Run:

```bash
npm test -- src/__tests__/components/signup-account-type.test.tsx
```

Expected result: signup test passes and submitted selected values remain correct.

---

### Task 6: Update Navigation and Route Guards

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/app/submit-opportunity/page.tsx`
- Modify: `src/app/deal-program/page.tsx`
- Modify: `src/app/business/page.tsx`
- Modify: `src/app/business/listings/page.tsx`
- Modify: `src/app/business/applications/page.tsx`
- Test: `src/__tests__/components/header-account-type.test.tsx`

- [ ] **Step 1: Update header individual branch**

In `src/components/layout/Header.tsx`, the fallback branch can remain the individual menu, but any account-type comparison must use `individual`, `organization`, and `partner`.

Use this branching shape:

```ts
const menuLinks = accountType === "organization"
  ? [
      { href: "/business", label: t("nav.business"), icon: Building2, color: "text-emerald-600" },
      { href: "/submit-opportunity", label: t("nav.submitOpportunity"), icon: Send, color: "text-amber-600" },
      { href: "/business/listings", label: "Listings", icon: FileText, color: "text-blue-500" },
      { href: "/business/applications", label: "Applicants", icon: User, color: "text-purple-500" },
    ]
  : accountType === "partner"
    ? [
        { href: "/deal-program", label: t("nav.dealProgram"), icon: Handshake, color: "text-emerald-600" },
        { href: "/business", label: t("nav.business"), icon: Building2, color: "text-blue-500" },
      ]
    : [
        { href: "/workspace", label: t("nav.workspace"), icon: Target, color: "text-primary" },
        { href: "/for-you", label: t("nav.forYou"), icon: Sparkles, color: "text-purple-500" },
        { href: "/saved", label: t("nav.saved"), icon: Heart, color: "text-red-500" },
        { href: "/applications", label: t("nav.applications"), icon: FileText, color: "text-blue-500" },
      ];
```

- [ ] **Step 2: Update route guard allowed lists**

In business pages, keep:

```tsx
allowed={["organization", "partner"]}
```

In submit opportunity page, keep organization-only behavior:

```ts
if (!canSubmitOpportunities(accountType)) {
```

In deal program page, keep partner-only behavior:

```ts
const dealProgramAllowed = canUseDealProgram(accountType);
```

- [ ] **Step 3: Update wrong-account copy**

Where copy says student accounts, replace with individual accounts.

Use these messages where applicable:

```text
Individual accounts are for finding, saving, and tracking opportunities. Use an organization account to submit listings.
```

```text
Individual and organization accounts cannot apply to the Deal Program. Use a partner account for deals, sponsorships, and campaigns.
```

- [ ] **Step 4: Run header test**

Run:

```bash
npm test -- src/__tests__/components/header-account-type.test.tsx
```

Expected result: header test passes for `individual`, `organization`, and `partner`.

---

### Task 7: Update API Permission Tests and Guards

**Files:**
- Modify: `src/app/api/marketplace/submissions/route.ts`
- Modify: `src/app/api/marketplace/deal-program/route.ts`
- Modify: `src/app/api/business/overview/route.ts`
- Modify: `src/app/api/business/listings/route.ts`
- Modify: `src/app/api/business/applications/route.ts`
- Modify: `src/__tests__/api/marketplace-submissions.test.ts`
- Modify: `src/__tests__/api/deal-program.test.ts`
- Modify: `src/__tests__/api/business-overview.test.ts`
- Modify: `src/__tests__/api/business-applications.test.ts`

- [ ] **Step 1: Update API tests from student to individual**

In the listed API test files, replace wrong-account fixtures:

```ts
accountType: "student",
```

with:

```ts
accountType: "individual",
```

Rename test descriptions from student to individual.

- [ ] **Step 2: Update API error copy**

In `src/app/api/marketplace/submissions/route.ts`, keep the partner-specific message and use individual wording for the default wrong-account response:

```ts
const error = user.accountType === "partner"
  ? "Use the Deal Program workflow for partner offers."
  : "Use an organization account to submit marketplace opportunities.";
```

In `src/app/api/marketplace/deal-program/route.ts`, keep:

```ts
return NextResponse.json(
  { error: "Use a partner account to apply for the Deal Program." },
  { status: 403 },
);
```

Business API routes should continue returning:

```ts
return NextResponse.json({ error: "Business account required" }, { status: 403 });
```

- [ ] **Step 3: Run API permission tests**

Run:

```bash
npm test -- src/__tests__/api/marketplace-submissions.test.ts src/__tests__/api/deal-program.test.ts src/__tests__/api/business-overview.test.ts src/__tests__/api/business-applications.test.ts
```

Expected result: all permission tests pass.

---

### Task 8: Update User Guide and I18n Copy

**Files:**
- Modify: `src/app/guide/page.tsx`
- Modify: `src/lib/i18n/en.json`
- Modify: `src/lib/i18n/zh.json`
- Modify: `src/__tests__/components/user-guide-page.test.tsx`

- [ ] **Step 1: Update guide headings**

In `src/app/guide/page.tsx`, ensure the page contains these sections:

```text
Individual guide
Organization guide
Partner guide
Admin guide
```

The Individual guide should explicitly mention:

```text
Students, parents, educators, job seekers, and lifelong learners can use one workspace to save opportunities, track applications, and manage next steps.
```

- [ ] **Step 2: Update guide test expectations**

In `src/__tests__/components/user-guide-page.test.tsx`, assert:

```ts
expect(screen.getByRole("heading", { name: /Individual guide/i })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /Organization guide/i })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /Partner guide/i })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: /Admin guide/i })).toBeInTheDocument();
expect(screen.getByText(/students, parents, educators, job seekers/i)).toBeInTheDocument();
```

- [ ] **Step 3: Update translations if account labels exist**

In `src/lib/i18n/en.json`, use:

```json
"account.individual": "Individual"
```

In `src/lib/i18n/zh.json`, use:

```json
"account.individual": "个人"
```

Only add these keys if the file already has account label keys or the implementation needs them. Do not create unused translation keys.

- [ ] **Step 4: Run guide test**

Run:

```bash
npm test -- src/__tests__/components/user-guide-page.test.tsx
```

Expected result: guide test passes.

---

### Task 9: Run Full Local Verification

**Files:**
- No source edits in this task.

- [ ] **Step 1: Run focused account identity suite**

Run:

```bash
npm test -- src/__tests__/api/register.test.ts src/__tests__/api/auth-login.test.ts src/__tests__/components/signup-account-type.test.tsx src/__tests__/components/header-account-type.test.tsx src/__tests__/components/user-guide-page.test.tsx src/__tests__/api/marketplace-submissions.test.ts src/__tests__/api/deal-program.test.ts src/__tests__/api/business-overview.test.ts src/__tests__/api/business-applications.test.ts
```

Expected result: all focused tests pass.

- [ ] **Step 2: Run full unit/API test suite**

Run:

```bash
npm test
```

Expected result: all tests pass.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected result: TypeScript completes without errors.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected result: lint passes. Existing generated coverage warnings can be reported if they remain unchanged.

- [ ] **Step 5: Run production build**

Run:

```bash
npm run build
```

Expected result: Next.js production build completes.

- [ ] **Step 6: Check whitespace**

Run:

```bash
git diff --check
```

Expected result: no whitespace errors.

---

### Task 10: Local Browser Verification

**Files:**
- No source edits in this task.

- [ ] **Step 1: Start local dev server**

Run:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Expected result: app serves at `http://127.0.0.1:3000`.

- [ ] **Step 2: Verify signup page**

Open:

```text
http://127.0.0.1:3000/auth/signup
```

Expected UI:

```text
Individual
Organization
Partner
```

The page should not show Student as a top-level account type.

- [ ] **Step 3: Verify guide page**

Open:

```text
http://127.0.0.1:3000/guide
```

Expected UI:

```text
Individual guide
Organization guide
Partner guide
Admin guide
```

- [ ] **Step 4: Verify signed-in menus with disposable local users**

Create or reuse local verified users with:

```text
individual@example.test -> accountType individual
organization@example.test -> accountType organization
partner@example.test -> accountType partner
```

Expected menus:

```text
individual: Workspace, For You, Saved, Applications
organization: Business, Submit, Listings, Applicants
partner: Deal Program, Business
```

Sign out after each user and verify the header returns to Sign In without a manual refresh.

- [ ] **Step 5: Stop local dev server**

Stop the process started in Step 1 with Ctrl-C or `kill -TERM <pid>`.

Expected result: no lingering local dev process is needed for final handoff.

---

### Task 11: Migration and Deployment Verification

**Files:**
- No source edits in this task.

- [ ] **Step 1: Apply local migration**

Run against the local development database:

```bash
npx prisma migrate deploy
```

Expected result:

```text
Applying migration 20260516110000_rename_student_account_type_to_individual
All migrations have been successfully applied.
```

- [ ] **Step 2: Confirm migration status**

Run:

```bash
npx prisma migrate status
```

Expected result:

```text
Database schema is up to date!
```

- [ ] **Step 3: Commit implementation**

Run:

```bash
git status --short
git add prisma/schema.prisma prisma/migrations/20260516110000_rename_student_account_type_to_individual/migration.sql src/lib/account-types.ts src/lib/auth.ts src/app/api/auth/register/route.ts src/app/auth/signup/page.tsx src/components/layout/Header.tsx src/components/auth/AccountTypeRequired.tsx src/app/submit-opportunity/page.tsx src/app/deal-program/page.tsx src/app/business/page.tsx src/app/business/listings/page.tsx src/app/business/applications/page.tsx src/app/api/marketplace/submissions/route.ts src/app/api/marketplace/deal-program/route.ts src/app/api/business/overview/route.ts src/app/api/business/listings/route.ts src/app/api/business/applications/route.ts src/app/guide/page.tsx src/lib/i18n/en.json src/lib/i18n/zh.json src/__tests__/api/register.test.ts src/__tests__/api/auth-login.test.ts src/__tests__/components/signup-account-type.test.tsx src/__tests__/components/header-account-type.test.tsx src/__tests__/components/user-guide-page.test.tsx src/__tests__/api/marketplace-submissions.test.ts src/__tests__/api/deal-program.test.ts src/__tests__/api/business-overview.test.ts src/__tests__/api/business-applications.test.ts
git commit -m "feat: migrate account type to individual model"
```

Expected result: implementation commit succeeds. Do not stage unrelated untracked screenshots.

- [ ] **Step 4: Push and watch CI when the user approves deployment**

Run:

```bash
git push origin main
```

Expected result: GitHub Actions start for the pushed commit and all required jobs pass.

- [ ] **Step 5: Confirm production migration after deploy**

Use GitHub Actions logs or server deploy logs to confirm:

```text
Running Prisma migrations
Applying migration 20260516110000_rename_student_account_type_to_individual
App health check passed
```

- [ ] **Step 6: Verify production pages**

Run:

```bash
curl -L -s https://edupassport.me/auth/signup | rg "Individual|Organization|Partner"
curl -L -s https://edupassport.me/guide | rg "Individual guide|Organization guide|Partner guide|Admin guide"
curl -L -s -o /tmp/edupassport-health.out -w "%{http_code}" https://edupassport.me/api/health
```

Expected result:

```text
signup command finds Individual, Organization, Partner
guide command finds all four guide headings
health command prints 200
```

---

## Self-Review Checklist

- [x] The plan implements the confirmed design: `individual | organization | partner`.
- [x] The plan keeps admin as `role`, not `accountType`.
- [x] The plan keeps Pro as `tier`, not `accountType`.
- [x] The plan rejects `student` for new registrations while safely normalizing legacy values.
- [x] The plan includes schema, API, UI, guide, tests, migration, browser verification, and deployment verification.
- [x] The plan explicitly avoids staging unrelated untracked screenshots.
