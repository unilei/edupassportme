# Account Identity Model Design

## Goal

EDU Passport needs an account model that supports the broader education marketplace direction without locking the product into a student-only workflow.

The new model separates four concerns:

- `accountType`: what kind of actor this account represents in the platform.
- `profileType`: the user's more specific business identity.
- `role`: system authorization such as user or admin.
- `tier`: paid capability such as free or pro.

This keeps registration simple, makes access control predictable, and leaves room for old EDU Passport use cases such as learners, parents, educators, schools, employers, recruiters, vendors, and deal partners.

## Current Problem

The current `accountType` values are:

```ts
"student" | "organization" | "partner"
```

This solved the immediate problem of separating consumer, business, and deal workflows, but `student` is too narrow for the product. EDU Passport should not imply that all personal users are students. Personal users may be students, parents, educators, job seekers, career changers, or professionals learning new skills.

Using many narrow values directly as `accountType` would also be a mistake. A list such as `student | parent | educator | school | employer | recruiter | vendor | partner` would mix personal identities, organization types, and commercial relationships in one field. That would make navigation, API permissions, Pro rules, and admin filters difficult to maintain.

## Recommended Model

### Account Type

`accountType` should be a small, stable enum:

```ts
type AccountType = "individual" | "organization" | "partner";
```

`individual` means the account represents a person using EDU Passport for their own education, career, application, or planning workflow.

`organization` means the account represents an institution, company, school, employer, recruiter, course provider, event organizer, or similar entity that publishes and manages opportunities.

`partner` means the account represents a commercial or strategic partner that wants to publish deals, sponsorships, affiliate offers, scholarships, or campaigns.

### Individual Profile Type

Specific personal identity belongs in an individual profile field:

```ts
type IndividualProfileType =
  | "student"
  | "learner"
  | "parent"
  | "educator"
  | "job_seeker"
  | "career_changer"
  | "professional_learner";
```

These values should influence onboarding, recommendations, copy, and saved workspace defaults. They should not directly control broad platform permissions.

### Organization Profile Type

Specific business identity belongs in an organization profile field:

```ts
type OrganizationProfileType =
  | "school"
  | "university_program"
  | "employer"
  | "recruiter"
  | "course_provider"
  | "event_organizer"
  | "education_provider";
```

These values should influence submission forms, listing categories, business dashboard copy, review queues, and admin segmentation.

### Partner Profile Type

Specific partner identity belongs in a partner profile field:

```ts
type PartnerProfileType =
  | "deal_provider"
  | "sponsor"
  | "advertiser"
  | "affiliate_partner"
  | "scholarship_partner";
```

These values should influence Deal Program onboarding, campaign workflows, sponsored placement review, and partner reporting.

## Role and Tier

`role` remains a system authorization field:

```ts
type Role = "user" | "admin";
```

Admin access must not be modeled as an `accountType`. An admin may also have an account type, but admin privileges come from `role`.

`tier` remains a commercial capability field:

```ts
type Tier = "free" | "pro";
```

Pro should unlock limits and enhanced workflows inside the user's account type. It should not change the user's identity.

Examples:

- An `individual` Pro user can track more opportunities and use enhanced reminders.
- An `organization` Pro user can manage more listings or receive better applicant tools.
- A `partner` Pro or approved partner can access campaign reporting or priority placement.

## Product Workflows

### Guest

Guest users can browse public content, search opportunities, open listing detail pages, and read the user guide. They cannot save, track, submit, or manage opportunities.

### Individual

Individual users can use:

- Workspace
- For You
- Saved
- Applications
- Learning
- Notifications
- Profile
- Billing or Pro upgrade

Their onboarding should ask what best describes them and what they are trying to do. The first version should support student, learner, parent, educator, job seeker, career changer, and professional learner.

### Organization

Organization users can use:

- Business Workspace
- Submit Opportunity
- Business Listings
- Business Applications
- Organization profile

They should not see individual-only workspace navigation as primary workflow. If they personally want to save opportunities, that should be handled by a future account switching feature. The first implementation should keep the account focused on one primary account type.

### Partner

Partner users can use:

- Deal Program
- Partner profile
- Partner offers or campaigns
- Business-facing reporting where available

They should not use the general opportunity submission workflow unless the product explicitly creates a shared partner submission path in a future phase.

### Admin

Admin users can use:

- Admin dashboard
- User management
- Listing moderation
- Partner approval
- Manual Pro activation
- Quality control

Admin access is controlled by `role=admin`, not `accountType`.

## Registration and Onboarding

Registration should use a two-level identity flow.

Step 1: choose account type:

```text
Individual
Organization
Partner
```

Step 2: collect the specific profile type after email verification or first login.

Individual examples:

```text
Student
Learner
Parent
Educator
Job seeker
Career changer
Professional learner
```

Organization examples:

```text
School
University program
Employer
Recruiter
Course provider
Event organizer
Education provider
```

Partner examples:

```text
Deal provider
Sponsor
Advertiser
Affiliate partner
Scholarship partner
```

The registration page should explain account type in business terms:

- Individual: find, save, and track education and career opportunities.
- Organization: publish and manage education, hiring, course, and event opportunities.
- Partner: launch deals, sponsorships, scholarships, or campaigns for EDU Passport users.

