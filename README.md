# Slow Folk Benchmarking Tool

A benchmarking tool for comparing real venue booking data against Slow Folk's financial model. Pulls data from the Momence API and calculates key metrics for validation.

## Quick Start

```bash
# Install dependencies
yarn

# Start development server
yarn dev
```

The app will be available at `http://localhost:5173`

## Configuration

Edit `src/config/api.ts` to configure the Momence API:

```typescript
export const API_CONFIG = {
  baseUrl: 'https://readonly-api.momence.com/host-plugins/host',
  defaultHostId: '49448',
  sessionTypes: ['course-class', 'fitness', 'retreat', 'special-event', 'special-event-new'],
  pageSize: 100,
};
```

## How It Works

### Querying Data

1. Enter a Host ID (default: 49448)
2. Select a date range (From/To dates)
3. Click "Fetch Data"

### Venue Summary

The summary provides key insights including:
- **Volume metrics**: Total visitors, weekly/daily averages, visits per hour
- **Occupancy**: Overall rate with trend analysis (recent vs older months)
- **Demand distribution**: Weekday vs weekend split
- **Performance range**: Best and lowest performing months
- **Pricing**: Average ticket price and weighted ARPV

Operating hours are inferred from session times for visits/hour calculations.

### Metrics Calculation

All metrics are computed client-side from the fetched session data:

| Metric | Formula |
|--------|---------|
| Total Sessions | Count of all sessions in range |
| Total Tickets Sold | Sum of `ticketsSold` |
| Total Capacity | Sum of `capacity` |
| Avg Utilisation % | (Tickets Sold / Capacity) × 100 |
| Total Revenue | Sum of (ticketsSold × fixedTicketPrice) |
| Avg Revenue per Visit | Total Revenue / Total Tickets Sold |
| Avg Revenue per Session | Total Revenue / Total Sessions |
| Sessions per Day | Total Sessions / Days in Range |
| Operating Since | Earliest session date |

### Monthly Aggregation

Sessions grouped by month with per-month calculations for sessions, tickets, capacity, utilisation, and revenue.

### Class Type Analysis

Sessions grouped by class name with breakdowns for session count, total visitors, utilisation, and revenue per class type.

### Demand Patterns

Sessions grouped into 2-hour time slots (4:30–6:30, 6:30–8:30, etc.) with utilisation bands:
- **High**: ≥70%
- **Medium**: ≥40%
- **Low**: <40%

### Venue Configuration

Auto-detected from session data:
- Venue name (from location)
- Most common session type, duration, price, capacity
- Operating hours range
- Sessions per day average

## Deployment

Deploy to Vercel:

1. Push to GitHub
2. Import project in Vercel dashboard
3. Deploy (zero config needed)

Or via CLI:

```bash
yarn build
npx vercel --prod
```

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** + Shadcn UI - Styling
- **Recharts** - Charts
- **TanStack Query** - Data fetching
- **date-fns** - Date manipulation

## Project Structure

```
src/
├── components/
│   ├── FiltersPanel.tsx        # Query inputs
│   ├── SummaryCards.tsx        # Top-level KPIs
│   ├── VenueOverview.tsx       # Auto-detected venue config
│   ├── MonthlyTable.tsx        # Monthly performance
│   ├── ClassTypeAnalysis.tsx   # Breakdown by class type
│   ├── DemandPatterns.tsx      # Time slot analysis
│   ├── CapacityUtilisation.tsx # Capacity charts
│   ├── RevenueSection.tsx      # Revenue analysis
│   └── DataStatus.tsx          # Loading/error states
├── config/
│   └── api.ts                  # API configuration
├── hooks/
│   └── useSessions.ts          # Data fetching with auto-pagination
├── lib/
│   ├── momenceClient.ts        # API client
│   ├── metricsCalculator.ts    # Metric computation
│   └── utils.ts                # Utilities
├── types/
│   └── momence.ts              # TypeScript types
└── pages/
    └── Index.tsx               # Main dashboard
```
