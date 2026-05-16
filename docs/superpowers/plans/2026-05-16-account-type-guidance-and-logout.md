# Account Type, Guidance, and Logout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix logout reliability, make registration collect a clear business identity, route signed-in users to the right workflow, and add a user guide page for validation.

**Architecture:** Keep `role` for authorization (`user | pro | admin`), keep `tier` for paid capability (`free | pro`), and add a separate `accountType` for product identity (`student | organization | partner`). UI entry points and marketplace APIs should use `accountType`; admin and Pro logic should keep using the existing fields.

**Tech Stack:** Next.js App Router, NextAuth JWT sessions, Prisma/Postgres, Vitest, React Testing Library.

---

### Task 1: Add Account Type Contract

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260516100000_add_app_user_account_type/migration.sql`
- Modify: `src/lib/auth.ts`
- Test: `src/__tests__/api/auth-login.test.ts`
- Test: `src/__tests__/api/register.test.ts`

- [ ] **Step 1: Write failing tests**

Add register expectations that `accountType: "organization"` is accepted and persisted, and invalid account types return `400`.

Add auth expectations that JWT refresh selects `role`, `tier`, `accountType`, and `banned`, and session exposes `accountType`.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -- src/__tests__/api/register.test.ts src/__tests__/api/auth-login.test.ts
```

Expected: tests fail because `accountType` is not read, persisted, or exposed in session.

- [ ] **Step 3: Implement schema and auth**

Use a Prisma enum:

```prisma
enum AccountType {
  student
  organization
  partner
}
```

Add to `AppUser`:

```prisma
accountType AccountType @default(student)
```

Migration:

```sql
CREATE TYPE "AccountType" AS ENUM ('student', 'organization', 'partner');
ALTER TABLE "AppUser" ADD COLUMN "accountType" "AccountType" NOT NULL DEFAULT 'student';
UPDATE "AppUser" SET "accountType" = 'partner' WHERE id IN (...partner-owned organizations or deal program submitters...);
UPDATE "AppUser" SET "accountType" = 'organization' WHERE "accountType" = 'student' AND id IN (...organization owners...);
```

Update auth `authorize`, `jwt`, and `session` callbacks to include `accountType`, defaulting old users to `student`.

- [ ] **Step 4: Run tests to verify GREEN**

Run:

```bash
npm test -- src/__tests__/api/register.test.ts src/__tests__/api/auth-login.test.ts
npx prisma validate
```

Expected: tests pass and schema validates.

### Task 2: Registration Identity Selection

**Files:**
- Modify: `src/app/auth/signup/page.tsx`
- Modify: `src/app/api/auth/register/route.ts`
- Test: `src/__tests__/api/register.test.ts`
- Test: `src/__tests__/components/signup-account-type.test.tsx`

- [ ] **Step 1: Write failing tests**

Add component coverage that signup shows exactly three account choices:

```text
Student
Organization
Partner
```

and submits selected `accountType` to `/api/auth/register`.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -- src/__tests__/api/register.test.ts src/__tests__/components/signup-account-type.test.tsx
```

Expected: component test fails because choices are missing; API test fails because `accountType` is ignored.

- [ ] **Step 3: Implement signup form**

Add a required account type selector with simple business copy:

```text
Student: Find, save, and track education opportunities.
Organization: Submit courses, jobs, and events for review.
Partner: Apply to publish student-facing deals.
```

Send `{ email, password, name, accountType }` to the register API.

- [ ] **Step 4: Run tests to verify GREEN**

Run:

```bash
npm test -- src/__tests__/api/register.test.ts src/__tests__/components/signup-account-type.test.tsx
```

Expected: tests pass.

### Task 3: Role-Aware Navigation and Access Guards

**Files:**
- Create: `src/lib/account-types.ts`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/app/business/page.tsx`
- Modify: `src/app/business/listings/page.tsx`
- Modify: `src/app/business/applications/page.tsx`
- Modify: `src/app/submit-opportunity/page.tsx`
- Modify: `src/app/deal-program/page.tsx`
- Modify: `src/app/api/marketplace/submissions/route.ts`
- Modify: `src/app/api/marketplace/deal-program/route.ts`
- Modify: `src/app/api/business/overview/route.ts`
- Modify: `src/app/api/business/listings/route.ts`
- Modify: `src/app/api/business/applications/route.ts`
- Test: `src/__tests__/components/header-account-type.test.tsx`
- Test: `src/__tests__/api/marketplace-submissions.test.ts`
- Test: `src/__tests__/api/deal-program.test.ts`
- Test: `src/__tests__/api/business-overview.test.ts`
- Test: `src/__tests__/api/business-applications.test.ts`

