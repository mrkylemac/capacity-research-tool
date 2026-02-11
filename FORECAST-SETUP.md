# Forecast Validation Setup Guide

## Your Slow Folk Data → Google Sheets Format

Based on your pricing model, here's how to structure your Google Sheets for the forecast scraper:

### Sheet 1: "Pricing & Breakeven"

Format: Two columns (A = Label, B = Value)

| Column A | Column B | Source from your model |
|----------|----------|------------------------|
| `Operating Only` | 27738 | Your "Operating Only" target ($27,738/mo) |
| `Combined` | 39251 | Your "Combined" target ($39,251/mo) |
| `Combined + Profit` | 45138 | Your "Combined + Profit" target ($45,138/mo) |
| `ARPV` | 34.81 | Your calculated ARPV |
| `Weekly Visits` | 345 | Your target weekly visits |
| `Monthly Revenue` | 51993.83 | Your projected monthly revenue |

### Sheet 2: "Venue Capacity"

Format: Two columns (A = Label, B = Value)

| Column A | Column B | Source from your model |
|----------|----------|------------------------|
| `Venue Occupancy %` | 35 | Your overall venue occupancy (35%) |
| `Peak Occupancy %` | 59 | Your peak hours occupancy (59%) |
| `Weekly Visits` | 345 | Your target weekly visits |
| `Sessions Per Week` | 46.5 | Your hrs/week ÷ avg session length |

### Sheet 3: "Cash Flow (Monthly)"

Format: Table with headers in row 1

| Month | Revenue |
|-------|---------|
| Jan 2026 | 51994 |
| Feb 2026 | 51994 |
| Mar 2026 | 54000 |
| ... | ... |

(Use your monthly growth projections)

## How to Create the Sheets

### Option 1: From Scratch

1. Create a new Google Sheet
2. Create 3 tabs: "Pricing & Breakeven", "Venue Capacity", "Cash Flow (Monthly)"
3. Fill in the data exactly as shown above (labels must match exactly)
4. Share > Anyone with link can view

### Option 2: Export from Your Current Model

If your current model uses different names:
1. Create a new "Export" sheet in your workbook
2. Use formulas to pull values: `='Your Sheet'!B10` (reference your actual cells)
3. Label rows with the exact names above
4. This keeps your working model separate from the export format

## Running the Import

Once your sheets are set up:

```bash
yarn fetch-forecast YOUR_SPREADSHEET_ID
```

The script will:
- ✓ Find your 3 sheets
- ✓ Parse the key metrics
- ✓ Save to `src/data/forecast.json`
- ✓ Show you a summary

## What You'll See in the Validation Page

The `/forecast-comparison` page will show:

**Key Comparison Table:**
- Weekly Visitors: Benchmark vs 345 (your target)
- Venue Occupancy: Benchmark vs 35% (your target)
- ARPV: Benchmark vs $34.81 (your target)
- Monthly Revenue: Benchmark vs $51,994 (your projection)

**Breakeven Validation:**
- Operating Only ($27,738/mo) - Does benchmark revenue exceed this?
- Combined ($39,251/mo) - Can benchmark cover debt service?
- Combined + Profit ($45,138/mo) - Does benchmark hit profit target?

**Key Takeaway:**
Automatically generated narrative comparing the benchmark venue's performance to your Slow Folk targets, helping you validate if your 345 weekly visits and 35% occupancy assumptions are realistic.

## Example Interpretation

If you select **Inner Studio** as benchmark and it shows:
- 408 weekly visitors (vs your 345 target) ✓
- 28.6% utilization (vs your 35% target) ⚠️
- $30 ARPV (vs your $34.81 target) 📊
- $40,215/mo revenue (vs your $51,994 target)

**Investor narrative:**
> "Inner Studio achieves 408 weekly visitors with only 28.6% capacity utilization, generating $40K/month. Slow Folk targets 345 weekly visitors at 35% occupancy with premium pricing ($34.81 vs $30 ARPV), projecting $52K/month. This validates that our visitor targets are achievable, with pricing premium accounting for the revenue difference."

The validation shows your numbers are grounded in real venue performance, just with different positioning (premium pricing vs volume).
