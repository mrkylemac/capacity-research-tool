# Forecast Data Scripts

## Fetch Forecast Data from Google Sheets

The `fetch-forecast.ts` script pulls forecast data from your Google Sheets workbook and stores it locally as JSON.

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

The page at `/forecast-comparison` automatically loads this file to display comparisons.

### Updating Forecasts

Re-run the script whenever your Google Sheet changes. The forecast comparison page will use the latest data on next page load.
