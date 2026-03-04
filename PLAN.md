# Slow Folk Financial Tracker — Implementation Plan

## Overview

Build a `/tracker` section of the app that serves as the financial control centre for the Slow Folk build. Google Sheets remains the source of truth. The front-end reads from (and eventually writes to) the workbook, presenting clear signals on CapEx burn, OpEx forecasting, and pricing/breakeven position.

---

## Two Routes

### Route 1: Economical (Start here)
- **Read-only front-end** powered by Google Sheets API v4 (API key, no OAuth)
- Google Sheets stays as the single source of truth — edit in Sheets, view in app
- Proxy API route (`/api/sheets`) fetches and caches sheet data server-side
- CapEx tracker, OpEx view, and Pricing/Breakeven views render from cached data
- Data entry for invoices/actuals lives in Google Sheets; front-end displays it
- **Cost**: Free (Sheets API quota is generous), no auth infra needed

### Route 2: Extensive (Layer on later)
- **Two-way sync** — edit directly in the front-end, push changes back to Sheets
- Google Service Account with editor access to the workbook (no OAuth flow needed)
- Inline editing on cost line items, status updates, invoice data entry
- File upload for fee proposals & invoices (store in Google Drive or local)
- Optimistic updates with conflict detection
- **Cost**: Service account setup, slightly more complex API layer

**Recommendation**: Build Route 1 now. Design the data layer so Route 2 is a natural extension (same types, same API routes, just add POST/PUT handlers).

---

## Architecture

### Data Flow
```
Google Sheets ──(API key)──> /api/sheets proxy ──> React hooks ──> Components
                                    │
                              Server-side cache
                            (src/data/tracker/)
```

### New Files

```
src/
├── app/
│   ├── tracker/
│   │   ├── page.tsx                    # Server component — tracker landing
│   │   ├── tracker-client.tsx          # Client shell — tab navigation
│   │   ├── capex/
│   │   │   └── page.tsx                # CapEx view (deep-dive)
│   │   ├── opex/
│   │   │   └── page.tsx                # OpEx view (Phase 2)
│   │   └── pricing/
│   │       └── page.tsx                # Pricing & breakeven view (Phase 3)
│   └── api/
│       └── sheets/
│           ├── route.ts                # GET: fetch all tabs metadata
│           └── [tab]/
│               └── route.ts            # GET: fetch specific tab data
├── components/
│   └── tracker/
│       ├── TrackerNav.tsx              # Top nav with tabs (CapEx | OpEx | Pricing)
│       ├── BudgetSummary.tsx           # Hero cards: total budget, spent, remaining, % burn
│       ├── CostTable.tsx               # Line-item table with forecast vs actual columns
│       ├── BurnChart.tsx               # Cumulative spend vs budget over time
│       ├── VarianceChart.tsx           # Forecast vs actual variance by category
│       ├── CategoryBreakdown.tsx       # Pie/bar chart of spend by category
│       ├── CashSignals.tsx             # Alert cards: over-budget items, investment needed
│       └── StatusBadge.tsx             # Paid/Pending/Overdue badge component
├── hooks/
│   └── useSheets.ts                    # React Query hook for Google Sheets data
├── lib/
│   └── sheetsClient.ts                 # Google Sheets API helper (server-side)
└── types/
    └── tracker.ts                      # TypeScript interfaces for CapEx/OpEx data
```

---

## Phase 1: CapEx Tracker (This PR)

### 1. Google Sheets API Integration

**`src/lib/sheetsClient.ts`**
- Uses Google Sheets API v4 with API key (read-only)
- Fetches sheet metadata (tab names, grid properties)
- Fetches range data for specific tabs
- Auto-discovers columns from header row
- Falls back to cached JSON if API fails

**`src/app/api/sheets/route.ts`**
- GET: Returns list of all sheet tabs with their column headers
- Caches response in `src/data/tracker/` as JSON (same pattern as venue data)

**`src/app/api/sheets/[tab]/route.ts`**
- GET: Returns all rows for a given tab name
- Query params: `spreadsheetId` (defaults to env var)
- Returns typed JSON with headers + rows

**Environment**:
- `GOOGLE_SHEETS_API_KEY` — standard API key with Sheets API enabled
- `GOOGLE_SHEETS_SPREADSHEET_ID` — the workbook ID from the URL

### 2. CapEx Data Model

