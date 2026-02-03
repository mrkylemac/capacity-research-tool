# Momence API Explorer

A web dashboard for exploring Sauna & Ice session data from the Momence readonly API.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Configuration

### API URL

Edit `src/config/api.ts` to configure the Momence API endpoint:

```typescript
export const API_CONFIG = {
  // Base URL for the Momence API
  baseUrl: 'https://api.momence.com/v1',
  
  // Default host ID
  defaultHostId: '49448',
  
  // Page size options
  pageSizeOptions: [20, 50, 100],
  defaultPageSize: 50,
};
```

### Mock Data

By default, the app uses mock data for development. To use the real API:

1. Update `src/hooks/useSessions.ts`:
   ```typescript
   useSessions({ useMockData: false })
   ```

2. Ensure the Momence API supports CORS or use a proxy.

## How It Works

### Date Range & Query

1. Enter a Host ID (default: 49448)
2. Select a date range (From/To dates)
3. Choose a page size (20, 50, or 100)
4. Click "Fetch Data"

The app queries the Momence API with:
- `hostId` - Venue identifier
- `startsAtFrom` - ISO date string for range start
- `startsAtTo` - ISO date string for range end
- `page` - Pagination page number
- `pageSize` - Results per page

### Metrics Calculation

All metrics are computed client-side from the fetched session data:

| Metric | Formula |
|--------|---------|
| Total Sessions | Count of all sessions in range |
| Total Tickets Sold | Sum of `ticketsSold` for all sessions |
| Total Capacity | Sum of `capacity` for all sessions |
| Avg Utilisation % | (Total Tickets Sold / Total Capacity) × 100 |
| Total Revenue | Sum of (ticketsSold × fixedTicketPrice) |
| Avg Revenue per Visit | Total Revenue / Total Tickets Sold |
| Avg Revenue per Session | Total Revenue / Total Sessions |
| Sessions per Day | Total Sessions / Days in Range |
| Sessions per Week | Sessions per Day × 7 |

### Monthly Aggregation

Sessions are grouped by month (using `startsAt`), with per-month calculations for:
- Session count
- Tickets sold
- Capacity
- Utilisation %
- Revenue

### Demand Patterns

Sessions are grouped into 2-hour time slots based on `startsAt`:
- 4:30–6:30, 6:30–8:30, 8:30–10:30, etc.

For each slot:
- Average tickets per session
- Capacity
- Utilisation band (High ≥70%, Medium ≥40%, Low <40%)

## Tech Stack

- **React 18** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS** + DaisyUI - Styling
- **Recharts** - Charts
- **TanStack Query** - Data fetching
- **date-fns** - Date manipulation

## Project Structure

```
src/
├── components/
│   ├── FiltersPanel.tsx      # Query inputs
│   ├── SummaryCards.tsx      # Top-level KPIs
│   ├── VenueOverview.tsx     # Venue configuration
│   ├── MonthlyTable.tsx      # Monthly performance
│   ├── DemandPatterns.tsx    # Time slot analysis
│   ├── CapacityUtilisation.tsx # Capacity charts
│   ├── RevenueSection.tsx    # Revenue analysis
│   └── DataStatus.tsx        # Loading/error states
├── config/
│   └── api.ts                # API configuration
├── hooks/
│   └── useSessions.ts        # Data fetching hook
├── lib/
│   ├── momenceClient.ts      # API client
│   ├── metricsCalculator.ts  # Metric computation
│   └── mockData.ts           # Mock data generator
├── types/
│   └── momence.ts            # TypeScript types
└── pages/
    └── Index.tsx             # Main dashboard
```
