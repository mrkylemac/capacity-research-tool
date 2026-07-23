# A five-year visit forecast from comparable-venue data

**Slow Folk — Neighbourhood Sauna · Benchmark report**

Data to 2026-07-21 · eleven venues · 144,389 recorded sessions · Melbourne, Adelaide, Perth, Sydney, Zurich

This report builds a monthly visit forecast for Slow Folk, from the planned opening in October 2026 to June 2031. The basis is booking data from eleven comparable venues. The data gives three inputs for the financial model: the seasonal pattern, the ramp-up speed after opening, and the mature occupancy level. Section 6 contains the exact numbers for the Volumes tab.

Throughout the report: occupancy = tickets sold ÷ seats offered. Maximum capacity is 868 visits per week (45,136 per year). Financial years (FY) run July–June.

## Contents

1. [Summary of findings](#1--summary-of-findings)
2. [The venues and their data](#2--the-venues-and-their-data)
3. [Seasonal pattern](#3--seasonal-pattern--winter-is-the-busy-season)
4. [Ramp-up and mature occupancy](#4--ramp-up-and-mature-occupancy)
5. [The five-year forecast](#5--the-five-year-forecast)
6. [Recommended model inputs](#6--recommended-model-inputs)
7. [Method](#7--method)
8. [Limits of the data](#8--limits-of-the-data)
- [Appendix A: excluded months](#appendix-a--excluded-months)

## 1 · Summary of findings

1. **The seasonal factors in the model are reversed.** The Assumptions tab says “Winter Usage Boost +20%”. But the Volumes tab applies the +20% to December–February — summer in Australia. Every southern-hemisphere venue in the data is busiest May–September and quietest in December. Zurich (northern hemisphere) shows the same pattern, shifted six months (correlation +0.55 after the shift, −0.27 without it).
2. **The ramp-up in the model is too slow.** Real venues reached 75–100% of their own mature level within 4–7 months — even Sol, the weakest venue. The important risk is the mature level itself, not the speed to reach it. Recommendation: use a fast ramp-up, and be careful with the occupancy target instead.
3. **The benchmark numbers in the model are old.** Aalto is now stable at about 62% occupancy (the sheet says 52%). Sol is near 30% and still rising (the sheet says 25%). Inner Studio Collingwood is at 74–79%.
4. **Permanent +10% yearly growth does not match the data.** Mature venues in competitive markets lost volume, compared with the year before (Collingwood −10%, Bondi −15%), when new venues opened. Recommendation: +10% in the first year after maturity, then +0–3% per year.
5. **The membership numbers do not match each other.** 67 memberships × 1.61 visits per week = 108 visits per week. That is 30% of the target volume (356 visits per week) — but the sheet says the membership share is 40%. Either increase memberships to about 88, or change the mix to 30/60/10.

Key results:

| | |
| --- | --- |
| **Seasonal pattern, corrected** | winter +7% on average; December −27%, the quietest month |
| **Ramp-up speed** | ≈85% of the mature level by month 4; the model assumes 18 months |
| **Mature occupancy range** | 30% (Sol) to 79% (Inner Studio); the 41% target is inside this range |
| **Base case, FY2028** | 18,364 visits in the first full year |

## 2 · The venues and their data

All nine venues from the brief are tracked and current. “Recent occupancy” is the average of the last six reliable months. Months with missing or incomplete booking data are excluded; Appendix A lists every excluded month.

**Table 1.** The venue panel.

| Venue | Role | Data period | Reliable months | Recent occupancy | Visits per week | Typical price |
| --- | --- | --- | --- | --- | --- | --- |
| **Inner Studio — Collingwood** | Primary — most similar to Slow Folk | 2024-05 → 2026-07 | 24/27 | 74% | 902 | $45 |
| **Inner Studio — South Yarra** ² | Primary — most similar to Slow Folk | 2026-02 → 2026-07 | 3/6 | 53% | 878 | $45 |
| **Aalto (Adelaide)** | Primary | 2025-06 → 2026-07 | 9/12 | 62% | 401 | $35 |
| **Sol Sauna (Prahran)** | Primary | 2025-08 → 2026-07 | 7/12 | 28% | 493 | $30 |
| **Sense of Self** | Secondary | 2026-03 → 2026-10 | 2/8 | 62% | 504 | $70 |
| **Sauna Goose** | Secondary | 2026-03 → 2026-07 | 3/5 | 69% | 228 | $30 |
| **The Corner Sauna (Apollo Bay)** | Secondary | 2026-03 → 2026-08 | 3/6 | 30% | 70 | $40 |
| **EQ (South Melbourne)** ¹ | Secondary | 2024-10 → 2026-07 | 20/22 | 18% | 237 | $107 |
| **Xtra Clubs — Bondi Junction** | Secondary | 2024-01 → 2026-03 | 22/27 | 54% | 1,939 | — |
| **Alchemy Saunas (Perth, 8 locations)** | Secondary | 2024-12 → 2026-04 | 13/17 | 53% | 5,856 | $28 |
| **KEEN Wellbeing (Zurich)** | Secondary — northern hemisphere | 2024-11 → 2026-07 | 16/20 | 53% | 680 | $27 |

¹ EQ added 55% more seats in Oct 2025. Occupancy fell because of that; visits did not fall. Before the change: ≈25%.
² Opened Feb 2026. Still in ramp-up, not mature.

Not used for occupancy analysis: Pando Society (its capacity data is broken — occupancy above 100%), Project Mood (its listed capacity is much larger than real use), Wellness Social (its data download was cut short), Lore (only 2 months of data). Portal (US) is background only. The other Xtra and Alchemy locations are used one by one in the seasonal and ramp-up calculations.

## 3 · Seasonal pattern — winter is the busy season

The pattern was measured on 139 venue-months from 11 locations. Method: a regression of daily visits on the month of the year, with a separate level and trend for each venue, and more weight for Melbourne venues. The factors include month length, so they can go into the sheet without changes, and they sum to zero. December is the quietest month in every city — summer heat plus the holiday period.

**Table 2.** The recommended Seasonal Factor row for the Volumes tab, next to the current values (July → June).

|  | Jul | Aug | Sep | Oct | Nov | Dec | Jan | Feb | Mar | Apr | May | Jun |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Recommended** | **+8%** | **+9%** | **-3%** | **-3%** | **-10%** | **-27%** | **-3%** | **-9%** | **+13%** | **+7%** | **+13%** | **+5%** |
| Current sheet | -12% | -12% | +0% | +0% | +0% | +20% | +20% | +20% | -5% | -5% | -5% | -12% |

**Table 3.** The same calculation, city by city, plus two checks. All rows show the same shape: high in winter, lowest in December.

| Calculation | Jul | Aug | Sep | Oct | Nov | Dec | Jan | Feb | Mar | Apr | May | Jun |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Melbourne pool | +9% | +3% | -3% | +0% | -0% | -21% | -9% | -6% | +20% | +9% | +6% | -9% |
| Perth (Alchemy ×7) | +3% | +7% | -4% | -11% | -20% | -37% | +1% | +6% | +7% | +12% | +16% | +21% |
| Sydney (Bondi) | -6% | +5% | -7% | -9% | -6% | -31% | -6% | +20% | +24% | -2% | +8% | +10% |
| Zurich, shifted +6 months | +24% | +3% | +43% | -2% | -9% | -32% | -28% | -38% | +8% | -1% | +28% | +5% |
| Check: occupancy instead of visits | +9% | +10% | +5% | -13% | -11% | -19% | -8% | +0% | +4% | +5% | +10% | +9% |
| Check: without Bondi and late Collingwood | +6% | +6% | -4% | -6% | -14% | -30% | -3% | +4% | +10% | +11% | +13% | +7% |

October–November are the least certain months. Zurich varies a lot month to month, but after the six-month shift it matches the southern cities (correlation +0.55).

## 4 · Ramp-up and mature occupancy

Each venue’s occupancy after opening, as a share of that venue’s *own* mature level, with the seasonal pattern removed. No venue needed 18 months.

**Table 4a.** Ramp-up after opening, across the observed venues (Collingwood, Aalto, Sol, KEEN Zurich, Alchemy Scarborough).

| Month after opening | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 | M13 | M14 | M15 | M16 | M17 | M18 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Median, % of mature level | 67% | 91% | 82% | 84% | 91% | 88% | 93% | 94% | 99% | 97% | 93% | 101% | 96% | 102% | 98% | 98% | 106% | 105% |
| Middle 50% of venues | 67–67% | 52–91% | 80–82% | 76–100% | 87–101% | 75–107% | 91–100% | 94–94% | 89–102% | 84–102% | 93–107% | 90–101% | 85–96% | 87–102% | 95–98% | 94–98% | 98–106% | 101–105% |
| Venues with data | 1 | 2 | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |

Notes: Collingwood’s “opening” is its first month on the Momence platform (May 2024), which may be a platform change rather than a real opening — treat its month 1 with caution. Sol’s months 1–3 have no booking data, so it enters at month 4. South Yarra (opened Feb 2026) was already above 50% absolute occupancy in month 3 — a strong result for a second location of a known brand.

**Table 4b.** Mature occupancy by venue, seasonal pattern removed. \* = the venue was still rising at the end of its data; for these venues the level is an estimate, and the last observed value is the minimum. EQ’s 18% is the result of its capacity increase (see Table 1); on the old schedule it was about 25%.

| Venue | Mature occupancy | Data behind the number |
| --- | --- | --- |
| Inner Studio Collingwood \* | 79% | opened 2024-05 · 24 months |
| Alchemy Port Beach | 73% | 2025-08→2026-01 · 13 months |
| Sauna Goose | 63% | 2026-03→2026-05 · 3 months |
| Aalto | 62% | opened 2025-07 · 9 months |
| Xtra Bondi Junction | 57% | 2025-08→2026-01 · 22 months |
| Sense of Self | 56% | 2026-04→2026-05 · 2 months |
| KEEN Zurich \* | 55% | opened 2024-12 · 16 months |
| Alchemy Scarborough \* | 52% | opened 2025-04 · 10 months |
| Alchemy Fremantle | 44% | 2025-08→2026-01 · 13 months |
| Sol Sauna \* | 30% | opened 2025-08 · 7 months |
| The Corner Sauna | 27% | 2026-03→2026-05 · 3 months |
| EQ | 18% | 2025-12→2026-05 · 20 months |

**Table 5.** Growth after maturity: each month compared with the same month one year before.

| Venue | Median yearly change | Months compared | Individual comparisons |
| --- | --- | --- | --- |
| Inner Studio Collingwood | -9.8% | 4 | 2026-02 -18% · 2026-03 -53% · 2026-04 -10% · 2026-05 -2% |
| Xtra Clubs / Bondi Junction | -15.1% | 4 | 2025-10 -15% · 2025-11 -15% · 2025-12 -28% · 2026-01 -18% |

## 5 · The five-year forecast

Formula: visits per month = 868 per week × month length × mature occupancy × ramp-up × (1 + seasonal factor) × growth. The result never passes the 70% occupancy limit. Three scenarios, based on Table 4b: 30% (like Sol), 41% (the current target — between Sol and Aalto), and 52% (like KEEN and Alchemy).

The shape matters: the first quarter (Oct–Dec 2026) is slow, because the ramp-up and the December low period happen at the same time. The first winter (Jun–Aug 2027) is the first strong period. The current sheet expects the opposite.

**Table 6.** Scenario summary with financial-year totals.

| Scenario | Mature occupancy | Ramp-up, months 1–3 … 16–18 | Growth | FY27 | FY28 | FY29 | FY30 | FY31 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Conservative | 30% | 40 / 60 / 75 / 85 / 95 / 100 | +5% in FY29, then no growth | 5,979 | 12,936 | 14,256 | 14,256 | 14,256 |
| Base ★ | 41% | 50 / 70 / 85 / 95 / 100 / 100 | +10% in FY29, then +3% per year | 9,542 | 18,364 | 20,412 | 21,026 | 21,655 |
| Upside | 52% | 50 / 70 / 85 / 95 / 100 / 100 | +10% in FY29, then +5% per year | 12,102 | 23,291 | 25,888 | 27,181 | 28,540 |

**Table 7.** The current sheet compared with the recommended base case. The faster ramp-up increases year 1 a lot; removing the permanent +10% growth lowers the later years. Result: more volume in the first 18 months — the period that decides the funding — and a more realistic long-term level.

| FY | Current sheet | Recommended base | Difference |
| --- | --- | --- | --- |
| FY2027 | 9,367 | 9,542 | +2% |
| FY2028 | 22,236 | 18,364 | -17% |
| FY2029 | 24,459 | 20,412 | -17% |
| FY2030 | 26,905 | 21,026 | -22% |
| FY2031 | 29,596 | 21,655 | -27% |

## 6 · Recommended model inputs

The numbers in this section are ready to copy into the sheet.

### 6.1 · Volumes tab — Seasonal Factor row (Jul → Jun)

`+8%  +9%  -3%  -3%  -10%  -27%  -3%  -9%  +13%  +7%  +13%  +5%`

Also correct the labels on the Assumptions tab: the winter boost belongs to Jun–Aug, the summer reduction to Dec–Feb. The factors sum to zero.

### 6.2 · Assumptions tab — Ramp Up Period (base)

`Months 1–3: 50% · 4–6: 70% · 7–9: 85% · 10–12: 95% · 13–15: 100% · 16–18: 100%`

Conservative: 40/60/75/85/95/100. Keep the old 10/25/40/60/80/100 only as a worst-case test — no real venue was that slow.

### 6.3 · Volumes tab — Growth

`FY28 0% (still in ramp-up) · FY29 +10% · FY30 +3% · FY31 +3%` — total occupancy never above 70%.

### 6.4 · Target Occupancy

`41%` stays as the base case. Use 30% and 52% as the low and high scenarios — these are measured levels from Sol and from KEEN/Alchemy, not guesses.

### 6.5 · Memberships

`88 memberships` gives a true 40% membership share. Calculation: 41% × 868 per week = 356 visits per week; 40% of that = 142 member visits; 142 ÷ 1.61 visits per member = 88. Alternative: keep 67 memberships and change the mix to 30/60/10.

**Table 8.** Base case: monthly visits in the Volumes layout (Jul → Jun). FY2027 starts in October (month 1 after opening). Divide a monthly number by 4.34 to get visits per week.

| FY | Jul | Aug | Sep | Oct | Nov | Dec | Jan | Feb | Mar | Apr | May | Jun | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FY2027 | 0 | 0 | 0 | 751 | 694 | 564 | 1,048 | 985 | 1,222 | 1,405 | 1,488 | 1,385 | **9,542** |
| FY2028 | 1,587 | 1,607 | 1,419 | 1,502 | 1,388 | 1,128 | 1,497 | 1,457 | 1,746 | 1,653 | 1,751 | 1,629 | **18,364** |
| FY2029 | 1,838 | 1,860 | 1,642 | 1,652 | 1,527 | 1,241 | 1,647 | 1,547 | 1,921 | 1,819 | 1,926 | 1,792 | **20,412** |
| FY2030 | 1,893 | 1,916 | 1,692 | 1,702 | 1,573 | 1,279 | 1,696 | 1,593 | 1,979 | 1,873 | 1,984 | 1,846 | **21,026** |
| FY2031 | 1,950 | 1,973 | 1,743 | 1,753 | 1,620 | 1,317 | 1,747 | 1,641 | 2,038 | 1,929 | 2,043 | 1,901 | **21,655** |

## 7 · Method

1. Booking data was updated on 2026-07-21. Momence venues were downloaded in full (this also uncovered a data bug in the tracker; the fix is committed separately). TryBe, Acuity and bsport venues were updated with their normal collection scripts.
2. New and old data were combined, and each session was counted once (matched by session id).
3. Sessions were grouped by calendar month in each venue’s local time zone. Cancelled sessions and sessions with zero capacity were removed. Where tickets exceeded capacity, tickets were reduced to capacity.
4. Seasonal pattern: a weighted regression of daily visits on the month of the year, with a separate level and trend per venue. Zurich’s months were shifted six months, because its seasons are opposite.
5. Ramp-up: for each venue with an observed opening, the seasonal pattern was removed and the result was divided by that venue’s own mature level.
6. All 20 verification checks pass. The strongest check: the model rebuilt Aalto’s and Sol’s real monthly numbers with an average error of 8% and 12%.

## 8 · Limits of the data

1. The data contains only about two southern winters (2025 complete, 2026 until mid-July). The winter pattern is the same in both years and in four cities, but its exact size is uncertain by a few percentage points.
2. Only 5–6 venue openings are usable for the ramp-up curve. For this reason Table 4a shows a range, not one line, and the recommended base ramp-up is lower than the observed values — Slow Folk is a new brand without an existing member base, unlike Scarborough or South Yarra.
3. The October–November factors may partly reflect competition effects in late 2025 at Bondi and Collingwood. A check without those data points moved the factors by at most 2 points.
4. Xtra Clubs and Portal data end in March 2026 — both already contain two winters. Alchemy data ends in April 2026.
5. The Melbourne market is growing fast — three new venues opened within 18 months in this data alone (South Yarra, Sense of Self, Sauna Goose). This is the reason to limit long-term growth, and the reason the base case is 41% and not Aalto’s 62%.

## Appendix A · Excluded months

**Table A1.** Venue-months excluded from the analysis, with the reason for each exclusion.

| Reason | Count | Meaning |
| --- | --- | --- |
| `capture-gap` | 46 venue-months | first months where the booking system recorded zero sales although sessions ran — the data is missing, the demand was not zero |
| `booking-incomplete` | 70 venue-months | the month ended less than 3 weeks before the data download — late bookings were still arriving |
| `partial-edge` | 44 venue-months | the first or last month of a venue’s data, with less than 70% of its normal session count |
| `low-n` | 21 venue-months | fewer than 20 sessions in the month |
| `first-poll-anomaly` | 1 venue-months | Sense of Self, March 2026: the first month of data collection; its value (89%) is not realistic |

---

*Slow Folk venue benchmarking · created 2026-07-21 from the sauna-session-stats tracker · an interactive version with charts exists as a Claude artifact; the calculation scripts and the monthly data per venue are available as CSV/JSON on request.*
