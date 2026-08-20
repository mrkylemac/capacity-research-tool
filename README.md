# Slow Folk Sauna Capacity Benchmarking Tool

A Next.js application that compares real venue booking data against Slow Folk's financial models. It pulls session data from the public booking APIs of sauna and wellness venues across nine platforms, caches it in the repo, and computes the KPI metrics that matter for validating a sauna business: utilisation, demand patterns, pricing, and revenue.

## Project Phases

- **Phase 1 (in progress):** CapEx Tracker — budget tracking, burn rate, variance analysis (`/tracker`)
- **Phase 2 (planned):** OpEx View — monthly operational costs, runway
- **Phase 3 (planned):** Pricing & Breakeven — market positioning, scenario analysis

## Quick Start

```bash
yarn install          # Install dependencies
yarn dev              # Start dev server (syncs venue cache from origin/main first)
```

The app runs at `http://localhost:3000`.

```bash
yarn build            # Production build
yarn lint             # ESLint
yarn test             # Vitest (single run)
yarn test:watch       # Vitest (watch mode)
```

Sign-in requires a Postgres database — see [`AUTH-SETUP.md`](./AUTH-SETUP.md) for
the local setup.

### Environment Variables

See `.env.example`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (required — sign-in fails without it) |
| `BETTER_AUTH_SECRET` | Signs session cookies (required). `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Public URL of the app (required in production) |
| `ADMIN_EMAILS` | Comma-separated addresses auto-approved as admins on signup |
| `GOOGLE_CLIENT_ID` | Google sign-in (optional — unset hides the Google button) |
| `GOOGLE_CLIENT_SECRET` | Google sign-in (optional) |
| `GOOGLE_SHEETS_API_KEY` | CapEx tracker data (optional) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | CapEx Google Sheet ID (optional) |

## Access Control

Every page and API route is behind a login. Anyone can request an account at
`/signup`, but new accounts start unapproved and see nothing until an admin
approves them at `/admin/users`. Email and password always work; Google sign-in
appears when the Google credentials are set.

See [`AUTH-SETUP.md`](./AUTH-SETUP.md) for the full setup, including how the
first admin bootstraps.

## Tracked Venues

Seventeen venues across nine booking platforms:

| Platform | Venues | History |
|---|---|---|
| Momence | Inner Studio (Collingwood + South Yarra), Sol Sauna, Aalto, EQ, Panda Society | Full, via public readonly API |
| Glofox | Lore Bathing Club, Akari Saunas, Wellness Social Club | Full, guest token (auto-refreshed) |
| MarianaTek | Project Mood, Ærth Saunas | Full, public customer API |
| TryBe | Sense of Self | Future-only — history built up by polling |
| Portal (Wix) | PORTAL° Thermaculture (Denver, Boulder, Bozeman + Minneapolis via Glofox) | Full |
| Xtra Clubs | Xtra Clubs (Bondi Junction, Green Square, Merrickville) | Full |
| Acuity | Sauna Goose, The Corner Sauna | Availability-based — history built up by polling |
| Hapana | Alchemy Saunas (8 Perth locations) | ~2–3 months — history built up by polling |
| bsport | KEEN Wellbeing (Zurich) | Full, public offer API |

Venue definitions and per-platform configs live in `src/config/api.ts`. To integrate a new venue or platform, follow the playbook in [`ADDING-A-VENUE.md`](./ADDING-A-VENUE.md).

## How It Works

### Data Flow

1. **External APIs** (venue booking platforms) → **API routes** (`src/app/api/*`) → **JSON cache** (`src/data/venues/`, git-tracked)
2. **Client components** fetch from the API routes via React Query
3. **localStorage** adds client-side caching with quota management and LRU eviction (`src/lib/venueCache.ts`)

Platforms that only expose upcoming sessions (TryBe, Acuity, Hapana) are polled on a schedule so past sessions are captured before they disappear — that polled history exists **only** in the cache files and cannot be refetched, which is why the cache is committed to the repo and synced from `origin/main` (`yarn cache:sync`, run automatically before `yarn dev`).

### Data Scripts

```bash
yarn fetch-venues     # Bulk fetch venues with full-history APIs (Momence, Glofox, MarianaTek)
yarn poll:acuity      # Poll Acuity venues (used by GitHub Actions)
yarn poll:trybe       # Poll TryBe venues (used by GitHub Actions)
yarn poll:bsport      # Refresh bsport venues (full-history refetch)
yarn refresh:glofox   # Refresh Glofox guest tokens
yarn cache:sync       # Pull latest venue cache from origin/main
```

### CI/CD

- **Venue polling** (`.github/workflows/poll-venues.yml`): every 30 minutes with timezone-aware gating (Melbourne time), polls Acuity and TryBe and commits updated cache files
- **Token refresh** (`.github/workflows/refresh-glofox-tokens.yml`): weekly, refreshes Glofox guest tokens and commits them to `src/config/api.ts`

### Key Metrics

All metrics are computed from cached session data (`src/lib/benchmarkMetrics.ts`, `src/lib/metricsCalculator.ts`):

| Metric | Formula |
|--------|---------|
| Total Sessions | Count of all sessions in range |
| Total Tickets Sold | Sum of `ticketsSold` |
| Avg Utilisation % | (Tickets Sold / Capacity) × 100 |
| Total Revenue | Sum of (ticketsSold × fixedTicketPrice) |
| Avg Revenue per Visit | Total Revenue / Total Tickets Sold |
| Sessions per Day | Total Sessions / Days in Range |

Reports also break sessions down by month, class type, location, and 2-hour demand slots (High ≥70% / Medium ≥40% / Low <40% utilisation), and infer each venue's operating model (hours, capacity, pricing) from its session data.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # Server-side route handlers
│   │   ├── fetch-venue/    # Multi-platform venue data fetcher
│   │   ├── glofox/         # Glofox API integration
│   │   ├── sheets/         # Google Sheets API proxy (CapEx)
│   │   ├── venue-data/     # Cached venue data endpoints
│   │   └── venue-images/   # Logo/image management
│   ├── report/             # Venue report pages
│   └── tracker/            # Financial tracker (CapEx)
├── components/             # React components (tracker/, charts/, demand/, ui/)
├── config/api.ts           # Platform configs + venue definitions
├── lib/                    # Business logic and per-platform API clients
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
├── data/                   # Git-tracked JSON cache (venues/, tracker/)
└── test/                   # Vitest test files
scripts/                    # Polling, token refresh, and utility scripts
.github/workflows/          # Venue polling + token refresh automation
```

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS 4** + Shadcn UI (Radix primitives)
- **TanStack Query** for server state
- **Recharts + Visx** for charts
- **React Hook Form + Zod** for forms
- **Vitest + Testing Library** for tests
- **Yarn 1.22** as package manager

## Deployment

Deploys to Vercel on push to `main`, with no build configuration of its own.

Note that Vercel does not honour `[skip ci]` in commit messages, unlike GitHub
Actions. The venue-polling and token-refresh workflows tag their commits that
way to avoid re-triggering themselves, and those commits still deploy normally.

Sign-in needs a Postgres database and three environment variables. Setting that
up is in [`AUTH-SETUP.md`](./AUTH-SETUP.md).

## Key Documentation

- [`AUTH-SETUP.md`](./AUTH-SETUP.md) — sign-in, manual approval, Neon + Postgres setup
- [`ADDING-A-VENUE.md`](./ADDING-A-VENUE.md) — playbook for integrating new booking platforms
- [`FORECAST-SETUP.md`](./FORECAST-SETUP.md) — Google Sheets forecast integration
- [`PLAN.md`](./PLAN.md) — CapEx tracker implementation plan
- [`scripts/README.md`](./scripts/README.md) — script documentation
- [`CLAUDE.md`](./CLAUDE.md) — AI assistant context and conventions
