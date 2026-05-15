# EDU Passport

**Student opportunity workspace** — discover courses, jobs, events, and student deals, then track every next action from saved to completed.

## Tech Stack

- **Framework:** Next.js 16 (App Router, ISR, Server Components)
- **Database:** PostgreSQL + Prisma 7 ORM
- **Auth:** NextAuth.js (admin + user credential providers)
- **Payments:** Manual Pro activation in Admin; Stripe integration is optional for a future automated checkout flow
- **AI:** OpenAI (summaries, search intent, learning paths, chat)
- **Styling:** TailwindCSS + shadcn/ui
- **i18n:** Client + Server-side with English / Chinese (cookie + Accept-Language detection)
- **Email:** Nodemailer (SMTP or dev JSON transport)
- **Testing:** Vitest + React Testing Library + Playwright (200+ tests)
- **Bundle:** @next/bundle-analyzer, dynamic imports, optimizePackageImports

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# 3. Start all required local services and the dev server
npm run dev:local
```

Dev server runs on `http://127.0.0.1:3000` by default.

Optional: seed the local database while starting:

```bash
SEED_DB=1 npm run dev:local
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption |
| `ADMIN_PASSWORD` | Yes | Admin panel login password |
| `CRON_SECRET` | No | Auth secret for cron endpoints |
| `UDEMY_API_KEY` | No | Optional legacy Udemy API key for course sync |
| `USAJOBS_API_KEY` | No | USAJOBS API key for public-sector education job sync |
| `USAJOBS_USER_AGENT` | No | Email/user-agent registered with USAJOBS |
| `TICKETMASTER_API_KEY` | No | Ticketmaster Discovery API key for event sync |
| `AWIN_ACCESS_TOKEN` | No | Optional legacy Awin publisher API token for promotions/deals sync |
| `AWIN_PUBLISHER_ID` | No | Optional legacy Awin publisher account ID |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | No | Reserved for Adzuna jobs provider in the next source expansion |
| `SMTP_HOST` | No | SMTP host for emails. Recommended production provider: Resend (`smtp.resend.com`) |
| `SMTP_PORT` | No | SMTP port. Use `465` with Resend |
| `SMTP_USER` / `SMTP_PASS` | No | SMTP credentials. Use `resend` and a Resend API key for Resend |
| `SMTP_FROM` | No | From address for emails |
| `STRIPE_SECRET_KEY` | No | Optional future Stripe secret key. Leave blank while using manual Pro activation |
| `STRIPE_WEBHOOK_SECRET` | No | Optional future Stripe webhook signing secret |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | No | Optional future Stripe Price ID for monthly plan |
| `STRIPE_PRO_YEARLY_PRICE_ID` | No | Optional future Stripe Price ID for yearly plan |

Course and deal sync also includes no-account public providers: Microsoft Learn,
MIT OpenCourseWare, GitHub Student Developer Pack, and Slickdeals Education.
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key (client) |
| `OPENAI_API_KEY` | No | OpenAI API key for AI features |
| `OPENAI_MODEL` | No | Model name (default: gpt-4o-mini) |
| `LOG_LEVEL` | No | Logging level: debug, info, warn, error (default: info) |
| `NEXT_PUBLIC_SITE_URL` | No | Production site URL for SEO/hreflang |

## Scripts

```bash
npm run dev          # Start dev server
npm run dev:local    # Start PostgreSQL, run migrations, generate Prisma client, then start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npx tsc --noEmit     # TypeScript check
npx vitest run       # Run tests
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
npm run build:analyze # Bundle size analysis
npm run typecheck    # TypeScript strict check
npm run test:coverage # Test coverage report
npm run test:e2e     # Playwright end-to-end tests
```

## Production Deployment

Production deploys are handled by GitHub Actions after the `CI` workflow passes on `main`.

Deployment flow:

1. Build the Docker image from `Dockerfile`.
2. Push `ghcr.io/unilei/edupassportme:sha-<commit>` and `latest` to GHCR.
3. SSH into the server.
4. Upload `deploy/docker-compose.prod.yml`, `deploy/remote-deploy.sh`, and a generated `.env.production`.
5. Pull the new image, start PostgreSQL, run Prisma migrations, update the app container, and verify `/api/health`.

Required GitHub Secrets:

| Secret | Purpose |
| --- | --- |
| `DEPLOY_HOST` | Server hostname or IP |
| `DEPLOY_USER` | SSH user on the server |
| `DEPLOY_SSH_KEY` | Private SSH key for deployment |
| `POSTGRES_PASSWORD` | Production PostgreSQL password |
| `NEXTAUTH_SECRET` | NextAuth session secret |
| `NEXTAUTH_URL` | Production URL, for example `https://edupassport.me` |
| `NEXT_PUBLIC_SITE_URL` | Public production URL |
| `ADMIN_PASSWORD` | Admin login password |
| `CRON_SECRET` | Secret for `/api/cron/*` endpoints |

GitHub Actions uses the built-in workflow token for GHCR push/pull during deployment, so no long-lived GHCR PAT is required.

Optional GitHub Variables or Secrets:

