# CLAUDE.md

This file provides context for AI assistants working on the Slow Folk Sauna Capacity Benchmarking Tool.

## Project Overview

A Next.js application that compares real venue booking data against financial models. It pulls session data from multiple venue booking platforms (Momence, Glofox, MarianaTeK, TryBe, Acuity, Portal, Xtra Clubs) and provides KPI metrics for sauna/wellness venues.

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
- **Charts:** Recharts + Visx
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
yarn refresh:glofox   # Refresh Glofox guest tokens
yarn cache:sync       # Sync venue cache from origin/main
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
│   ├── charts/             # Visualization components
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

## Environment Variables

Required variables (see `.env.example`):
- `VITE_PASSWORD` — password for Forecast/Report pages
- `GOOGLE_MAPS_API_KEY` — venue metadata lookup
- `GOOGLE_SHEETS_API_KEY` — CapEx tracker data (optional)
- `GOOGLE_SHEETS_SPREADSHEET_ID` — CapEx Google Sheet ID (optional)

## Caching Strategy

- **Primary cache:** JSON files in `src/data/venues/` (git-tracked, committed by GitHub Actions)
- **Fallback:** Live API fetches from venue platforms
- **Client-side:** localStorage with quota management and LRU eviction (`venueCache.ts`)
- **Sync:** `yarn cache:sync` pulls latest cache from `origin/main`; runs automatically on `yarn dev`

## CI/CD

- **Venue polling** (`.github/workflows/poll-venues.yml`): every 30 min, timezone-aware gating (Melbourne time), polls Acuity and TryBe, commits updated cache files
- **Token refresh** (`.github/workflows/refresh-glofox-tokens.yml`): weekly on Mondays, refreshes Glofox guest tokens, commits to `src/config/api.ts`

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