- [ ] **Step 1: Write failing tests**

Header should show student links only for `student`, business submission links only for `organization`, and Deal Program only for `partner`.

API tests should reject:

```text
student -> POST /api/marketplace/submissions
student -> POST /api/marketplace/deal-program
organization -> POST /api/marketplace/deal-program
partner -> non-deal POST /api/marketplace/submissions
```

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
npm test -- src/__tests__/components/header-account-type.test.tsx src/__tests__/api/marketplace-submissions.test.ts src/__tests__/api/deal-program.test.ts
```

Expected: tests fail because all users currently see all signed-in links and APIs only check authentication.

- [ ] **Step 3: Implement account helpers**

Add centralized helpers:

```ts
export type AccountType = "student" | "organization" | "partner";
export const ACCOUNT_TYPES = ["student", "organization", "partner"] as const;
export function isAccountType(value: unknown): value is AccountType;
export function getSessionAccountType(user: unknown): AccountType;
export function canUseBusinessWorkspace(accountType: AccountType): boolean;
export function canUseDealProgram(accountType: AccountType): boolean;
```

- [ ] **Step 4: Implement UI and API gates**

Header:

```text
student: Workspace, For You, Saved, Applications, Profile, Billing
organization: Business Workspace, Submit Opportunity, Business Listings, Business Applications, Profile
partner: Deal Program, Business Workspace, Profile
```

Marketplace, Deal Program, and Business APIs return `403` with clear messages when the account type is wrong.

- [ ] **Step 5: Run tests to verify GREEN**

Run:

```bash
npm test -- src/__tests__/components/header-account-type.test.tsx src/__tests__/api/marketplace-submissions.test.ts src/__tests__/api/deal-program.test.ts
```

Expected: tests pass.

### Task 4: Reliable Logout

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Test: `src/__tests__/components/header-session-provider.test.tsx`

- [ ] **Step 1: Write failing test**

Add a test that clicks the user menu and then Sign Out. It should assert:

```ts
expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/", redirect: true });
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
npm test -- src/__tests__/components/header-session-provider.test.tsx
```

Expected: test fails because current handler does not use the explicit redirect contract and does not handle pending state.

- [ ] **Step 3: Implement logout handler**

Use an async handler:

```ts
await signOut({ callbackUrl: "/", redirect: true });
```

Disable the sign out button while logout is pending and keep menu state deterministic.

- [ ] **Step 4: Run test to verify GREEN**

Run:

```bash
npm test -- src/__tests__/components/header-session-provider.test.tsx
```

Expected: test passes.

### Task 5: User Guide Page

**Files:**
- Create: `src/app/guide/page.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Footer.tsx`
- Test: `src/__tests__/components/user-guide-page.test.tsx`

- [ ] **Step 1: Write failing test**

Render the guide page and assert it contains sections for:

```text
Student guide
Organization guide
Partner guide
Admin guide
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
npm test -- src/__tests__/components/user-guide-page.test.tsx
```

Expected: test fails because `/guide` does not exist.

- [ ] **Step 3: Implement guide page**

Guide must be concise and verification-friendly:

```text
Student: sign up, verify email, complete profile, save opportunity, set next action, track status.
Organization: sign up as organization, submit opportunity, wait for admin review, manage listings/applications in Business Workspace.
Partner: sign up as partner, apply to Deal Program, wait for admin review, track application.
Admin: review submissions, organizations, deal program applications, users, and quality controls.
```

Add `Guide` to header/footer as a stable help entry.

- [ ] **Step 4: Run test to verify GREEN**

Run:

```bash
npm test -- src/__tests__/components/user-guide-page.test.tsx
```

Expected: test passes.

### Task 6: Full Verification

**Files:**
- No production file changes.

- [ ] **Step 1: Run focused tests**

```bash
npm test -- src/__tests__/api/register.test.ts src/__tests__/api/auth-login.test.ts src/__tests__/components/signup-account-type.test.tsx src/__tests__/components/header-account-type.test.tsx src/__tests__/components/header-session-provider.test.tsx src/__tests__/components/user-guide-page.test.tsx src/__tests__/api/marketplace-submissions.test.ts src/__tests__/api/deal-program.test.ts
```

- [ ] **Step 2: Run project verification**

```bash
npm run typecheck -- --pretty false
npm run lint
npm run build
```

- [ ] **Step 3: Browser verification**

Verify manually or with Playwright:

```text
Register as student -> menu shows student workspace only.
Register as organization -> menu shows business workflow only.
Register as partner -> menu shows Deal Program workflow only.
Sign out -> header returns to Sign In / Sign Up without manual refresh.
/guide -> explains all four workflows.
```
