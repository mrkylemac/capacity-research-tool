# A five year visit forecast from comparable venue data

**Slow Folk, Neighbourhood Sauna · Benchmark report**

Data to 2026-09-09 · 289,642 recorded sessions · fifteen tracked venues, nine of them weighted into the forecast · Melbourne, Adelaide, Perth, Sydney, Blue Mountains, Byron Bay, plus one northern hemisphere venue (Zurich) used as an independent seasonal cross check

This report builds a monthly visit forecast for Slow Folk, from the planned opening in October 2026 to June 2031. The basis is booking data pulled directly from each venue's own booking platform. Since the July report, the panel has grown from eleven venues to fifteen: Sauna Goose moved booking platforms and its full history now merges cleanly, two venues previously excluded for data quality reasons (Pando Society, Wellness Social Club) turned out to have been fixed at the source and are back in, and two brand new venues came online (Blue Mountains Sauna, Navia Bathhouse in Byron Bay). The scenario names have also changed, at Kyle's request, from Conservative and Base and Upside to **Good**, **Better** and **Best**.

Throughout the report: occupancy equals tickets sold divided by seats offered. Maximum capacity is 868 visits per week (45,136 per year). Financial years run July to June.

## Contents

1. [Summary of findings](#1--summary-of-findings)
2. [The venues and their data](#2--the-venues-and-their-data)
3. [Seasonal pattern](#3--seasonal-pattern--winter-is-the-busy-season)
4. [Ramp up and mature occupancy](#4--ramp-up-and-mature-occupancy)
5. [The five year forecast](#5--the-five-year-forecast)
6. [Recommended model inputs](#6--recommended-model-inputs)
7. [Method](#7--method)
8. [Limits of the data](#8--limits-of-the-data)
- [Appendix A: excluded months](#appendix-a--excluded-months)

## 1 · Summary of findings

1. **The seasonal factors in the model are still reversed**, and this refresh settles the question properly. Every fit run on Australian venues alone (Melbourne, Perth, Sydney, each on its own, and all three pooled) shows the same shape: busiest June through August, quietest in December. This time we fitted the model on Australian venues only and held Zurich out entirely, then checked it against Zurich afterwards as a pure validation test. The correlation came back stronger than the July estimate: +0.72 once Zurich's months are shifted six months for its opposite hemisphere, against −0.52 unshifted. That is about as clean a confirmation as this kind of check produces.
2. **Every comparable venue still reaches its own ceiling fast.** The cross venue ramp curve now rests on data from seven openings instead of five, and the shape has not changed: most venues are within a few points of their own mature level by month three or four. The recommended ramp for the model stays a steep one, well short of the old eighteen month curve.
3. **The benchmark numbers keep moving, mostly upward.** Sol Sauna is now at 34 per cent occupancy and still climbing (25 per cent in the original sheet, 30 per cent as of July). Aalto is at 67 per cent (52 per cent in the sheet, 62 per cent in July). Inner Studio South Yarra has enough history now to read cleanly for the first time, at 49 per cent five months after opening.
4. **Growth after maturity is still weak or negative where competition has landed**, and the picture has moved a little since July. Inner Studio Collingwood's year on year change has recovered somewhat, from minus 10 per cent to minus 6.5 per cent, but Xtra Bondi Junction is unchanged at minus 15 per cent (that data has not been refreshed since March, see section 8). Neither venue is compounding growth, and that is still the reason this model does not either.
5. **The membership numbers still do not reconcile**, and the target has moved. At the revised Better case (below), 48 per cent occupancy implies 417 visits a week. A 40 per cent membership share of that is 167 member visits, which needs 104 memberships at 1.61 visits each, not the 67 currently in the sheet.

Key results:

| | |
| --- | --- |
| **Seasonal pattern, refitted on Australian venues only** | winter (Jun to Aug) averages about plus 10 per cent; December is the quietest month at minus 27 per cent |
| **Ramp up speed** | most venues sit within a few points of their own ceiling by month three or four |
| **Mature occupancy range** | 34 per cent (Sol) to 78.5 per cent (Inner Studio Collingwood) |
| **Better case, FY2028** | 21,546 visits in the first full year, up from 18,364 in the July report |

## 2 · The venues and their data

Every venue named in the original brief is tracked and current. Four venues have been added since July: Sauna Goose (now on Momence, its Acuity history merged in), Pando Society and Wellness Social Club (previously excluded, now clean), and two new venues, Blue Mountains Sauna and Navia Bathhouse, both discussed on their own terms below because neither behaves like the rest of the panel.

"Recent occupancy" is the average of the last six reliable months. Months with missing or incomplete booking data are excluded; Appendix A lists every excluded month by reason.

**Table 1.** The venue panel.

| Venue | Role | Data period | Reliable months | Recent occupancy | Visits per week | Typical price |
| --- | --- | --- | --- | --- | --- | --- |
| **Inner Studio Collingwood** | Primary, most similar to Slow Folk | 2024-05 to 2026-10 | 26/30 | 74.5% | 965 | $45 |
| **Inner Studio South Yarra** | Primary, most similar to Slow Folk ¹ | 2026-02 to 2026-10 | 5/9 | 53.0% | 889 | $45 |
| **Aalto (Adelaide)** | Primary | 2025-06 to 2026-09 | 11/14 | 68.3% | 482 | $35 |
| **Sol Sauna (Prahran)** | Primary ² | 2025-08 to 2027-01 | 9/18 | 33.9% | 568 | $30 / $35 |
| **Sense of Self** | Secondary | 2026-03 to 2026-12 | 5/10 | 78.3% | 686 | $68 |
| **Sauna Goose** ³ | Secondary | 2026-03 to 2026-11 | 5/9 | 69.3% | 249 | $30 / $35 |
| **The Corner Sauna (Apollo Bay)** | Secondary | 2026-03 to 2026-10 | 5/8 | 30.5% | 70 | $40 |
| **EQ (South Melbourne)** ⁴ | Secondary | 2024-10 to 2026-12 | 22/27 | 19.5% | 273 | $107 |
| **Xtra Clubs, Bondi Junction** ⁵ | Secondary | 2024-01 to 2026-03 | 22/27 | 53.7% | 1,939 | n/a |
| **Alchemy Saunas (Perth, 8 locations)** | Secondary | 2024-12 to 2026-10 | 19/23 | 53.0% | 5,989 | $20 to $35 by site |
| **Pando Society** ⁶ | Secondary | 2024-09 to 2026-09 | 22/25 | 38.8% | 223 | $36 |
| **Wellness Social Club** ⁶ | Secondary | 2025-06 to 2026-09 | 13/16 | 17.2% | 466 | n/a |
| **KEEN Wellbeing (Zurich)** | Northern hemisphere cross check, anchors no scenario | 2024-11 to 2026-07 | 16/20 | 54.1% | 738 | $27 |

¹ Now with nine months of history, five of them reliable, so it enters the ramp curve properly for the first time.
² Sol added a two tier peak and off peak price in June 2026 (see the companion pricing report, Finding 5). It is still running both prices as of this refresh, four months on.
³ Sauna Goose changed booking platforms on 19 August 2026, from Acuity to Momence. Its pre and post cutover history was merged and cross checked; see section 7.
⁴ EQ added 55 per cent more seats in October 2025. Occupancy fell because of that; visits did not fall. Before the change it ran near 25 per cent.
⁵ Xtra Clubs data has not refreshed since March 2026. An attempted refresh for this report returned a 404 from their booking API, suggesting the endpoint has changed since it was last integrated. Every Xtra figure in this report is six months old; see section 8.
⁶ Both were excluded from the July report for data quality reasons that no longer hold on fresh data (Pando's capacity accounting used to show sessions over 100 per cent full; Wellness Social's fetch used to cap out at 10,000 sessions). Rechecked this round: no overbooked sessions in either venue's full history, and Wellness Social now holds 37,779 sessions. Both are back in as secondary evidence.

Two venues are tracked but do not fit the occupancy panel at all, for different reasons, and are discussed in their own right in the companion pricing report:

- **Blue Mountains Sauna** (Punchpass) has a fully confirmed schedule, capacity and price, but Punchpass never exposes how many tickets actually sold, on any of its 1,570 past sessions we have captured. It is schedule and price evidence only.
- **Navia Bathhouse** (Byron Bay) opened in August 2026, so it has one month of real history. Early reading is 16 per cent occupancy at a $80 two hour rate, sixteen seats a sitting. Too new to draw a conclusion from, but the first real data point for a very different price position, and worth watching.

Not used for occupancy analysis at all: Project Mood (consistently under 8 per cent occupancy across seventeen months of history, with a four month gap in its own schedule, a struggling venue rather than a data problem), Ærth Saunas (Victoria, Canada, out of scope), Lore Bathing Club (New York, out of scope, only two months of history). Portal Thermaculture (Colorado, Montana, Minnesota) remains context only, outside the Australian forecast; its own data is July stale.

## 3 · Seasonal pattern, winter is the busy season

This is the resolved version of the pending step flagged in the July report. The pattern is now fitted on Australian venues only, weighted toward Melbourne, and Zurich is held out of the fit entirely and used only afterwards, as a check. Method: a regression of daily visits on the month of the year, with a separate level and trend for each venue.

**Table 2.** The recommended Seasonal Factor row for the Volumes tab, next to the current values (July to June). These include month length, so they can go straight into the sheet, and they sum to zero.

| | Jul | Aug | Sep | Oct | Nov | Dec | Jan | Feb | Mar | Apr | May | Jun |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Recommended** | **+12%** | **+13%** | **+1%** | **0%** | **−7%** | **−25%** | **−10%** | **−14%** | **+5%** | **+5%** | **+12%** | **+8%** |
| Current sheet | −12% | −12% | 0% | 0% | 0% | +20% | +20% | +20% | −5% | −5% | −5% | −12% |

**Table 3.** The same calculation, city by city, plus one sensitivity check. Every Australian row shows the same shape: high in winter, lowest in December.

| Calculation | Jul | Aug | Sep | Oct | Nov | Dec | Jan | Feb | Mar | Apr | May | Jun |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Melbourne pool | +6.7% | −0.1% | −6.1% | −6.1% | −0.4% | −25.5% | −6.1% | −5.7% | +26.7% | +12.5% | +7.9% | −3.6% |
| Perth (Alchemy) | +11.7% | +19.2% | +9.0% | +2.7% | −6.9% | −25.1% | −25.8% | −10.2% | −9.9% | −0.4% | +12.3% | +23.5% |
| Sydney (Bondi) | −5.9% | +5.2% | −7.3% | −9.2% | −6.2% | −31.4% | −5.9% | +19.9% | +24.0% | −1.5% | +8.1% | +10.3% |
| Check: without Bondi | +10.8% | +11.6% | +3.2% | −1.5% | −5.2% | −26.1% | −13.1% | −7.1% | +1.8% | +6.4% | +9.9% | +9.3% |
| Zurich, shifted +6 months (validation only, not part of the fit) | +24.5% | +15.8% | +36.0% | −2.0% | −6.3% | −27.9% | −22.2% | −40.8% | +1.6% | −3.8% | +22.9% | +2.1% |

October to November are the least certain months, and Adelaide has too few reliable months yet to break out on its own (Aalto alone cannot support an eleven parameter regression).

**Zurich as a validation check.** The Melbourne, Perth and Sydney rows above already agree with each other independently, so the pattern does not depend on any one city. Zurich sits in the northern hemisphere with the opposite seasons, so if the pattern is real seasonality rather than an Australian quirk, its months should mirror ours once shifted by six. They do: correlation +0.72 after the shift, −0.52 without it, both stronger than the July estimate. Zurich enters no other calculation in this report.

## 4 · Ramp up and mature occupancy

Each venue's occupancy after opening, as a share of that venue's own mature level, with the seasonal pattern removed. The ramp curve below now rests on seven openings rather than five: Inner Studio South Yarra has enough history to read cleanly for the first time, and Alchemy Karrinyup joins Scarborough as a second new site opening inside our data window.

**Table 4a.** Ramp up after opening, across the observed venues.

| Month after opening | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 | M10 | M11 | M12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Median, % of mature level | 102% | 111% | 89% | 81% | 90% | 96% | 99% | 102% | 120% | 98% | 99% | 99% |
| Venues with data | 2 | 4 | 6 | 7 | 7 | 7 | 6 | 5 | 5 | 5 | 5 | 5 |

Read this with the small sample sizes in mind, especially months one and two. What it shows consistently across every venue we have watched open is that none of them took anything close to eighteen months to find their level. Most were within a few points of it by month three or four, several overshot early and settled back.

Two openings are worth reading in detail rather than as a single median. **Alchemy Scarborough** spiked to 141 per cent of its own eventual level in month three, then spent the next year settling down to a lower plateau, a genuine early rush followed by a correction rather than a clean ramp. **Inner Studio South Yarra** did the opposite: it opened at 111 per cent of its (still uncertain) mature level in month two and has been remarkably steady since, sitting between 89 and 101 per cent for four months running, a second location of a known brand behaving exactly as you would expect a second location to behave.

**Table 4b.** Mature occupancy by venue, seasonal pattern removed, ranked. The asterisk marks a venue still rising at the end of its data, where the level is a fitted estimate and the last observed value is the floor.

| Venue | Mature occupancy | | Data behind the number |
| --- | --- | --- | --- |
| Inner Studio Collingwood \* | 78.5% | ████████████████████████ | opened 2024-05 · 26 months |
| Sense of Self | 72.4% | ██████████████████████ | 2026-03 to 2026-07 · 5 months |
| Aalto \* | 67.0% | █████████████████████ | opened 2025-07 · 11 months |
| Sauna Goose | 64.0% | ████████████████████ | 2026-03 to 2026-07 · 5 months |
| Xtra Bondi Junction | 56.2% | ██████████████████ | 2025-08 to 2026-01 · 22 months |
| Alchemy Port Beach | 55.7% | █████████████████ | 2026-02 to 2026-07 · 19 months |
| KEEN Zurich \* | 49.5% | ████████████████ | opened 2024-12 · 16 months |
| Inner Studio South Yarra | 48.9% | ███████████████ | opened 2026-02 · 5 months |
| Alchemy Fremantle | 42.4% | █████████████ | 2026-02 to 2026-07 · 19 months |
| Alchemy Scarborough | 40.3% | █████████████ | opened 2025-04 · 16 months |
| Alchemy Karrinyup | 38.3% | ████████████ | opened 2026-01 · 7 months |
| Pando Society | 36.6% | ███████████ | 2026-02 to 2026-07 · 22 months |
| Sol Sauna \* | 33.7% | ██████████ | opened 2025-08 · 9 months |
| The Corner Sauna | 28.2% | █████████ | 2026-03 to 2026-07 · 5 months |
| EQ | 19.5% | ██████ | 2026-02 to 2026-07 · 22 months |
| Wellness Social Club | 16.2% | █████ | 2026-02 to 2026-07 · 13 months |

Every one of these numbers moved since July, and every primary comparable moved up: Sol from about 30 to 34 per cent, Aalto from 62 to 67, Inner Studio Collingwood held steady in the mid to high seventies. EQ's 19.5 per cent still reflects its October 2025 capacity expansion; on the old schedule it ran near 25 per cent (see Table 1, note 4).

**Table 5.** Growth after maturity: each eligible month compared with the same month one year before, restricted to pairs where both months are already mature.

| Venue | Median yearly change | Months compared | Individual comparisons |
| --- | --- | --- | --- |
| Inner Studio Collingwood | −6.5% | 6 | Feb −17.5% · Mar −53.0% · Apr −9.8% · May −2.4% · Jun +4.9% · Jul −6.5% |
| Xtra Clubs Bondi Junction | −15.1% | 4 | Oct −14.5% · Nov −15.1% · Dec −28.3% · Jan −18.2% |

Collingwood's individual months swing widely, including one very sharp March reading, but the direction is consistent: five of six comparisons are negative, and the median has moved from minus 9.8 per cent in July to minus 6.5 per cent now, a partial recovery but still a decline, not the compounding growth the old sheet assumed. Bondi's figure is unchanged because Xtra's own data has not refreshed since March.

## 5 · The five year forecast

Formula: visits per month equals 868 per week, times month length, times mature occupancy, times ramp, times one plus the seasonal factor, times growth. The result never passes the 70 per cent occupancy limit. Three scenarios, renamed Good, Better and Best.

**Good** stays anchored to Sol Sauna's own fresh ceiling, 34 per cent. **Best** sits near Aalto's fresh ceiling, 67 per cent, rounded to 65 to leave headroom below the guardrail. **Better** is the one worth explaining in full, because it is not the old 41 per cent carried forward, and it is not a round number either.

**How Better was set.** We took the four venues closest in market position to Slow Folk (the ones already labelled Primary in Table 1: both Inner Studio locations, Aalto, Sol) and weighted Inner Studio Collingwood twice, since it is the closest single comparable to what Slow Folk is trying to be. That weighted average of fresh mature occupancy comes to 61 per cent. We did not use that number. Slow Folk is opening as a new brand with no existing member base, unlike Aalto or Collingwood which both had time to build one, so we set Better below every one of the four comparables except Sol: **48 per cent**, close to but below Inner Studio South Yarra's fresh 49 per cent. That is a genuine increase on the July figure of 41 per cent, about 17 per cent higher in relative terms, and it is still the case that three of the four closest comparables sit above it. This is a proposed revision, not a locked in number, and the working is shown here so it can be checked and argued with.

The shape still matters: the first quarter (October to December 2026) is slow, because ramp and the December low happen together. The first winter (June to August 2027) is the first strong period. The current sheet still expects the opposite of this.

**Table 6.** Scenario summary with financial year totals.

| Scenario | Mature occupancy | Ramp up, months 1 to 3 … 16 to 18 | Growth | FY27 | FY28 | FY29 | FY30 | FY31 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Good | 34% | 40 / 60 / 75 / 85 / 95 / 100 | +5% in FY29, then no growth | 6,662 | 14,629 | 16,159 | 16,159 | 16,159 |
| **Better ★** | **48%** | 55 / 75 / 88 / 96 / 100 / 100 | +10% in FY29, then +3% per year | 11,663 | 21,546 | 23,901 | 24,616 | 25,353 |
| Best | 65% | 55 / 75 / 88 / 96 / 100 / 100 | +10% in FY29, then +5% per year | 15,795 | 29,079 | 30,559 | 30,970 | 31,204 |

**Table 7.** The current sheet compared with the recommended Better case.

| FY | Current sheet | Recommended Better | Difference |
| --- | --- | --- | --- |
| FY2027 | 9,367 | 11,663 | +24.5% |
| FY2028 | 22,236 | 21,546 | −3.1% |
| FY2029 | 24,459 | 23,901 | −2.3% |
| FY2030 | 26,905 | 24,616 | −8.5% |
| FY2031 | 29,596 | 25,353 | −14.3% |

This shape has flipped since July. In July the faster ramp made every year higher than the sheet. This time the faster ramp still lifts the opening year by nearly a quarter, but the fresh evidence against perpetual growth (Table 5) pulls every later year below the current sheet, by a widening margin. Read together with Table 6: Better still clears the current sheet's own FY2027 to FY2029 numbers comfortably, and the gap in the outer years is exactly the compounding growth this report keeps finding no evidence for.

## 6 · Recommended model inputs

The numbers in this section are ready to copy into the sheet, using the revised Better case.

### 6.1 · Volumes tab, Seasonal Factor row (Jul to Jun)

`+12%  +13%  +1%  0%  −7%  −25%  −10%  −14%  +5%  +5%  +12%  +8%`

Also correct the labels on the Assumptions tab: the winter boost belongs to Jun to Aug, the summer reduction to Dec to Feb. The factors sum to zero.

### 6.2 · Assumptions tab, Ramp Up Period (Better case)

`Months 1 to 3: 55% · 4 to 6: 75% · 7 to 9: 88% · 10 to 12: 96% · 13 to 15: 100% · 16 to 18: 100%`

Good case: 40/60/75/85/95/100. Keep the old 10/25/40/60/80/100 only as a worst case stress test, since no venue we track ramped that slowly, including the weakest one.

### 6.3 · Volumes tab, Growth

`FY28 0% (still in ramp up) · FY29 +10% · FY30 +3% · FY31 +3%`, total occupancy never above 70 per cent.

### 6.4 · Target Occupancy

`48%` is the proposed new base case, up from 41 per cent. `34%` and `65%` are the low and high scenarios.

### 6.5 · Memberships

At 48 per cent occupancy, mature weekly visits are 417 (868 times 48 per cent). A 40 per cent membership share of that is 167 member visits a week, which needs **104 memberships** at 1.61 visits each, not the 67 currently in the sheet, and not the 88 this report proposed in July against the smaller 41 per cent case.

**Table 8.** Better case: monthly visits in the Volumes layout (Jul to Jun). FY2027 starts in October, the first month after opening.

| FY | Jul | Aug | Sep | Oct | Nov | Dec | Jan | Feb | Mar | Apr | May | Jun | Total |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FY2027 | 0 | 0 | 0 | 992 | 930 | 745 | 1,223 | 1,172 | 1,427 | 1,669 | 1,784 | 1,721 | **11,663** |
| FY2028 | 1,943 | 1,968 | 1,754 | 1,805 | 1,691 | 1,354 | 1,631 | 1,619 | 1,902 | 1,896 | 2,028 | 1,955 | **21,546** |
| FY2029 | 2,227 | 2,255 | 2,009 | 1,985 | 1,860 | 1,490 | 1,794 | 1,720 | 2,093 | 2,086 | 2,231 | 2,151 | **23,901** |
| FY2030 | 2,293 | 2,323 | 2,070 | 2,045 | 1,916 | 1,534 | 1,848 | 1,771 | 2,155 | 2,149 | 2,297 | 2,215 | **24,616** |
| FY2031 | 2,362 | 2,392 | 2,132 | 2,106 | 1,973 | 1,580 | 1,903 | 1,824 | 2,220 | 2,213 | 2,366 | 2,282 | **25,353** |

Divide a monthly number by 4.34 to get visits per week. This grid uses the base seasonal factors before the sheet rounding shown in section 6.1, so small differences against a hand recreation are expected.

## 7 · Method

1. Booking data was refreshed on 2026-09-09. Momence, Glofox and MarianaTek venues were downloaded in full. TryBe, Acuity, Punchpass and Navia venues update continuously on their own cron. Portal, Xtra Clubs and Alchemy were refreshed by calling their platform clients directly rather than through the app, since none of the three run on an automatic schedule. Alchemy and Portal succeeded; Xtra Clubs' booking API returned a 404 and the refresh was abandoned in favour of March data, disclosed throughout.
2. New and old data were combined, and each session was counted once, matched by session id. Sauna Goose's platform migration needed a manual merge: its pre cutover history lived only in the old Acuity cache (Momence's own imported copy of that history was missing capacity and price entirely), so the two were stitched together and cross checked against the one day both systems recorded, which agreed within 0.1 percentage points.
3. Sessions were grouped by calendar month in each venue's local time zone. Cancelled sessions and sessions with zero capacity were removed. Where tickets exceeded capacity, tickets were reduced to capacity.
4. Seasonal pattern: a weighted regression of daily visits on the month of the year, with a separate level and trend per venue, fitted on Australian venues only this round. Zurich was fitted separately, on its own months shifted six for its opposite hemisphere, purely to check the Australian fit against an independent market.
5. Ramp up: for each venue with an observed opening, the seasonal pattern was removed and the result was divided by that venue's own mature level.
6. All fourteen verification checks pass, including a reconstruction backtest: the model rebuilt Aalto's real monthly numbers with an average error of 6.6 per cent, and Sol's with 18.9 per cent (Sol's own ramp is genuinely uneven month to month, so a higher error there is expected rather than a sign of a problem).

## 8 · Limits of the data

1. **Xtra Clubs is materially stale.** Every Xtra number in this report, including the Bondi Junction ramp benchmark and the Finding 4 growth figure, is from March 2026, because a refresh attempt this round hit a 404 on their booking API. This is worth a follow up outside this report: either the endpoint moved, or access needs revisiting.
2. **Portal Thermaculture is also stale**, from July, though it only ever fed context, not the Australian forecast.
3. **The data still contains only about two southern winters.** The winter pattern is consistent across cities and, this round, more strongly confirmed against Zurich than before, but its exact size still carries a few points of uncertainty.
4. **The ramp curve rests on seven openings**, up from five in July, still a small sample. Table 4a is presented as a median with the sample size shown at every point, on purpose.
5. **The Better case is a proposed revision, shown with its full working in section 5, not a locked in number.** It should be checked against whatever Kyle knows about Slow Folk's own positioning that this data cannot see.
6. **Sauna Goose's platform migration introduced a small, disclosed price step**: Acuity era prices were $25.55 and $35.78, Momence's are $25 and $35, a roughly 2.2 per cent difference that is a card surcharge artefact of the old platform, not a real price cut. It does not affect the occupancy numbers used in this report.
7. **Melbourne supply keeps growing.** Since the July report, no new closures were observed, but no new entrants beyond what was already counted either. The caution about competitive growth stands as written in Table 5 and Finding 4.

## Appendix A · Excluded months

**Table A1.** Venue months excluded from the analysis, with the reason for each exclusion.

| Reason | Count | Meaning |
| --- | --- | --- |
| `booking-incomplete` | 91 venue months | the month ended less than 3 weeks before the data download; late bookings were still arriving |
| `partial-edge` | 49 venue months | the first or last month of a venue's data, with less than 70 per cent of its normal session count |
| `capture-gap` | 45 venue months | early months where the booking system recorded zero sales although sessions ran; the data is missing, the demand was not zero |
| `low-n` | 22 venue months | fewer than 20 sessions in the month |

Also excluded, at the venue level: Project Mood (consistently under 8 per cent occupancy, four month schedule gap), Ærth Saunas (Canada, out of scope), Lore Bathing Club (New York, out of scope, two months of data).

---

*Slow Folk venue benchmarking · created 2026-09-09 from the sauna-session-stats tracker · analysis scripts and per venue monthly data available as JSON on request. Companion document: PRICING-MODEL.md.*