**`src/types/tracker.ts`**
```typescript
interface CostLineItem {
  category: string;           // e.g. "Construction", "Consultants"
  description: string;        // Line item detail
  supplier?: string;          // Vendor name
  forecastAmount: number;     // Budgeted / quoted amount
  actualAmount: number;       // What was actually paid
  variance: number;           // forecast - actual (positive = under budget)
  status: 'forecast' | 'quoted' | 'invoiced' | 'paid';
  date?: string;              // Invoice/payment date
  notes?: string;
}

interface CapExSummary {
  totalBudget: number;
  totalSpent: number;
  totalCommitted: number;     // Quoted + invoiced but not yet paid
  totalRemaining: number;
  burnPercentage: number;
  categories: CategorySummary[];
  signals: FinancialSignal[];  // Over-budget warnings, investment alerts
}

interface FinancialSignal {
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  amount?: number;
}
```

### 3. CapEx Views

**`/tracker` landing page**
- Hero summary cards (matching existing `BigStat` / `StatRow` patterns)
  - Total Budget | Total Spent | Remaining | Burn %
- Burn rate progress bar (matching existing occupancy bar pattern)
- Financial signals section (over-budget alerts, additional investment needed)

**Budget Summary Cards** (using existing Card/CardContent pattern):
- Total CapEx Budget (forecast total)
- Spent to Date (actual total)
- Committed (quoted/invoiced, not yet paid)
- Remaining Budget
- Burn Rate (% of budget consumed)
- Additional Investment Signal (if actuals tracking above forecast)

**Cost Table** (using existing `data-table` CSS class):
- Columns: Category | Description | Forecast | Actual | Variance | Status
- Row-level colour coding: green (under budget), amber (close), red (over)
- Category grouping with subtotals
- Sortable by any column

**Burn Chart** (Recharts, matching existing chart patterns):
- Cumulative spend line vs budget line over time
- Area fill between forecast and actual
- Months on X-axis, AUD on Y-axis

**Variance Chart**:
- Horizontal bar chart showing variance per category
- Green bars = under budget, red bars = over budget
- Net position highlighted

**Cash Signals Panel**:
- Cards with clear financial alerts
- "Construction is 12% over budget — $X additional investment needed"
- "Current burn rate suggests $X total CapEx vs $Y budgeted"
- Projected total based on current trajectory

### 4. Navigation

Update home page to include a "Financial Tracker" card/link alongside the venue grid. Add a tabbed navigation within `/tracker` for CapEx | OpEx | Pricing views.

---

## Phase 2: OpEx View (Future)

- Monthly operational cost breakdown
- Fixed vs variable costs
- Revenue projections vs operating costs
- Break-even timeline visualisation
- Cash runway indicator

## Phase 3: Pricing & Breakeven (Future)

- Integrates existing `forecastUtils.ts` data
- Benchmark pricing from venue data (already captured)
- Breakeven analysis with multiple scenarios
- Market positioning chart (Slow Folk vs comparables)
- Uses real venue data from the existing benchmarking tool

---

## Design Principles

1. **Match existing style exactly** — Open Runde font, same Card/BigStat/StatRow patterns, same chart styling, same colour palette (gray-1 through gray-4, semantic colours for status)
2. **Same animation patterns** — `section-animate` class with staggered delays
3. **Same responsive approach** — `page-container` class, mobile-first grid
4. **Same data architecture** — server-side API routes with JSON cache fallback, React hooks for data fetching
5. **Progressive enhancement** — starts read-only (Route 1), designed so Route 2 write-back is additive, not a rewrite

---

## Implementation Steps (This PR)

1. Create branch, set up environment config for Sheets API
2. Build `sheetsClient.ts` (Google Sheets API helper)
3. Build API routes (`/api/sheets`, `/api/sheets/[tab]`)
4. Create types (`tracker.ts`)
5. Create `useSheets` hook
6. Build tracker page shell with tab navigation
7. Build CapEx components (BudgetSummary, CostTable, BurnChart, VarianceChart, CashSignals)
8. Wire up CapEx page with real sheet data
9. Add tracker link to home page
10. Test, commit, push

---

## Google Sheets Access Strategy

### Development (MCP)
The Google Sheets MCP connector is already set up as a custom connector. During development, we can use it to:
- Inspect sheet structure and tab names
- Read data for building/testing components
- Eventually write data back for Route 2

### Production (Sheets API v4)
For the deployed app:
1. Enable the Google Sheets API in Google Cloud Console
2. Create an API key (or reuse existing Google Maps key if Sheets API is enabled on it)
3. Set `GOOGLE_SHEETS_API_KEY` and `GOOGLE_SHEETS_SPREADSHEET_ID` in `.env.local`
4. Ensure the spreadsheet is shared as "Anyone with the link can view"

The app will auto-discover all tabs and columns from the sheet at runtime, so no hardcoded structure is required — it adapts to whatever exists in the workbook. Column mapping is inferred from header rows.
