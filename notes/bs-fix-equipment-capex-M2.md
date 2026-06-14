# BS Fix — Missing Equipment CapEx CF Outflows (M2)

**Status:** Open  
**Spreadsheet:** https://docs.google.com/spreadsheets/d/1hCd93r-aIGC2iSqpc0lR7tTxYcv9DAaPqiG2tUw1oP0/edit

---

## Root Cause

CF Fit-out Costs (Row 18) only contains:
- $217,415 pre-period actuals (Jan Y0)
- $530,100 builder instalments ($132,525 × 4, Sep–Dec Y0) → **Total: $747,515**

Missing: **$216,378** in equipment balance payments (deposits already captured in pre-actuals).

BS Row 24 "Unpaid Capex Accrual" = **$331,016** is a manual plug masking the gap. Both the CF outflows AND the plug zero-out are needed.

---

## Equipment Balances to Add (incl. GST)

| Month | Item | Supplier | Balance to Add |
|-------|------|----------|---------------|
| Jun Y0 | Pool Filtration | Brauer Swim | **$115,653** |
| Sep Y0 | Pool Manufacturer | Eco Plunge | $30,198 |
| Sep Y0 | Pool Cooling | Bergs | $10,250 |
| Sep Y0 | Sauna Heater | IKI | $6,417 |
| Sep Y0 | Sauna Materials | SDS/Cedar | $40,000 |
| Oct Y0 | IT/Admin Equipment | — | $5,500 |
| Oct Y0 | Furniture | — | $5,500 |
| Oct Y0 | Towel Stock | — | $2,860 |

Sep subtotal: **$86,865** · Oct subtotal: **$13,860** · Total: **$216,378**

---

## Exact Edits — Apply in Google Sheets

### Cash Flow tab

| Cell | Old | New | Notes |
|------|-----|-----|-------|
| `H18` | 0 | **115,653** | Brauer Swim balance (Jun) |
| `K18` | 132,525 | **219,390** | +$86,865 Sep equipment |
| `L18` | 132,525 | **146,385** | +$13,860 Oct equipment |
| `O18` | 747,515 | **963,893** | Annual total (update manually if not auto-summing) |
| `L19` formula | `=ROUND(SUM($I$18:$K$18)/11,0)` | `=ROUND(SUM($H$18:$K$18)/11,0)` | Extends to pick up Brauer Jun GST in Oct BAS |

> Q19 auto-updates from L18 change — no edit needed.

### Balance Sheet tab — zero the plug

| Cell | Old | New |
|------|-----|-----|
| `C24` | 331,016 | **0** |
| `D24` | 331,016 | **0** |
| `E24` | 331,016 | **0** |
| `F24` | 331,016 | **0** |
| `G24` | 331,016 | **0** |
| `H24` | 331,016 | **0** |

---

## Verification

After applying all edits, check **Balance Sheet Row 43** (`=C34-C41`):

- **~$0** → done ✓
- **~+$134,000** → professional fees paid during build (Jan–Oct Y0) also missing from CF; trace CF Professional Fees row vs Capital Costs tab paid amounts
- **~–$331,000** → plug zeroed but CF outflows didn't register; check O18 SUM range

GST note: L19 formula update adds ~$19,670 in GST claimable on equipment (Oct BAS). Q19 picks up Oct equipment GST automatically (Jan Y1 BAS).
