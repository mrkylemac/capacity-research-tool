# CLAUDE.md

This file provides context for AI assistants working on the Slow Folk Sauna Capacity Benchmarking Tool.

## Project Overview

A Next.js application that compares real venue booking data against financial models. It pulls session data from multiple venue booking platforms (Momence, Glofox, MarianaTeK, TryBe, Acuity, Portal, Xtra Clubs, Hapana, bsport, Punchpass, Navia) and provides KPI metrics for sauna/wellness venues.

The project has three phases:
- **Phase 1 (in progress):** CapEx Tracker — budget tracking, burn rate, variance analysis
- **Phase 2 (planned):** OpEx View — monthly operational costs, runway
- **Phase 3 (planned):** Pricing & Breakeven — market positioning, scenario analysis

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict null checks enabled, `strict: false` overall)
- **Styling:** Tailwind CSS 4 with CSS variable-based theming
- **UI Components:** Shadcn UI (Radix UI primitives + Tailwind)
- **State Management:** React Query (TanStack Query) for server state, React useState for local state
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod validation
- **Testing:** Vitest + Testing Library (jsdom environment)
- **Package Manager:** Yarn 1.22.22

## Quick Reference Commands

```bash
yarn install          # Install dependencies
yarn dev              # Start dev server (runs cache:sync first via predev hook)
yarn build            # Production build
yarn lint             # ESLint check
yarn test             # Run tests once (vitest run)
yarn test:watch       # Run tests in watch mode
yarn fetch-venues     # Bulk fetch all venue data
yarn poll:acuity      # Poll Acuity venues (used by GitHub Actions)
yarn poll:trybe       # Poll TryBe venues (used by GitHub Actions)
yarn poll:punchpass   # Poll Punchpass venues (add --deep to re-probe capacity oracle)
yarn poll:navia       # Poll Navia venues (add --deep to walk the full forward horizon)
yarn poll:bsport      # Refresh bsport venues (full-history refetch)
yarn refresh:glofox   # Refresh Glofox guest tokens
yarn venue:schedule   # Derive polling windows from cached data (add a platform to filter)
yarn verify:cache     # Refuse-to-publish check: has any cache lost history?
yarn cache:sync       # Sync venue cache from origin/main
yarn auth:generate    # Regenerate src/db/auth-schema.sql from src/lib/auth.ts
yarn auth:migrate     # Apply schema changes to the live database
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # Server-side API route handlers
│   │   ├── fetch-venue/    # Multi-platform venue data fetcher
│   │   ├── glofox/         # Glofox API integration
│   │   ├── sheets/         # Google Sheets API proxy (CapEx)
│   │   ├── venue-data/     # Cached venue data endpoints
│   │   ├── venue-images/   # Logo/image management
│   │   └── venue-info/     # Venue metadata endpoints
│   ├── report/             # Report pages
│   └── tracker/            # Financial tracker (CapEx)
├── components/             # React components
│   ├── tracker/            # CapEx tracker components
│   ├── demand/             # Demand analysis components
│   ├── ui/                 # Shadcn UI primitives (do not edit manually)
│   └── [shared components] # Feature components (40+)
├── config/
│   └── api.ts              # Platform configs + venue definitions
├── lib/                    # Business logic and API clients
│   ├── *Client.ts          # Platform-specific API clients (momence, glofox, etc.)
│   ├── benchmarkMetrics.ts # KPI calculations
│   ├── metricsCalculator.ts # Session metrics
│   ├── venueCache.ts       # Client-side localStorage caching
│   ├── sheetsClient.ts     # Google Sheets API helper
│   └── venueInsights.ts    # Business metrics derivation
├── hooks/                  # Custom React hooks (useSheets, etc.)
├── types/                  # TypeScript type definitions per domain
├── data/                   # Cached data (JSON files, git-tracked)
│   ├── venues/             # Per-venue cached session data
│   └── tracker/            # CapEx cache
├── test/                   # Test files and setup
│   └── setup.ts            # Vitest setup (matchMedia mock)
└── styles/                 # Global styles
scripts/                    # Utility scripts (polling, token refresh, testing)
.github/workflows/          # CI/CD (venue polling every 30 min, weekly token refresh)
```

## Architecture Patterns

### Data Flow
1. **External APIs** (venue booking platforms) → **API routes** (`/api/*`) → **JSON cache** (`src/data/`)
2. **Client components** fetch from API routes via **React Query** hooks
3. **localStorage** provides additional client-side caching with LRU eviction

### Component Conventions
- **Server Components** (default): API route handlers (`route.ts`), page containers (`page.tsx`)
- **Client Components** (marked `'use client'`): interactive UI, React Query consumers, event handlers
- **Shadcn UI components** in `src/components/ui/` — these are generated; avoid manual edits

### Path Alias
Use `@/*` to import from `src/*` (e.g., `import { something } from '@/lib/utils'`).

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase `.tsx` | `BudgetSummary.tsx` |
| Utilities | camelCase `.ts` | `venueCache.ts` |
| Types/interfaces | PascalCase | `CostLineItem`, `CapExSummary` |
| Hooks | `use{Name}` | `useCapExData`, `useSheets` |
| Event handlers | `handle{Event}` | `handleFetch` |
| Test files | `{feature}.test.ts` | `benchmarkMetrics.test.ts` |

