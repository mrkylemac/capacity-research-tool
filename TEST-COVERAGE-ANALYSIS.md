# Test Coverage Analysis

_Generated: 2026-03-09_

## Current State: ~8% file coverage

The codebase has **7 test files** with **~165 test cases**, covering **2 of 17 library files**. API routes, components, hooks, and utility functions are entirely untested.

| Area | Files | Tested | Coverage |
|------|-------|--------|----------|
| `src/lib/` (business logic) | 17 | 2 | 12% |
| `src/app/api/` (API routes) | 7 | 0 | 0% |
| `src/components/` (UI) | 40+ | 0 | 0% |
| `src/hooks/` | 4 | 0 | 0% |

## What's Well Tested

- **`benchmarkMetrics.ts`** — ~40 test cases covering all KPI comparison functions
- **`metricsCalculator.ts`** — ~50 test cases for core metrics, monthly aggregation, demand patterns, class types
- **`edge-cases-stress.test.ts`** — ~45 cases testing 1000+ session datasets, boundary dates, overbooking
- **`akari-venue.test.ts`** — Venue-specific config validation
- **`january-data.test.ts`** — Real-world data consistency checks

## High-Priority Gaps

### 1. `src/lib/utils.ts` — Data Sanitization (Critical)

Contains `sanitizeSessions()`, `formatDecimalHour()`, and `normalizeCapacity()` — called by every platform client to clean raw data. A bug here silently drops or corrupts session records across all venues.

**Recommended tests:**
- Cancelled/invalid session filtering
- Ticket clamping behavior (min/max bounds)
- Operating-hours boundary enforcement
- Edge cases: empty arrays, null fields, malformed dates
- `formatDecimalHour()` — midnight, noon, fractional minutes
- `normalizeCapacity()` — venue-specific overrides, out-of-range values

### 2. Platform API Clients (~1,500 LOC total)

Seven clients with zero tests:

| Client | Lines | Complexity | Priority |
|--------|-------|------------|----------|
| `acuityClient.ts` | ~400 | High (two fetch modes, pagination) | **High** |
| `momenceClient.ts` | ~200 | Medium (pagination, host info) | **High** |
| `glofoxClient.ts` | ~150 | Medium (token validation) | Medium |
| `marianatekClient.ts` | ~150 | Medium (session mapping) | Medium |
| `portalClient.ts` | ~100 | Low | Low |
| `xtraClient.ts` | ~100 | Low (custom time format) | Low |
| `trybeClient.ts` | ~100 | Low | Low |

**Approach:** Mock `fetch` responses to test data mapping, pagination, and error handling without hitting live APIs.

### 3. `src/lib/sheetsClient.ts` — CapEx Tracker Backend

Parses Google Sheets rows into `CostLineItem` objects and computes budget summaries. Phase 1 (CapEx Tracker) depends entirely on this.

**Recommended tests:**
- Row parsing with various formats (currency strings, dates, categories)
- Budget summary computation (totals, burn rate, variance)
- Handling of empty/malformed rows
- API pagination behavior

### 4. `src/lib/venueInsights.ts` — Business Analytics

Monthly trajectory analysis, peak detection, and partial-month filtering.

**Recommended tests:**
- Partial-month detection edge cases (single month, all complete months)
- Peak month identification with ties
- Trajectory calculation with zero sessions
- Empty dataset handling

### 5. `src/lib/venueCache.ts` — Client-Side Caching

LRU eviction with a 10-entry cap and localStorage quota management.

**Recommended tests:**
- LRU eviction ordering
- Quota exceeded recovery
- Corrupted cache data handling
- Cache key collision behavior

### 6. API Route Integration Tests (0/7 routes)

| Route | Fallback Chain | Priority |
|-------|---------------|----------|
| `venue-data/route.ts` | Cache file → live API → error | **High** |
| `sheets/[tab]/route.ts` | Live API → cache → demo data | **High** |
| `fetch-venue/route.ts` | Multi-platform dispatch + Glofox token refresh | Medium |
| `venue-info/route.ts` | Google Maps lookup | Low |
| `venue-images/route.ts` | Cache + file aggregation | Low |

### 7. `src/hooks/useSessions.ts` — Session Fetching Hook

Orchestrates multi-location, multi-platform data fetching with date filtering. Critical for the entire dashboard.

**Recommended tests:**
- Multi-location data merging
- Date range filtering
- Loading/error state transitions
- Empty venue handling

## Lower-Priority Gaps

- **Component rendering tests** — Start with `SummaryCards`, `FiltersPanel`, and `MonthlyTable` (most logic-heavy)
- **Error path testing** — Existing tests are happy-path only; add API failure, malformed response, and timeout cases
- **E2E tests** — No end-to-end workflow coverage (fetch → calculate → render)

## Suggested Implementation Phases

| Phase | Target Files | Impact |
|-------|-------------|--------|
| **1** | `utils.ts`, `sheetsClient.ts`, `venueInsights.ts` | Cover critical data-cleaning and financial logic |
| **2** | API clients (mocked fetch), `venueCache.ts` | Cover platform integrations and caching |
| **3** | API route integration tests, `useSessions` hook | Cover server-side fallback chains |
| **4** | Component tests for logic-heavy components | Cover UI rendering correctness |

## Existing Test Quality

### Strengths
- Good coverage of core metric calculations with ~90 test cases
- Excellent edge case and stress testing (1000+ session datasets)
- Real-world data validation (January 2025 actual data)
- Data consistency checks (revenue = sessions × price round-trips)

### Weaknesses
- No error path testing in existing tests
- No tests for async operations or API interactions
- No component rendering or interaction tests
- No snapshot tests for output stability
