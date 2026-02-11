# Forecast Validation Scripts

## Fetch Slow Folk Estimates from Google Sheets

The `fetch-forecast.ts` script pulls your Slow Folk business plan estimates from Google Sheets and stores them locally as JSON for validation against real venue benchmarks.

### Prerequisites

1. Your Google Sheet must be publicly accessible (Share > Anyone with link can view)
2. Required sheets with exact names:
   - `Pricing & Breakeven`
   - `Venue Capacity`
   - `Cash Flow (Monthly)`

### Usage

```bash
yarn fetch-forecast [SPREADSHEET_ID]
```

**Example:**
```bash
yarn fetch-forecast 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

The Spreadsheet ID is found in your Google Sheets URL:
```
https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
```

### Sheet Format

**Pricing & Breakeven / Venue Capacity:**
- Column A: Metric names
- Column B: Numeric values

Expected metrics:
- `Total Revenue`
- `Avg Ticket Price`
- `Target Utilization`
- `Sessions Per Week`

**Cash Flow (Monthly):**
- Row 1: Headers
- Must include columns: `Month`, `Forecast` (or `Projected` or `Revenue`)
- Rows 2+: Monthly data

### Output

Data is saved to: `src/data/forecast.json`

The page at `/forecast-comparison` loads this file to compare against real venue benchmarks.

### Use Case

1. Your Google Sheet contains **Slow Folk estimates** (breakeven targets, revenue projections, capacity assumptions)
2. The `/forecast-comparison` page lets you select **real venues** (Inner Studio, Lore Bathing Club, etc.)
3. Compare their actual performance to validate if your Slow Folk estimates are realistic

### Updating Estimates

Re-run the script whenever your Slow Folk business plan changes. The validation page will use the latest estimates on next page load.
