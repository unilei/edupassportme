# User System Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the EDU Passport user system from a feature-complete prototype to a production-ready account, profile, billing, admin, and authenticated-user experience.

**Architecture:** Keep the existing Next.js App Router, NextAuth credentials flow, Prisma models, and route-handler style. Make targeted fixes around trust boundaries: verified user state, admin-only access, paid tier source of truth, and authenticated page behavior. Avoid broad UI redesigns and keep changes aligned with current components and layout.

**Tech Stack:** Next.js 16 App Router, NextAuth v4 credentials provider, Prisma 7 PostgreSQL client, admin-managed manual Pro activation with optional future Stripe subscriptions, Nodemailer SMTP, Vitest, Playwright.

---

## Completion Target

Current completion estimate: about 70%.

Target after this plan: 85%+ for production readiness, with known external dependencies limited to SMTP configuration and the manual payment/Pro activation operating process.

## Module Breakdown

### Module A: Auth, Email Verification, and Password Recovery

**Owned files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/app/auth/signup/page.tsx`
- Modify: `src/app/auth/signin/page.tsx`
- Modify: `src/app/auth/verify/page.tsx`
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/app/api/auth/verify/route.ts`
- Modify: `src/app/api/auth/forgot-password/route.ts`
- Modify: `src/app/api/auth/reset-password/route.ts`
- Create if needed: `src/app/api/auth/resend-verification/route.ts`
- Test: `src/__tests__/api/register.test.ts`
- Test: create/update auth API tests for verify, resend, reset

**Requirements:**
- [ ] Registration must create the user and verification token, then show a "check email" success state instead of automatically signing in.
- [ ] Login must reject unverified accounts with a clear machine-readable error and user-facing message.
- [ ] Banned users must still be rejected.
- [ ] Verification must be idempotent enough for UX: expired or invalid token returns clear errors; successful verification creates welcome notification.
- [ ] Add resend verification API for unverified accounts, using the same token creation flow.
- [ ] Keep password reset enumeration-safe for unknown emails.
- [ ] Add tests for unverified login behavior indirectly where practical, register validation, resend verification, token verification, and reset edge cases.

**Acceptance checks:**
- `npm run typecheck`
- `npm test -- src/__tests__/api/register.test.ts`
- New auth API tests pass.

### Module B: Authenticated Page Guards and User Center UX

**Owned files:**
- Create if useful: `src/components/auth/AuthRequired.tsx`
- Modify: `src/app/feed/page.tsx`
- Modify: `src/app/learning/page.tsx`
- Modify: `src/app/badges/page.tsx`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/app/saved/page.tsx`
- Modify: `src/app/for-you/page.tsx`
- Modify: `src/app/applications/page.tsx`
- Modify: `src/hooks/useFetch.ts` only if needed for better 401 handling

**Requirements:**
- [ ] Logged-out users must get a clear sign-in prompt or redirect with `callbackUrl` on every user-only page.
- [ ] Feed, Learning, and Badges must not silently show "Loading..." or empty data on 401.
- [ ] Reuse existing visual language; do not redesign the user center.
- [ ] Preserve existing authenticated behavior for profile, saved listings, recommendations, applications, badges, feed, and learning progress.
- [ ] Add small focused tests if extracting a reusable component/hook.

**Acceptance checks:**
- `npm run typecheck`
- Existing auth/navigation e2e tests still pass.

### Module C: Pro, Manual Activation, and Billing Source of Truth

**Owned files:**
- Modify: `src/app/pricing/page.tsx`
- Modify: `src/app/billing/page.tsx`
- Modify: `src/app/api/user/upgrade/route.ts`
- Modify: `src/app/api/user/billing/route.ts`
- Modify: `src/app/api/stripe/checkout/route.ts`
- Modify: `src/app/api/stripe/portal/route.ts`
- Modify: `src/app/api/stripe/webhook/route.ts`
- Modify: `src/lib/pro.ts`
- Modify: `src/lib/stripe.ts`
- Test: create/update Pro, optional Stripe, and billing route tests where practical with mocks

**Requirements:**
- [ ] Remove or hard-disable the production mock upgrade path. No arbitrary authenticated user should be able to become Pro without an explicit admin/manual path or future Stripe path.
- [ ] Pricing page should direct users to contact EDU Passport for manual activation while no Stripe account is available.
- [ ] Billing page should use real subscription/manual Pro state from `/api/user/billing` and open Stripe portal only when a Stripe subscription exists.
- [ ] `isProUser` must treat expired `proExpiresAt` as non-Pro.
- [ ] Checkout and webhook should preserve existing subscription upsert behavior as optional future plumbing.
- [ ] Avoid touching admin subscription pages unless strictly necessary.

**Acceptance checks:**
- `npm run typecheck`
- Focused tests for billing/manual Pro/checkout behavior pass.

### Module D: Admin User Management and Authorization Boundary

**Owned files:**
- Modify: `src/app/admin/layout.tsx`
- Modify: `src/app/admin/login/page.tsx` only if needed
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/api/admin/users/route.ts`
- Modify: `src/app/api/admin/export/route.ts` only if user export behavior needs validation hardening
- Modify: `src/lib/admin.ts`
- Test: create/update admin user route tests

**Requirements:**
- [ ] Admin layout must require an actual admin session, not merely any session.
- [ ] Regular users must not see admin shell navigation.
- [ ] Admin users API must validate role values and ban/unban inputs.
- [ ] User role changes must keep `role` and `tier` consistent where applicable: `pro` role should imply pro tier only through a deliberate path, not accidental free upgrade.
- [ ] Preserve current admin user list, filters, ban/unban, role UI, export link, and audit logging.

**Acceptance checks:**
- `npm run typecheck`
- New admin auth/user route tests pass.

### Module E: Cross-System Regression and E2E Coverage

**Owned files:**
- Modify/create: `e2e/auth.spec.ts`
- Modify/create: `e2e/user-system.spec.ts`
- Modify/create: relevant `src/__tests__` files only for test support
- Do not modify production files unless a test exposes a clear integration bug; report it first if it overlaps another module.

**Requirements:**
- [ ] Add browser coverage for signed-out protected page behavior.
- [ ] Add registration success-state coverage that does not depend on a real mailbox.
- [ ] Add invalid login and billing signed-out coverage if not already sufficient.
- [ ] Keep tests deterministic with unique emails and no external SMTP/Stripe calls.
- [ ] Document any tests that require environment variables or seeded data.

**Acceptance checks:**
- `npm run typecheck`
- `npm test`
- `npm run test:e2e` or a focused Playwright subset if full e2e is too slow locally.

## Integration Checklist

- [ ] Review all worker changes and resolve overlaps.
- [ ] Confirm no module reintroduced mock Pro upgrades for normal users.
- [ ] Confirm unverified users cannot sign in.
- [ ] Confirm admin UI and admin APIs reject regular users.
- [ ] Confirm logged-out user-only pages show clear sign-in behavior.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Run focused e2e for auth/user-system.
- [ ] Update final completion estimate and list residual dependencies.