## Styling

- **Utility-first** with Tailwind CSS — no separate CSS files for components
- **Responsive:** mobile-first (`sm:`, `lg:` breakpoints)
- **Semantic colors** via CSS variables: `primary`, `secondary`, `destructive`, `muted`, `accent`, `card`
- **Status colors:** `green-4` (success), `amber-4` (warning), `red-4` (danger)
- **Shadows:** `shadow-1` through `shadow-4`
- **Animation:** `section-animate` class with staggered delays

## Testing

- **Framework:** Vitest with jsdom environment, globals enabled
- **Test location:** `src/test/*.test.ts`
- **Pattern:** `src/**/*.{test,spec}.{ts,tsx}`
- No need to import `describe`, `it`, `expect` — they are global
- Run `yarn test` to validate changes

## Authentication

Every page and API route requires a signed-in, **approved** user. Accounts are
created via signup but start `approved = false` and are switched on by hand at
`/admin/users`.

- **Server config:** `src/lib/auth.ts` (Better Auth, Postgres via `pg`)
- **Guards:** `src/lib/auth-guard.ts` — `requireApprovedUser()` in pages,
  `requireApprovedUserForApi()` in route handlers. These are the security
  boundary; `src/middleware.ts` only does a cheap cookie check and skips `/api/*`
  so route handlers can answer with JSON rather than an HTML redirect.
- **Adding a page:** call `await requireApprovedUser()` first and make the
  component `async`.
- **Adding an API route:** start the handler with
  `const { error } = await requireApprovedUserForApi(); if (error) return error;`
- `approved` and `role` are `input: false`, so a signup payload cannot set them.
- Session cookie caching is off on purpose: approving or revoking someone takes
  effect on their next request.
- Schema lives in `src/db/auth-schema.sql`; regenerate with `yarn auth:generate`.

See `AUTH-SETUP.md` for the deployment and bootstrap story.

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL` — Postgres connection string (auth); required
- `BETTER_AUTH_SECRET` — session cookie signing secret; required
- `BETTER_AUTH_URL` — public app URL; required in production
- `ADMIN_EMAILS` — comma-separated addresses auto-approved as admin on signup
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google sign-in (optional; unset
  hides the Google button)
- `GOOGLE_SHEETS_API_KEY` — CapEx tracker data (optional)
- `GOOGLE_SHEETS_SPREADSHEET_ID` — CapEx Google Sheet ID (optional)

Note: `.env` is git-tracked despite being in `.gitignore` (committed before the
rule existed). Put local secrets in `.env.local` instead.

## Caching Strategy

- **Primary cache:** JSON files in `src/data/venues/` (git-tracked, committed by GitHub Actions)
- **Fallback:** Live API fetches from venue platforms
- **Client-side:** localStorage with quota management and LRU eviction (`venueCache.ts`)
- **Sync:** `yarn cache:sync` pulls latest cache from `origin/main`; runs automatically on `yarn dev`

## CI/CD

- **Venue polling** (`.github/workflows/poll-venues.yml`): every 15 min, timezone-aware gating (Melbourne time), polls Acuity, TryBe, Punchpass and Navia, commits updated cache files. The 15-minute beat is set by Navia, whose bookable entries expire every 15 min; the repo is public so standard runners are free
- **Token refresh** (`.github/workflows/refresh-glofox-tokens.yml`): weekly on Mondays, refreshes Glofox guest tokens, commits to `src/config/api.ts`
- Both workflows tag their commits `[skip ci]` so they don't re-trigger themselves. That suppresses GitHub Actions, but **not** Vercel, which has no built-in support for the convention — so the data they commit deploys normally.

## Deployment

Vercel, on push to `main`. No deploy workflow and no build config of its own.

`src/data` reaches the serverless functions via `outputFileTracingIncludes` in
`next.config.mjs`: the venue JSON is read at request time from `process.cwd()`
paths the file tracer cannot infer, so it has to be named explicitly.

The database is Postgres (Neon by default, via the Vercel integration). Nothing
in the app is tied to that choice — it is a `DATABASE_URL` and the schema in
`src/db/auth-schema.sql`.

## Key Documentation

- `README.md` — Quick start, feature overview, deployment
- `ADDING-A-VENUE.md` — Step-by-step guide for integrating new booking platforms
- `FORECAST-SETUP.md` — Google Sheets forecast data integration
- `PLAN.md` — CapEx tracker implementation plan and architecture
- `scripts/README.md` — Script documentation

## Important Notes

- The `src/components/ui/` directory contains Shadcn-generated components — regenerate via the Shadcn CLI rather than editing directly
- Venue configs (API keys, tokens, endpoint URLs) live in `src/config/api.ts`
- Glofox tokens expire ~30 days and are auto-refreshed weekly via GitHub Actions
- The `predev` hook runs `cache:sync` before `yarn dev`, which requires `origin/main` to be fetchable
- TypeScript has `strictNullChecks: true` but `strict: false` — handle nullability but don't expect full strict mode