`DEPLOY_PORT` (default `22`), `DEPLOY_PATH` (default `/opt/edupassport.me`), `APP_PORT` (default `3000`), `POSTGRES_USER` (default `edupassport`), `POSTGRES_DB` (default `edupassport`), plus SMTP, Stripe, OpenAI, and provider API keys from the environment table above.

## Project Structure

```text
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/
│   │   ├── admin/          # Admin CRUD APIs
│   │   ├── ai/             # AI endpoints (summary, chat, search-intent, learning-path)
│   │   ├── auth/           # Register, verify, forgot/reset password
│   │   ├── cron/           # Scheduled jobs (sync, notify)
│   │   ├── listings/       # Listing detail & reviews
│   │   ├── reports/        # Content reporting
│   │   ├── reviews/        # Review replies & votes
│   │   ├── search/         # Full-text search & suggestions
│   │   ├── stripe/         # Checkout, webhook, customer portal
│   │   ├── user/           # Profile, saved, notifications, billing, follow, feed, badges, progress
│   │   ├── vitals/         # Web Vitals collection endpoint
│   │   └── health/         # Health check endpoint
│   ├── admin/              # Admin dashboard pages (analytics, moderation, exports, reports)
│   ├── auth/               # Sign in/up, verify, password reset
│   ├── badges/             # Achievement badges page
│   ├── billing/            # Subscription management
│   ├── courses/jobs/events/deals/  # Vertical listing pages
│   ├── feed/               # Activity feed page
│   ├── learning/           # Learning progress tracker
│   ├── workspace/          # Student opportunity workspace
│   └── user/[id]/          # Public user profiles
├── components/
│   ├── ai/                 # Chat assistant, AI summary button
│   ├── layout/             # Header, Footer, BottomNav, NotificationBell
│   ├── listing/            # ListingCard, ReviewSection, ReviewActions
│   ├── pwa/                # Service worker, install prompt
│   └── shared/             # SearchInput, OptimizedImage, ThemeToggle, etc.
├── hooks/                  # Reusable hooks (useFetch, useDebounce, usePagination)
├── lib/                    # Utilities
│   ├── api-utils.ts        # Unified API error/success/auth helpers
│   ├── auth.ts             # NextAuth config
│   ├── ai.ts               # OpenAI client
│   ├── badges.ts           # Badge definitions + award logic (14 badges)
│   ├── cache.ts            # Cache-Control header utilities
│   ├── email.ts            # Nodemailer setup + templates
│   ├── env.ts              # Environment validation
│   ├── i18n/               # Translations, context, server-side helpers, formatting
│   ├── logger.ts           # Structured logging utility
│   ├── prisma.ts           # Prisma client singleton
│   ├── rate-limit.ts       # In-memory rate limiter
│   ├── sanitize.ts         # Input sanitization utilities
│   ├── stripe.ts           # Stripe client + plan config
│   └── providers/          # Data sync provider framework
└── __tests__/              # Vitest test suites
```

## Key Features

- **4 verticals:** Courses, Jobs, Events, Deals
- **Opportunity Workspace:** saved opportunities with status, priority, deadline, next-action reminders, and notes
- **Full-text search** with PostgreSQL tsvector + autocomplete
- **User accounts** with email verification, password reset
- **Pro tier** with admin-controlled manual activation for unlimited opportunity tracking, Quick Apply, and priority workspace features; Stripe subscription plumbing is kept optional for later
- **AI features:** listing summaries, smart search, learning paths, chat assistant
- **Reviews** with nested replies, upvote/downvote, reporting
- **Social:** follow system, activity feed, user profiles
- **Gamification:** 14 achievement badges, learning progress tracking (enroll → complete)
- **Admin panel** with analytics, moderation, reports, subscriptions, exports, audit logs
- **i18n** (English / Chinese) with server-side detection, URL prefixes, hreflang SEO
- **Localization:** locale-aware price/date/number formatting
- **PWA** with service worker, offline support, install prompt
- **Email and in-app notifications** for new matches, price drops, and workspace reminders
- **SEO** with JSON-LD structured data, sitemap, ISR, hreflang
- **Performance:** bundle analysis, dynamic imports, ISR caching, Web Vitals monitoring
- **Security:** rate limiting, security headers, input sanitization, CSRF protection
- **200+ tests** covering API routes, utilities, hooks, components, and i18n

## Production Checklist

- [ ] Set all required environment variables
- [ ] Run `npx prisma migrate deploy` against production DB
- [ ] Create a Resend account, verify `edupassport.me`, and set SMTP env vars
- [ ] Use Admin → Users to grant/revoke Pro manually after payment confirmation
- [ ] Configure cron jobs for `/api/cron/sync` and `/api/cron/notify`
- [ ] Enable HTTPS (Strict-Transport-Security header is pre-configured)
- [ ] Review rate limit settings in `src/lib/rate-limit.ts` (swap to Redis for multi-instance)
- [ ] Set `NEXT_PUBLIC_SITE_URL` to production domain
- [ ] Test email verification and password reset delivery end-to-end
- [ ] Verify OpenAI API key has sufficient quota
- [ ] Run `npm run build:analyze` and review bundle sizes
- [ ] Check Web Vitals baseline with Lighthouse

## License

Private — All rights reserved.