## Access Control Rules

Access control should use centralized helpers instead of scattered string comparisons.

Recommended helper surface:

```ts
type AccountType = "individual" | "organization" | "partner";

function isAccountType(value: unknown): value is AccountType;
function normalizeAccountType(value: unknown): AccountType;
function getSessionAccountType(user: unknown): AccountType;

function canUseIndividualWorkspace(accountType: AccountType): boolean;
function canUseBusinessWorkspace(accountType: AccountType): boolean;
function canSubmitOpportunities(accountType: AccountType): boolean;
function canUseDealProgram(accountType: AccountType): boolean;
```

Rules:

```ts
canUseIndividualWorkspace("individual") === true;
canUseBusinessWorkspace("organization") === true;
canUseBusinessWorkspace("partner") === true;
canSubmitOpportunities("organization") === true;
canUseDealProgram("partner") === true;
```

All other combinations should be false unless a future product decision explicitly opens them.

## Migration Strategy

Existing `student` accounts should migrate to `individual`.

Existing `organization` accounts should remain `organization`.

Existing `partner` accounts should remain `partner`.

The first migration should only rename the broad account type. It should not try to infer detailed profile types from weak data. Detailed profile types should be collected through onboarding.

Recommended migration:

```sql
ALTER TYPE "AccountType" RENAME VALUE 'student' TO 'individual';
```

If the database provider or migration path does not safely support enum value rename, create a new enum, cast through text, and drop the old enum after the column is converted.

## API Contract

`POST /api/auth/register` should accept:

```json
{
  "email": "user@example.com",
  "password": "secret",
  "name": "Jane Doe",
  "accountType": "individual"
}
```

Invalid account types should return `400`.

Session user payload should include:

```ts
{
  id: string;
  email: string;
  role: "user" | "admin";
  tier: "free" | "pro";
  accountType: "individual" | "organization" | "partner";
}
```

Phase 2 profile APIs should store specific profile type and onboarding completion:

```ts
individualProfileType?: IndividualProfileType;
organizationProfileType?: OrganizationProfileType;
partnerProfileType?: PartnerProfileType;
onboardingCompletedAt?: string;
```

## Navigation

Public navigation should stay simple:

```text
Courses
Jobs
Events
Deals
Directory
Guide
```

Signed-in navigation should depend on account type:

Individual:

```text
Workspace
For You
Saved
Applications
Learning
Profile
Upgrade to Pro
Sign Out
```

Organization:

```text
Business
Submit
Listings
Applicants
Profile
Upgrade
Sign Out
```

Partner:

```text
Deal Program
Partner Profile
Business
Profile
Sign Out
```

Admin:

```text
Admin
Profile
Sign Out
```

Admin users may still see normal product navigation if they are testing the user experience, but admin access itself must remain role-based.

## User Guide Updates

The user guide should describe account identity clearly:

- Individual guide: for students, parents, educators, job seekers, and learners.
- Organization guide: for schools, employers, recruiters, course providers, and event organizers.
- Partner guide: for deal providers, sponsors, advertisers, affiliate partners, and scholarship partners.
- Admin guide: for moderation, approvals, Pro activation, and quality control.

This guide is part of the product, not just documentation. It should help users understand which account type to choose and help the team verify that routes and permissions match the product model.

## Testing Strategy

Unit and API tests should cover:

- register accepts `individual`, `organization`, and `partner`.
- register rejects unknown account types.
- old `student` values are migrated or normalized to `individual`.
- session exposes `accountType`.
- individual cannot submit organization listings.
- organization cannot apply to Deal Program.
- partner cannot use general opportunity submission unless explicitly allowed.
- admin access still uses `role=admin`.

Component tests should cover:

- signup shows Individual, Organization, and Partner.
- signed-in header shows the correct workflow for each account type.
- user guide explains all account types.
- protected pages show clear wrong-account messaging.

Regression tests should cover:

- logout still works without refresh.
- existing marketplace search and listing detail pages remain public.
- billing and Pro rules still use `tier`, not account type.
- admin users are not blocked by account type checks.

## Non-Goals

This change does not introduce formal student verification.

This change does not add Stripe or automated payment processing.

This change does not create multi-account switching in the first pass.

This change does not replace existing marketplace listing, provider sync, or admin moderation architecture.

This change does not attempt to automatically classify every existing user into a detailed profile type.

## Implementation Phases

Phase 1: rename `student` account type to `individual` across schema, auth, signup, navigation, API guards, tests, and guide copy.

Phase 2: add onboarding fields for detailed profile types without changing broad account permissions.

Phase 3: use profile type to improve recommendations, dashboard copy, submission forms, and admin segmentation.

Phase 4: introduce account switching only if the product needs one person to manage both individual and organization workflows from the same login.

## Success Criteria

The product no longer describes all personal users as students.

The registration page clearly separates individual, organization, and partner accounts.

Permissions remain simple and centralized.

The model can support the old EDU Passport audience breadth without making account-level access control messy.

All existing logout, signup, marketplace, business, deal program, guide, and admin tests continue to pass after implementation.
