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

Based on your Slow Folk pricing model, the script expects:

**Sheet: "Pricing & Breakeven"**
Column A (Metric Name) | Column B (Value)
- `Operating Only` → $27,738 (monthly)
- `Combined` → $39,251 (monthly)  
- `Combined + Profit` → $45,138 (monthly)
- `ARPV` → $34.81
- `Weekly Visits` → 345
- `Monthly Revenue` → $51,993.83

**Sheet: "Venue Capacity"**
Column A (Metric Name) | Column B (Value)
- `Venue Occupancy %` → 35%
- `Peak Occupancy %` → 59%
- `Weekly Visits` → 345
- `Sessions Per Week` → (calculated from your sessions/week)

**Sheet: "Cash Flow (Monthly)"**
- Row 1: Headers with `Month` and `Revenue` (or `Forecast`)
- Rows 2+: Your monthly revenue projections

### Mapping Your Spreadsheet

The script will look for these exact row names (case-insensitive):
- **Breakeven targets**: "Operating Only", "Combined", "Combined + Profit"
- **Pricing**: "ARPV", "Weekly Visits"  
- **Capacity**: "Venue Occupancy %", "Peak Occupancy %"

### Output

Data is saved to: `src/data/forecast.json`

The page at `/forecast-comparison` loads this file to compare against real venue benchmarks.

### Use Case

1. Your Google Sheet contains **Slow Folk estimates** (breakeven targets, revenue projections, capacity assumptions)
2. The `/forecast-comparison` page lets you select **real venues** (Inner Studio, Lore Bathing Club, etc.)
3. Compare their actual performance to validate if your Slow Folk estimates are realistic

### Updating Estimates

Re-run the script whenever your Slow Folk business plan changes. The validation page will use the latest estimates on next page load.
