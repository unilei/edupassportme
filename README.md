# EDU Passport

**Education meta-search aggregator** — like Skyscanner for courses, jobs, events, and deals.

## Tech Stack

- **Framework:** Next.js 16 (App Router, ISR, Server Components)
- **Database:** PostgreSQL + Prisma 7 ORM
- **Auth:** NextAuth.js (admin + user credential providers)
- **Payments:** Stripe (subscriptions, checkout, customer portal)
- **AI:** OpenAI (summaries, search intent, learning paths, chat)
- **Styling:** TailwindCSS + shadcn/ui
- **i18n:** Client + Server-side with English / Chinese (cookie + Accept-Language detection)
- **Email:** Nodemailer (SMTP or dev JSON transport)
- **Testing:** Vitest + React Testing Library (140 tests)
- **Bundle:** @next/bundle-analyzer, dynamic imports, optimizePackageImports

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables below)

# 3. Start PostgreSQL (Docker)
docker compose up -d

# 4. Run database migrations + generate Prisma client
npx prisma migrate deploy
npx prisma generate

# 5. Seed the database
npm run db:seed

# 6. Start dev server
npm run dev
```

Dev server runs on `http://localhost:3002` by default.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption |
| `ADMIN_PASSWORD` | Yes | Admin panel login password |
| `CRON_SECRET` | No | Auth secret for cron endpoints |
| `UDEMY_API_KEY` | No | Udemy API key for course sync |
| `SMTP_HOST` | No | SMTP host for emails (dev: console output) |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_USER` / `SMTP_PASS` | No | SMTP credentials |
| `SMTP_FROM` | No | From address for emails |
| `STRIPE_SECRET_KEY` | No | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | No | Stripe Price ID for monthly plan |
| `STRIPE_PRO_YEARLY_PRICE_ID` | No | Stripe Price ID for yearly plan |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key (client) |
| `OPENAI_API_KEY` | No | OpenAI API key for AI features |
| `OPENAI_MODEL` | No | Model name (default: gpt-4o-mini) |
| `LOG_LEVEL` | No | Logging level: debug, info, warn, error (default: info) |
| `NEXT_PUBLIC_SITE_URL` | No | Production site URL for SEO/hreflang |

## Scripts

```bash
npm run dev          # Start dev server
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
- **Full-text search** with PostgreSQL tsvector + autocomplete
- **User accounts** with email verification, password reset
- **Pro tier** with Stripe subscriptions (monthly/yearly)
- **AI features:** listing summaries, smart search, learning paths, chat assistant
- **Reviews** with nested replies, upvote/downvote, reporting
- **Social:** follow system, activity feed, user profiles
- **Gamification:** 14 achievement badges, learning progress tracking (enroll → complete)
- **Admin panel** with analytics, moderation, reports, subscriptions, exports, audit logs
- **i18n** (English / Chinese) with server-side detection, URL prefixes, hreflang SEO
- **Localization:** locale-aware price/date/number formatting
- **PWA** with service worker, offline support, install prompt
- **Email notifications** for new matches, price drops
- **SEO** with JSON-LD structured data, sitemap, ISR, hreflang
- **Performance:** bundle analysis, dynamic imports, ISR caching, Web Vitals monitoring
- **Security:** rate limiting, security headers, input sanitization, CSRF protection
- **140 tests** covering API routes, utilities, hooks, and i18n

## Production Checklist

- [ ] Set all required environment variables
- [ ] Run `npx prisma migrate deploy` against production DB
- [ ] Configure Stripe webhook endpoint → `https://yourdomain.com/api/stripe/webhook`
- [ ] Set up SMTP for transactional emails
- [ ] Configure cron jobs for `/api/cron/sync` and `/api/cron/notify`
- [ ] Enable HTTPS (Strict-Transport-Security header is pre-configured)
- [ ] Review rate limit settings in `src/lib/rate-limit.ts` (swap to Redis for multi-instance)
- [ ] Set `NEXT_PUBLIC_SITE_URL` to production domain
- [ ] Test Stripe checkout flow end-to-end
- [ ] Verify OpenAI API key has sufficient quota
- [ ] Run `npm run build:analyze` and review bundle sizes
- [ ] Check Web Vitals baseline with Lighthouse

## License

Private — All rights reserved.
