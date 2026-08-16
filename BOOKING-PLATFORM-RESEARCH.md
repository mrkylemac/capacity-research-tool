# Venue Coverage Expansion: Platform Feasibility Memo

**Date:** 2026-08-06
**Scope:** 7 platform buckets, 52 AU sauna venues probed live, every finding adversarially re-verified by a second agent
**Bottom line:** 68 → 89 venues is achievable with confident builds. Three of the seven buckets are worth building immediately. One is dead. The single biggest risk is not access, it is silently corrupting the utilisation metric with derived capacity.

---

## 0. How to read this memo

Every platform below was probed with live curl against real venue endpoints, then a second agent independently re-ran the load-bearing calls and tried to break the conclusion. **Where the verifier contradicted the probe, the verifier's finding is what appears here, and I flag it.** Three probes had accuracy-critical claims overturned. Two had their conclusions strengthened beyond what the probe claimed.

Anything I could not stand up is labelled **UNPROVEN**.

---

## 1. Coverage maths

### 1.1 The denominator is wrong, and it is wrong downward

Before the ranking: the saunaaustralia.org.au directory materially undercounts trading sites. One Zenoti token returns the whole chain via `/api/Catalog/Centers`, and that revealed Soak operates 6 centres where the directory lists 2, and Nature's Energy 3 where the directory lists 1. Savu Saunas is 5 separate Tasmanian beach locations inside one Mindbody feed. TH7 is 7 Brisbane sites. Comma is 2, Navia is 2, Daylesford is 3 pop-up locations.

So "123 venues" is a directory artefact, not a market count. The recommended build set below reaches **21 additional directory entries but roughly 35 to 40 distinct trading sites.** Worth re-running Zenoti centre discovery across the whole directory as a cheap hygiene pass.

Also: 68 + the 52 venues probed = 120, not 123. Three directory entries are unaccounted for and should be reconciled.

### 1.2 Per platform unlock and running total

| # | Platform | Directory venues in bucket | Integrable | Running total | % of 123 | Effort (dev days) | Venues/day |
|---|---|---|---|---|---|---|---|
| — | *Current* | — | — | **68** | 55.3% | — | — |
| 1 | **Wix Bookings** | 9 | **+4** | 72 | 58.5% | 1.5 | 2.7 |
| 2 | **Rezdy** | (2 of ticketing bucket) | **+2** | 74 | 60.2% | 0.5 | 4.0 |
| 3 | **ibisRES** (Alba) | (1 of custom bucket) | **+1** | 75 | 61.0% | 0.5 | 2.0 |
| 4 | **Zenoti** | 9 | **+8** | 83 | 67.5% | 5.0 | 1.6 |
| 5 | **Mindbody V2 + marketplace** | 7 | **+3** | 86 | 69.9% | 2.5 | 1.2 |
| 6 | **Greenhouse** (bespoke) | (1 of custom) | **+1** | 87 | 70.7% | 1.0 | 1.0 |
| 7 | **FareHarbor** | (1 net new of ticketing) | **+1** ◆ | 88 | 71.5% | 1.0 | 1.0 |
| 8 | **Punchpass** | 1 | **+1** | 89 | 72.4% | 1.5 | 0.7 |
| 9 | **TH7** (bespoke) | (1 of custom) | **+1** | 90 | 73.2% | 1.5 | 0.7 |
| 10 | **GymMaster** | 1 | **+1** ◆◆ | 91 | 74.0% | 0.5 | 0 (sauna) |
| 11 | **HelmBot** (Cedar) | (1 of custom) | **+1** ◆ | 92 | 74.8% | 1.5 | 0.7 |
| — | **Fresha** | 5 | **0** | — | — | ∞ | 0 |
| — | **Humanitix** | (2 of ticketing) | **0** | — | — | owner key | 0 |
| — | **NetBookings** (Peninsula) | (1 of custom) | **0** | — | — | infeasible | 0 |
| — | **Navia** | (1 of custom) | **+1** ‡ | — | — | 1.0 | 1.0 |
| — | **Zenoti owner-key** (TotalFusion, Skin Bar) | 3 | **0** | — | — | owner key | 0 |
| — | Dead / no booking system / wrong domain | 7 | **0** | — | — | — | 0 |

◆ = tracked but **excluded from benchmark averages** (different metric class, see §5)
◆◆ = platform is a clean win, but the venue's actual sauna is walk-in and generates no booking record anywhere

**Realistic landing zone: 89 benchmark-eligible venues (72.4%), 92 tracked (74.8%).**

### 1.3 Ranked by venues per unit effort

1. **Rezdy** (4.0/day) — smallest absolute gain, but half a day of work and the cleanest proof of any platform in the round
2. **Wix Bookings** (2.7/day) — best combination of ratio, absolute count, and the only platform with **real backfillable history**
3. **Zenoti** (2.6/day counting trading sites, 1.6/day counting directory entries) — biggest absolute unlock, most expensive, most caveats
4. **ibisRES / Alba** (2.0/day) — one venue, but the only feed in the entire round that publishes a literal total-capacity field *and* returns zeros in the availability grid
5. **Mindbody** (1.2/day) — fragile, depends on Next.js internals that change on redeploy
6. **Greenhouse, FareHarbor** (1.0/day)
7. **Punchpass, TH7, HelmBot** (0.7/day)
8. **Fresha, Humanitix, NetBookings** (0) — do not build

‡ **Navia was overturned on 2026-08-14 and is built.** Byron Bay is benchmark-eligible on a derived
16-seat sitting; Prahran is tracked but schedule-only. See §2.7.

### 1.4 Unscoped platforms discovered mid-probe (all UNPROVEN)

Three platforms surfaced that nobody scoped, each blocking real venues:

- **Roller** — both TANK sites (Mooloolaba and Bli Bli) migrated off Wix Bookings to `ecom.roller.app/tankbathhouse`, product ids `879352` / `882081` confirmed in page HTML. The verifier tried to break the write-off and could not probe it: `ecom.roller.app` is an Angular SPA whose visible bundles (main 57KB) contain no availability paths, only a reference to `https://api.roller.app`. Real bundles load lazily. **Needs a browser XHR capture, not curl.** Potential +2 venues.
- **NetBookings** — The Bathhouse at Ground runs on `secure.netbookings.com.au/tourism/2205/`. Catalogue confirmed 200 with prices. The availability step was never reverse-engineered. Note Peninsula Hot Springs is the *same platform* and its anonymous API is confirmed dead (§2.7), so expectations should be low, but Ground is a different tenant and the check is an hour.
- **Periode** — The Sauna Project Sydney runs on `minside.periode.no/booking/VNUYORXhTrOSshhRLUbn/{sessionTypeId}`, an 884-byte SPA shell backed by Firebase (`projectId: periode-prod`). Data almost certainly arrives over Firestore listen channels, not REST. Fundamentally different integration shape to anything in the repo.

---

## 2. Per platform

### 2.1 Wix Bookings — FEASIBLE, low effort, build first

**Verdict:** feasible, high confidence. Verifier reproduced every load-bearing number to the exact seat.

**Working chain (three requests, anonymous):**

```
1. GET  https://{venueHost}/_api/v1/access-tokens
   → 200. apps["13d21c63-b5ec-5912-8397-c3a5ddb27a97"].instance  (Wix Bookings appDefinitionId)

2. POST https://www.wixapis.com/bookings/v2/services/query
   Headers: Authorization: {instance}   (no Bearer prefix), Content-Type: application/json
   Body:    {"query":{"paging":{"limit":100}}}
   → services[] with id, type (CLASS|APPOINTMENT), defaultCapacity, hidden, payment.fixed.price

3. POST https://www.wixapis.com/bookings/v1/availability/query      ← the one that matters
   Headers: same two only. No Origin, no Referer, no UA, no cookies.
   Body: {"query":{"filter":{"serviceId":["..."],"startDate":"...Z","endDate":"...Z"}}}
   → availabilityEntries[]: slot.sessionId, slot.startDate/endDate, slot.location.name,
     totalSpots, openSpots, bookable
```

**Capacity:** `totalSpots` per entry, authoritative and overriding `defaultCapacity`. Never read `defaultCapacity` (Hello Sauna has a service with defaultCapacity 12 returning slots at 12, 6, 5, 4, 3 and 2).
**Booked:** `totalSpots - openSpots`. Verified spread on KUUMA July 2026: (8,0)×34, (8,1)×11, (8,6)×10, (8,4)×8, (8,8)×4 — 460/632 seats = 72.8%. Phillip Island 294/526 = 55.9%. Daylesford 90.4%.

**History: yes, and this is unique.** Past sessions return with `openSpots` intact. KUUMA reads back to 2024-05-04 with a genuine booked spread. No other platform in this round offers backfillable history. This is the only integration that starts with data instead of a clock.

**Hard constraints the verifier found that the probe missed:**
- Mixing CLASS and APPOINTMENT serviceIds in one `availability/query` returns **400 INVALID_SERVICE_TYPE_PROVIDED**. Filter to CLASS-only before querying.
- 1000-entry response cap, silently truncated, `pagingMetadata.cursors` always empty, `cursorPaging.limit` rejects above 100. Must date-window. A 12-month Hello Sauna window returned exactly 1000 entries covering only 2.5 months with **no error field**.
- The probe's fallback collision mitigation (group by `startDate` + `location.name`, keep max totalSpots) is **unsafe and should be struck**: 329 of 502 Hello Sauna entries have `location: null`, so that key collapses 65% of the venue into one bucket. Use the curated `serviceIds` allow-list only.
- Probe claimed all four viable venues are `rateType: FIXED`. False: KUUMA has 3 VARIED services and Daylesford 2. They produced no sessions in the sampled window so revenue is unaffected today, but `fallbackPrice` must exist in config.

**Venue-by-venue:** KUUMA, Phillip Island, Daylesford working clean with zero service collisions. Hello Sauna working but publishes the same physical slot as parallel services on different scheduleIds (105 of 360 start+location keys collided) — needs a hand-curated allow-list or it reads a false 24.4%. TANK Mooloolaba and TANK Farm migrated to Roller (46 and 3 services, all `hidden:true`, every past slot 100% open across 639 and 105 entries). Ember Bathhouse on Fresha (200 with 0 services). Wandering Sauna is APPOINTMENT-only: 122 past entries all (1,1), zero carry `slot.sessionId`. Filtering on `slot.sessionId` presence cleanly excludes all 122.

**Effort: 1.5 days including backfill.**

---

### 2.2 Zenoti — FEASIBLE, medium-high effort, biggest unlock, most caveats

**Verdict:** feasible. **Verifier downgraded confidence from high to medium and overturned three validation claims, two of them in the accuracy-critical path. Trust the verifier.**

**Working chain:**

```
1. GET  https://{tenant}.zenoti.com/webstoreNew/services/{centerId}
   → 200 HTML with inline config: "webApiToken":"AN:thebanya|$ARD#...", "webApiUrl":"https://apiapac01.ap.zenoti.com/"
   Auth behaviour verified: bare token → 401, "apikey <token>" → 401, "Bearer <token>" → 200

2. GET  {webApiUrl}/api/Catalog/Centers                                    → whole chain, ids, timezones
3. GET  {webApiUrl}/api/Catalog/Services?centerId=..&Size=300              → Duration, Price.Final
4. GET  {webApiUrl}/api/Catalog/Therapists?centerId=..&ServiceId=..&Size=300
   → THE CAPACITY POOL. Total + DisplayName[]. Verified: BH1..BH22 (22), Bath01..Bath72 (72),
     ABath01..ABath48, ZEBath01..ZEBath70, MFM01..MFM15, "Social 1..8", "F Public BH 1..6"
5. POST {webApiUrl}/api/Catalog/Appointments/Availabletimes
   → OpenSlots[]: {Time, Available:true}. BINARY. No seat counts anywhere.
```

The "fake therapist" hypothesis from the earlier paused session is **correct and confirmed**. Bathhouse capacity really is modelled as pseudo-resources.

**Capacity and booked are both derived from a binary indicator. There is no numeric feed.** The verifier probed nine alternative paths to beat the derivation (`/AvailableSlots`, `/Centers/{id}/Capacity`, `/SlotAvailability`, `/Rooms`, `/Resources`, `/v1/centers/{id}/services/{id}/slots` — all 404; `/v1/appointments/availability` → 403 `{"ErrorCode":602}` owner-key territory). Derivation is the only anonymous route.

**Three verifier corrections that change the implementation:**

1. **Ship the per-resource sweep, not the group-size sweep.** The probe explicitly recommended the group probe as "the one to ship" and attributed disagreements to booking churn between sweeps. That explanation is false. The verifier reversed the sweep order and the same two Banya slots disagreed by the same amounts (11:00 group=11 vs per-resource=13; 13:00 group=15 vs 16). **The group probe systematically under-reports remaining, which inflates ticketsSold and utilisation.** Cost is comparable anyway: 22 per-resource calls vs 23 group calls on Banya.
2. **The far-future "zero-booking baseline" is not deterministic.** The probe tested one venue and generalised. On Banya, 2026-10-10 gave 10:00=9 while 2026-11-14 gave 10:00=18. A single far-future sample would have recorded capacity 9 where true capacity is 18, clamping ticketsSold to 0. **Take the max across several same-weekday far-future samples, and keep the staleness alarm (refresh whenever observed remaining exceeds stored baseline).**
3. **`RequestedTherapist` alone drives the per-resource narrowing; `TherapistId` is ignored.** The probe stated both were required. Harmless to send both, but do not encode the rule as gospel.

Also weakened: the pseudo-resource naming auto-detector (regex prefix + numeric suffix, >70% threshold) would misclassify Nature's Energy Glebe, whose 36-entry pool has many entries all named identically "Glebe Bathhouse" with no numeric suffix, mixed with `ZGBH35`/`ZGBH36`. `Total` is still correct, so this is an implementation caveat not a feasibility failure.

**Ground truth that does hold:** Banya 2026-08-07 11:00 was the one slot the plain aggregate call omitted. Both derivation methods returned remaining=0 for exactly that slot. Past dates return `OpenSlots: []` with no error (verified two past dates) so incremental caching is mandatory. `AvailableSlotSettings` advertises `MaxLookUpWeeks: 5` but 2026-10-20 and 2026-11-14 both returned full slot sets, which is what makes any baseline possible at all.

**Cohort:** 13 trading centres across 7 tenants. TotalFusion Platinum has **no bookable sauna inventory in Zenoti at all** (17 services per centre, mostly zero-duration category stubs, `/v1/classes/sessions` returns `total:0`) — their sauna is gym-membership access. Soak South Melbourne returns `Total=0` on every service, likely pre-opening. Both drop out.

**Request budget:** roughly pool-size calls per centre-pool-day. Run the full sweep **daily**, not every 30 minutes. The cheap sell-out signal is one N=1 aggregate call: a slot missing from it means remaining=0 exactly (verified against ground truth), so a 1-call check can run on the 30-minute beat.

**Effort: 5 days.** This is the most expensive build in the round and the one with the most ways to be quietly wrong.

---

### 2.3 Rezdy — FEASIBLE, half a day, best-proven finding in the round

**Verdict:** feasible. Seat numbers reproduced digit for digit by the verifier.

```
POST https://{tenant}.rezdy.com/availabilityAjax
Body (form-encoded): showdate=YYYY-MM-DD&productId={id}&quantity=1
Header REQUIRED: a browser User-Agent
→ 200 JSON: availability{date}{time}{productId}: {id, seatsAvailable, price[], hasConfirmedOrders, onHold}
```

**Verifier correction:** the probe's auth line ("none, X-Requested-With and Referer sent but not required") is wrong in a way that will waste an afternoon. A **default curl UA gets HTTP 405 with an AWS WAF human-verification CAPTCHA page.** A browser User-Agent alone flips it to 200. X-Requested-With and Referer genuinely are optional.

**Capacity:** not a field. Recovered from the product page's `<select class="input-quantities-list">` — highest `<option value>` = 5 for Salty Finn communal, `data-inventory-mode="SESSION_SEATS"`. Matches max-observed `seatsAvailable` of 5 across 18 sessions. Two independent sources agreeing.
**Remaining:** `seatsAvailable`, and the full range was observed: empty (5, `hasConfirmedOrders:false`), partial (3 and 1, true), and **genuinely sold out** (the 16 Aug Saunagus event, all three sessions at 0 with `hasConfirmedOrders:true`). **Rezdy keeps sold-out sessions in the feed.** That is the proof FareHarbor lacked.

**`hasConfirmedOrders` is the essential companion flag.** `seats=0 && !hasConfirmedOrders` means the slot is closed or resource-blocked and must be excluded from the denominator, not counted as 100% full. Without it, Salty Finn's six closed 9 August slots each register as sold out and wreck the average.

**Venue trap:** Salty Finn's communal (727967) and private (727969) products share one physical sauna. A private booking at 11:00/14:00/15:00/16:00 zeroes the communal seats and vice versa. They must be merged per timeslot or you double the session count and halve utilisation.

Wellness Afloat runs Rezdy (`thearkau`) *and* FareHarbor over apparently overlapping products. Naive ingestion of both double-counts that venue. Prefer Rezdy there (it has `hasConfirmedOrders`, FareHarbor has no equivalent).

---

### 2.4 FareHarbor — FEASIBLE, verifier upgraded it

**Verdict:** feasible. The probe honestly flagged its two weakest claims as unproven. **The verifier proved both, in FareHarbor's favour.**

```
GET https://fareharbor.com/api/v1/companies/{shortname}/items/                          → 200
GET .../items/{itemId}/calendar/{YYYY}/{MM}/                                            → 200, month per call
GET .../items/{itemId}/availabilities/date/{YYYY-MM-DD}/                                → 200, pks
GET .../items/{itemId}/availabilities/{availabilityPk}/                                 → 200  ← authoritative
   → availability.{bookable_capacity, reserved_capacity, blocks_included_bookable_capacity,
                   has_customers, is_sold_out, capacity}
```

No token, no cookie, no Referer. `/minimal/`, `/date-range/` and `/minimum-prices/` are all 404 — no bulk endpoint exists, iterate by day or use the calendar endpoint which embeds availabilities and covers a month per call (roughly 30x request reduction).

**Two upgrades the verifier delivered by finding busier operators outside the AU sauna cohort:**
- **The decrement is proven, not inferred.** `hawaiinautical` item 214395, avail 1822108516: `has_customers=true`, `bookable_capacity=1` on a real booked catamaran. `bookable_capacity` is unambiguously remaining and it decrements.
- **Sold-out sessions do not vanish.** `sailmaui` avail 2029962130 returns from the date endpoint with `is_sold_out=true`, `is_bookable=false`, `bookable_capacity=0`. The probe's scariest blocker (systematic low bias if sold-outs are hidden) is closed.

**One downgrade:** booked count is **not** retrievable. On a genuinely booked session with four customer_type_rates at `has_customers=true`, `customer_count`, `capacity_remaining` and `reservation_and_customer_count` were **all still null**. These are owner-auth-gated, not empty-book artefacts. The probe's proposed `sum(customer_count)` fallback is dead code. Only remaining is available; booked is always `capacity - bookable_capacity`.

**Never use `approximate_available_capacity`** from the list endpoint. It read 0 on every Wellness Afloat session while the detail endpoint said 8 for the same pk.

**No price at all** on any FareHarbor endpoint. Static config, same as Hapana.

**Total capacity is not a field** (`availability.capacity` was null on all three sessions checked: empty, booked, sold out). Seed from the item headline prose and `customer_type.note`, then track max-ever `bookable_capacity`. Note the verifier caught the probe stitching two items together here: the "Up to 8 people" note belongs to item 741356 (Sydney Exclusive), not 741354 (Sydney Collective) whose note is empty. So it is **two** corroborating sources for capacity 8, not three.

**Venue reality:** Float Away sells only Private Hire and Gift Cards. There are no shared-seat sessions, so "utilisation" there means slot occupancy, not seat fill. Different metric class (see §5).

---

### 2.5 Mindbody / Healcode — PARTIAL, and the prior "not feasible" finding is wrong

**Verdict:** partial. **The `mindbody_feasibility.md` note in MEMORY.md should be superseded.** The modern Schedules V2 widget does return capacity and booked count, anonymously, from plain Python urllib with no browser and no cookies.

```
1. GET  https://go.mindbodyonline.com/book/widgets/schedules/view/{widgetId}/schedule
   → 200. Parse the RSC flight stream for a 40-hex Next-Action id and two encrypted bound-arg blobs.

2. POST same URL
   Headers: Next-Action: <40-hex id>, Accept: text/x-component
   Body: multipart/form-data with the two blobs + {"fromDate":"...Z","toDate":"...Z","fetchClasses":"$h4"}
   → capacity (TOTAL) and numberRegistered (BOOKED) on every class object, plus
     startDateTime/endDateTime/duration/location/cancelled/bookable
```

Verifier reproduction: **316/316 Melt sessions and 391/391 Savu sessions with zero nulls**, hitting the identical session id and identical values the probe quoted (`cinst_11kRs19dftNusKJ1eR`, capacity 15, numberRegistered 1). This is the same shape as our existing Hapana `securityToken` step: scrape a token from the page, then call.

The verifier also found a **simplification the probe missed**: the 40-hex action id is a per-*build* constant, identical across Melt, Savu and Rapid (tied to `buildId qBa4EeR2NJwb0qBFkxUka`), not per-widget. Only the bound blob is per-page-load. Cache the id against the buildId and re-discover on miss.

**Marketplace index (the only route for 1Remedy):**
```
GET https://prod-mkt-gateway.mindbody.io/v1/search/class_times?filter.term={studio}&page.size=100&page.number={N}
→ class_time_capacity, class_time_openings, class_time_start_time/end_time/duration, class_time_mb_site_id
```
Every id/slug/date filter is silently ignored and dumps a global pool. `filter.term` is the only handle that works. Never send `sort=` (it destroys relevance). Liveness proven: marketplace and V2 pulled within the same hour agree exactly (cap15/open13 vs capacity15/registered2).

**Three verifier corrections that would break a poller built from the probe's sketch:**
1. **Future rows are at the END of the marketplace result set, not page 1.** Page 1 of `filter.term=1Remedy` contains zero future rows (spans 2024-09 to 2025-11). Future sessions live on pages 11-12 of 12. The sketch's "page 1 alone gave complete near-term coverage" would ship a poller that writes an empty feed forever. Page to the tail or bisect: 12 requests per venue per poll, not 1-3.
2. **Savu's five sites are in the CLASS NAME, not the location object.** All 391 sessions resolve to one location `{id: loc_11kQsAUdhzXAJ9NKAK, name: 'Savu Saunas'}`. The beaches are encoded as class names (Dial Park - Penguin, The Bluff Beach - Devonport, Burnie Foreshore Beach, Cooee Beach). The probe's instruction to "key on location.id not name, per the Portal Lyons lesson" would commit **precisely the Portal Lyons clobber it cites**, collapsing five Tasmanian venues into one. Key on name.
3. **`location` is a flight ref string `"$3"`, not an object,** on 315/316 Melt and 390/391 Savu sessions. Only the first inlines it. Any parser written from the probe's sample excerpt gets a string where it expects an object.

Also: `capacity` can be **0** on a live non-cancelled session (Melt 2026-08-09T04:45Z). Divide-by-zero guard required.

**Per-venue split (verifier made it harsher than the probe):**
- **FEASIBLE (3):** Melt (widget `965791273cf`), Savu (`0053410e69b`, 5 sites), 1Remedy (marketplace + Healcode join, verified slot-for-slot 13/13, 14/14, 14/14 after correcting a UTC-vs-AEST bucketing error)
- **PARK (1):** Saunaus. No widget embedded anywhere on their site. The probe claimed marketplace covers ~7 of 12 daily slots; the verifier measured **2-3 of 12, with one day entirely absent**. Treat as unusable, not degraded. The only complete route is `clients.mindbodyonline.com` behind a Cloudflare challenge, which is out of scope.
- **INFEASIBLE (3):** Contro/Lume, Life Hub, Rapid Recovery NT. All sell sauna as **appointments**, which have no seat concept in Mindbody. This is a data-model wall, not an access problem, and the verifier independently confirmed all three (0 hits for capacity across 115KB of Contro's appointments RSC; marketplace returns zero rows for site 5735564; Life Hub's 11 class rows are Open Gym/HYROX; Rapid's 10 are 100% creche).

**The legacy Healcode path the prior probe pinned its hopes on does not deliver.** `widgets.mindbodyonline.com/widgets/schedules/216403/load_markup` returns 89 real sessions with ISO times, but `div.bw-session__availability` was emitted 178 times and **non-empty zero times**. Times but never numbers.

**No price on any anonymous surface.** `class_time_drop_in_price` null on 1193/1193 rows, V2 objects have no price key. Static config.

**Fragility warning:** this depends on Next.js internals. It will break on a Mindbody redeploy in a way a stable REST endpoint would not. The poller needs a loud failure mode, not a silent empty window.

---

### 2.6 Punchpass + GymMaster — PARTIAL, and the most accurate report in the round

**Verdict:** partial. The verifier re-ran 25+ endpoints and found **zero overstated claims**, with several byte counts and parsed counts matching exactly.

**GymMaster: cleanest data source in the whole tool, wrong venue.**
```
GET https://{tenant}.gymmasteronline.com/portal/book/class          → 302, mints anonymous session_id
GET .../portal/account/book/class/times?session_id={sid}&companyid=4
   → max_students, num_students, spacesfree, percentfull, waitlist_count, price_numeric,
     arrival_iso, starttime, endtime, location, classname
GET .../portal/getclassnumbers?bid={id}    → 102 bytes, NO AUTH AT ALL (bare curl, no session, no cookie)
```
Verified: `max_students`/`num_students` non-null on 51/51 rows, invariant `num_students + spacesfree === max_students` held 51/51, including genuine sell-outs (24/24, waitlist 10). Zero derivation.

**But:** hard rolling 8-day window. `startdate`, `date`, `arrival`, `days` all probed — **all four returned a byte-identical 130,271-byte response.** No history ever. The cache *is* the history.

**And the killer:** B3's actual sauna is walk-in by design. Quoted verbatim from b3.fitness/recovery: "no need to book ahead." The contrast-therapy utilisation that would make B3 a sauna comparable does not exist as data on any platform. Only the studio classes and one "B3 Breath & Bath" class (max 24, $25) are measurable. The bookable infrared cabin (serviceid 33669) returns `capacity`, `max_attendees` and `spacesfree` as **empty strings on 42/42 slots**.

Worth building anyway as the reference implementation for a declarative adapter, and `companyid=2` on the same tenant is a second club ("Social Remedy", 96 class times) so the config surface is `tenant + companyid`.

**Punchpass: works, with a derivation step, and hides the round's most interesting history finding.**

No JSON API at all (`.json`, `?format=json`, `/api/classes` → 406/404). HTML scraping of `bmsauna.punchpass.com/classes?from_time=YYYY-MM-DD+HH:mm:ss+%2B1000`, 20 days per response, ~1.1MB each.

- **Remaining:** `<span class="gray label">8 SPOTS LEFT</span>` or `<span class="alert label">CLASS FULL</span>` (=0).
- **Capacity:** not published anywhere, not in HTML, not on the instance page, not in the .ics. Recovered by the far-future oracle. **The verifier validated this harder than the probe did:** grouping every course on a far-future page gave **29 courses, 29/29 with a perfectly constant spots-left value across a 20-day window, zero variance.** Course 204525 = 9 across 12 occurrences, and its near-term 2026-08-08 17:30 occurrence reads CLASS FULL → 9/9 sold. The oracle is sound. Simplification: `courseId` alone is a sufficient key; the probe's proposed `(courseId, weekday, HH:mm)` is over-specified.
- **History: exceptional schedule depth, zero utilisation.** `?from_time=2025-08-01` still returns 249 instances a year back, cancellations included (39 on the 2026-06-01 page, red CANCELLED label with the name struck through). But those historical rows carry **no badge at all**: 385/385 null on 2026-06-01, 249/249 null on 2025-08-01. **This is a denominator-only history.**
- **Bonus:** `bmsauna.punchpass.com/org/16281/calendars/all_classes.ics` returns 200 with a full `VTIMEZONE Australia/Sydney` block including AEST/AEDT RRULEs, stable UUID UIDs, `URL` linking back to the same instance ids the HTML uses, and `CANCELED - ` prefixes. Solves DST for free. ~9MB, poll daily.

**Two things the verifier added that the probe missed:**
1. **The badge disappears at session START, not end of day.** Server time 12:28 Sydney: the 12:00 session already had a null badge, the 12:30 session still read 8. BM Sauna runs a 30-minute cadence and the poller runs every 30 minutes, so the last observation can be 30 minutes stale and any late booking is lost forever. **Punchpass ticketsSold is a lower bound with a systematic downward bias.** The probe's claim that sessions polled while future give "real utilisation" is slightly optimistic.
2. **Cancelled instances carry `data-url=""` and therefore have no instance id.** The proposed parser extracts instanceId from `data-url`, which yields null for exactly the rows you want for the cancellation-rate metric. Fall back to `(date, time, courseId)` as the key. Once cancelled rows are excluded, every live future instance carries a badge (434/434 today-forward, 464/464 far-future).

---

### 2.7 Bespoke / custom — one strong win, one good win, one conditional, one trap

**ibisRES (Alba Thermal Springs) — the strongest capacity finding of the entire round.**
```
GET https://book.albathermalsprings.com.au/alba/Json_PackageTimes?date=2026-08-08&prodCode=Springs&places=1
   → packageTimes[]: {date, time "07.00", space (REMAINING, ZEROS INCLUDED), departureKey}
GET .../alba/Json_ProductPricing?prodCode=Springs
   → optionCode, name, priceInc "70.00", maxPlaces "50", departureKey
```
This is the only feed in the round where **both fields are published, non-null, and corroborated three ways.** `space` includes zeros so the complete session grid is visible, not just the bookable remainder (verified 2026-08-08: 07.00=29, 07.30=50, 08.00=16, 08.30=0, 09.00=6). And total capacity is **not merely max-observed**: `maxPlaces="50"` is a literal field in `Json_ProductPricing` on all four price options, attached to a per-occurrence `departureKey`, and the 2027-02-01 control returns 21 slots all at exactly 50.

Forward horizon runs at least six months, longer than anything we integrate. Past dates return `{"packageTimes":[]}`. Platform is multi-tenant (`ibisres.net`) so a client generalises if another AU venue turns up on it. **Note: `albathermalsprings.com` without the .au is now a squatted browser-games site.**

**Greenhouse The Bathhouse — bespoke Next.js proxying MindBody with the venue's own credentials.**
```
GET https://bookings.greenhousethebathhouse.com/api/mindbody/availability/multi-guest
    ?serviceCategory=soak&startDate=..&endDate=..&guestCount=1
   → data[].availableTimes[]: {time (local ISO, NO offset), classId (stable), availableSpots, sessionTypeId}
GET .../api/mindbody/services  → Soak price 58 duration 90, Massage 120/55, Combo 175/150
```
Capacity 10 is **inferred, not published**. The verifier independently reproduced the ceiling on a wider sample (83 slots over 20 days): max 10, 19 slots sitting exactly at it, nothing above, zero nulls. Strong inference, correctly labelled. `guestCount=8` returns **400** (probe said 200), server-clamped 1-6.

**Sold-out sessions are dropped from the feed entirely.** classId is stable, so a known classId absent while still future means fully booked. That works, but it means a **cold start cannot distinguish sold-out from never-existed** and utilisation reads low until a full booking cycle has been observed. Suppress or caveat the venue for the first few weeks.

The `time` field carries **no timezone offset** — must be pinned to Australia/Melbourne before `toISOString()`. Same footgun class as the existing `hapanaClient.toISO()`.

**TH7 Body Labs — feasible, conditional on call budget.**
```
POST https://book.th7bodylabs.com.au/getGuestProtocolDetails
     (form: locationId, serviceId, seats, startDate, type=timings, ...)
   → slots[] (HH:MM), prices[], slotLength. NO capacity, NO remaining.
```
But `seats` is a server-side capacity filter and is cleanly monotone. Verified twice on different days: seats 1,2,4,5,6,7,8 → 25,25,24,23,20,13,0 slots (probe, 08-07) and 1,2,4,6,7,8 → 20,20,20,18,16,0 (verifier, 08-08). One request returns a whole day, so an 8-value sweep gives exact remaining for every slot at once. 7 Brisbane locations × ~5 protocols × 10 days is ~2800 calls per full refresh, far too many for a 30-minute cron. Narrow to one representative protocol per location (~560 calls) or a coarse 3-point sweep. Capacity ceiling 7-8 is **UNPROVEN** — never confirmed against an empty far-future day.

**Navia Bathhouse — OVERTURNED 2026-08-14. Byron Bay is now built and benchmark-eligible; Prahran is schedule-only.**

> The write-off below was right that `maxCapacity` is not a venue capacity, and wrong that this
> made the venue unbuildable. It missed the grid structure. Byron staggers **four** entries 15
> minutes apart per 2-hour sitting, each capped at 4, and the maximum overlap depth across a whole
> day is exactly 4 — verified on 16 consecutive trading days, every block exactly 4 entries, zero
> anomalies. The blocks tile without stacking, so a **sitting holds 16 seats**, and that is a real
> derived denominator (`capacitySource: 'derived-grid'`, confidence medium). Byron reads ~33%
> utilisation across its forward window, against the 8.9% a naive sum of `maxCapacity` produces.
>
> The independent proof that `maxCapacity` is a per-entry throttle rather than the room: Byron's
> peak concurrent booked occupancy reconstructed from real bookings is **15** against a
> `maxCapacity` of 4. The API enforces no venue-level concurrency at all — a slot can read
> `availableCapacity: 10` of 10 while 15 people are already inside on overlapping bookings.
>
> **Prahran remains denominator-less** and is deliberately not listed in `VENUES`. Its grid is an
> unbroken 15-minute cadence 06:00–20:00 with no gap to block on, and its overlap depth is
> product-dependent (8-deep for the 2-hour, 4-deep for the 1-hour), so a grid-derived capacity
> would be 80 or 40 for the same room on the same day. Its bookings are cached and real; only the
> denominator is missing. It also cannot carry revenue: the $50 1-hour and $80 2-hour products
> share one counter, so a booked seat cannot be attributed to a price. Byron can, because its
> 1-hour option (id 8) is `isActive: false`.
>
> See `src/lib/naviaClient.ts` and §3a of `ADDING-A-VENUE.md`. Original write-off follows.

**Navia Bathhouse — the trap, and the most important negative in this section.**
```
GET https://api.naviabathhouse.com.au/api/v2/slots/availability?serviceId=1&locationId=1&serviceOptionId=1&...
   → {availableCapacity, maxCapacity, startTime, endTime (proper UTC ISO), isBookable, occupancyLevel}
```
It returns both of our make-or-break keys **by name**, with no auth, clean UTC timestamps, and two locations. A careless integration would ship it on sight.

`maxCapacity` is 4 on every slot at both near and far-future dates, and equals `pricing.options[0].maxCapacity` from `/services`. **The verifier proved the point harder than the probe did:** `serviceOptionId=2/3/4` return `maxCapacity: 2`, not 4. **maxCapacity provably tracks the pricing option's per-booking cap, not the venue.** Wiring it to `capacity` produces a number that is confidently wrong and looks plausible, which is worse than no number. Do not build until a venue capacity can be sourced separately.

**Peninsula Hot Springs — infeasible, and this is the biggest venue in the batch.**
Platform is **Netbookings** (`nbjsonserver.dll` + `nbapi.exe` on IIS). The anonymous API works and returns `{"Availability":"Y"}` and nothing else. No capacity, no remaining, no booked, on any endpoint the page calls. The verifier went further: enumerated the action namespace by error shape (valid actions return structured bodies, invalid ones return empty 200s) and probed **13 plausible capacity action names** (`getpackageavailability`, `getavailabletimes`, `getproductavailability`, `gettouravailability`, `getvacancies`, `getcapacity`, `getspaces`, and others) — **every one returned an empty body.** There is no capacity endpoint on the anonymous surface. The one derivation path, a `guests` threshold sweep on `getTourGroupDates`, is verified monotone but only reaches Tour-type workshop products, not Bath House general entry, which routes through a cart-session flow that would require adding items to a cart.

The 403 on `secure.peninsulahotsprings.com/` root is just an IIS directory-listing refusal. The real paths under `/hotsprings/...` all return 200. Not a block, just a red herring.

**HelmBot (Cedar Bathhouse Umina), Squarespace (Barrel Sauna), and the drops.**
HelmBot publishes `5 available` / `4 available` strings against stable `event-<id>`s and keeps sold-out sessions in the grid, but only inside a ~650KB Rails-UJS HTML blob with **no history** (past-date requests serve today's grid; the verifier found it not literally byte-identical, a rotating nonce, but substantively identical: same 23 event ids, same 13 availability strings). Capacity ~5 from 13 observations. Marginal.
Barrel Sauna: `thebarrelsauna.com/store?format=json-pretty` → `qtyInStock: 12, unlimited: false, 55.00 AUD`. Genuine remaining capacity, but exactly **one** timed product exists. Event ticketing, not a session schedule.
BitterSweat, KaarnaSauna, Vitality Steam Sauna: no booking system at all. Enquiry form and phone. Drop.
Slow House: `slowhouse.co` is a US furniture brand on Framer; `slowhouse.com.au` returns HTTP 402 "Store unavailable". **Directory entry needs re-sourcing.**
Sauna on Wheels, Heaters Natural Sauna: no DNS A record. Dead.
TotalFusion and The Skin Bar: both Zenoti on vanity hosts (`dig CNAME` → `customhosts.ap.zenoti.com`). `apiasia11.ap.zenoti.com/v1/classes/sessions` → 401, vanity host → 302 to `/sso/redirect.aspx`. Owner key required.

**Process finding worth folding into `ADDING-A-VENUE.md`:** a single `dig +short {bookings-subdomain} CNAME` identified four platforms in about two seconds each before any HTML was fetched. It belongs at the top of the triage checklist.

---

### 2.8 Fresha — INFEASIBLE, and proven more rigorously than asked

**Verdict:** infeasible, high confidence. Both probe and verifier drove the full anonymous booking flow end to end on live venues.

`https://www.fresha.com/graphql` accepts arbitrary anonymous queries. The booking flow works (`bookingFlowInitialize` → `bookingFlowActionButtonPressed` × 3-4 → `BookingFlowScreenTime`). Ember on 2026-08-07 returned exactly two timeslots, 3:30 pm and 5:00 pm, reproduced identically by both agents.

The timeslot type is exactly `{time, discount, highDemandLabel, isSelected, price{formatted}, priceWithoutDiscount{formatted}, action}`. Binary presence/absence. Nothing else.

**The probe proved this by grepping 6.4MB of shipped JS bundles for capacity-like keys (14 hits, all inside bundled Mapbox GL).** The verifier correctly noted that only proves Fresha's own client never *asks* for capacity, not that the schema lacks it, and then closed the gap properly: introspection is disabled but **GraphQL validation errors still fire with "Did you mean" suggestions**, giving a live server-side schema oracle. Results: no type named Capacity, SessionCapacity, ClassSession, GroupClass, Spots, Seats or Occupancy exists. Nearest lexical neighbours: "Capacity" → "Activity", "Spots" → "Pong", "Seats" → "Date". Field-level absence confirmed on the timeslot type, the reschedule slot type, CartAttendee, Location, Service, and the waitlist types.

**A new finding that closes the resource-counting angle at the schema level:** `remainingNumberOfEmployees`, the only integer in the flow, exists **only** on `BookingFlowScreenTimeDayUnavailable` and `BookingFlowScreenTimeEmployeeSelection`. It does not exist on `...DayAvailable`. So the one number Fresha exposes is structurally guaranteed to be 0 wherever it appears, because it only appears on days that are already fully booked.

**A new operational blocker:** `bookingFlowInitialize` is **IP rate-limited**. The verifier hit HTTP 429 three times with cooldowns of 365s, 295s and 80s. The probe's sketch proposes ~35 mutations per location per poll across six locations every 30 minutes. That is not achievable from a single GitHub Actions runner IP. **This independently kills the integration on operational grounds even if the data existed.**

Both workarounds fail. Resource enumeration works at only 2 of 6 locations (Comma exposes 10 and 5 pseudo-resources literally named "Bath"), and even there selecting each individual Bath returns a timeslot list **identical to "Any professional"** across three separate dates. Party-size differencing yields a real ladder (Ember 2026-08-12: 5 slots at 1p, 2 at 2p, 1 at 3p) but **saturates at 3**, yields remaining not total, and does not generalise (Cloud 9's 1-Person and 2-Person services returned identical slots because they are price tiers on one room).

`api.fresha.com` is the JSON:API partner surface (404 on `/`, 415 on a JSON POST). An owner key there would expose appointments, but **Fresha has no capacity entity anywhere in its data model**, so total capacity would still not exist. That is why the label is "infeasible" and not "owner-key-required".

Correction to the probe: the forward window is 244 date tiles, not "30-60 days". And "Selected professional is fully booked on this date" is a generic Fresha string, not Cloud 9-specific evidence.

---

### 2.9 Humanitix — INFEASIBLE, and the brief's premise was wrong

Neither briefed venue actually runs sauna sessions on Humanitix. Ground Currumbin is on NetBookings; The Sauna Project is on Periode. The single Humanitix link on Ground's site is a one-off charity ball.

The technical premise was also wrong: `events.humanitix.com` is **SvelteKit, not Next.js.** There is no `__NEXT_DATA__` and no `/_next/data/` payload. All 55 app chunks were downloaded and grepped; no ticket-availability procedure is exposed client-side.

- `api.humanitix.com/v1/events/{slug}` → **400** `{"message":"Invalid api key format provided."}`. Owner key.
- `events.humanitix.com/trpc/*` → **403** with `proofOfFrontendReason: "missing-token"`. Explicit anti-automation gate, not attempted.
- JSON-LD in the SSR HTML is the only anonymous structured data: ticket type names, prices, `InStock|SoldOut`, and an `offerCount` that counts **ticket types, not seats**. This is exactly the "bookable yes/no" case that is insufficient.

---

## 3. A generalised extraction architecture for the long tail

The current design (one bespoke `{platform}Client.ts` per platform, all normalising to `MomenceSession`, a config entry in `src/config/api.ts`, a poller in `.github/workflows`) is right for 9 platforms. It does not survive 20, and more importantly it has no place to record *how much to trust each number*, which is the actual risk as the tail grows.

### 3.1 The change that matters most: a provenance envelope on every session

Do this before writing a single new client. It is what lets the long tail in without corrupting the averages, and §5 depends entirely on it.

```ts
type CapacitySource =
  | 'reported'          // Wix totalSpots, Mindbody capacity, GymMaster max_students, ibisRES maxPlaces
  | 'static-config'     // hand-entered from a headline, a <select>, or an operator conversation
  | 'max-observed'      // Punchpass oracle, Greenhouse ceiling, HelmBot, Rezdy, FareHarbor
  | 'baseline-sweep'    // Zenoti far-future roster template
  | 'resource-count';   // pool enumeration

type SoldSource =
  | 'reported'          // Mindbody numberRegistered, GymMaster num_students
  | 'derived-remaining' // capacity - openSpots / space / seatsAvailable / bookable_capacity
  | 'threshold-sweep'   // Zenoti per-resource, TH7 seats
  | 'disappearance'     // Greenhouse: known id absent while still future
  | 'unknown';          // Punchpass back-paged rows. MUST NOT become 0.

type Measure =
  | 'seats'                // discrete session, arrivals == occupancy
  | 'concurrent-occupancy' // Zenoti 90-min-on-15-grid, Alba/Navia rolling entry
  | 'slot-occupancy';      // private hire: Float Away, Wandering, Cloud 9

interface SessionRecord extends MomenceSession {
  ticketsSold: number | null;        // <- widen. null is a legitimate value.
  capacitySource: CapacitySource;
  soldSource: SoldSource;
  measure: Measure;
  confidence: 'exact' | 'derived' | 'lower-bound' | 'unusable';
  benchmarkEligible: boolean;        // computed, not hand-set: false unless measure==='seats'
                                     // && soldSource!=='unknown' && confidence!=='unusable'
  poolKey?: string;                  // shared-capacity discriminator (Zenoti pools, Salty Finn room)
}
```

`ticketsSold` becoming nullable is the single highest-value line in this memo. Writing 0 for an unknown reads as an empty sauna and quietly poisons every average in the report. `sanitizeSessions` should drop or flag nulls rather than coerce them.

### 3.2 Two tiers of client, not one

**Tier A: declarative adapters** for the REST/JSON platforms where the work is genuinely just "fetch, page, map". That covers Wix, Rezdy, FareHarbor, ibisRES, Greenhouse, GymMaster, and any future Roller/NetBookings-shaped platform. A spec, not code:

```ts
interface FeedAdapter {
  key: string;
  auth?: { kind: 'scrape-token'; url: string; extract: RegExp | JsonPath; header: string; prefix?: string }
       | { kind: 'mint-session'; url: string; extract: 'redirect-param'; param: string }
       | { kind: 'none' };
  catalogue?: Step;                  // services/products/items, cached per run
  availability: Step;                // the one that matters
  pagination:
    | { kind: 'date-window'; days: number; halveOnCap: number }   // Wix (1000 cap), ibisRES, Rezdy
    | { kind: 'page-number'; from: 'tail' }                       // Mindbody marketplace
    | { kind: 'month-calendar'; then: 'per-day-detail' }          // FareHarbor
    | { kind: 'none' };
  map: {
    id: IdSpec;                      // see §3.6
    startsAt: FieldSpec;             // with explicit tz handling, see §3.5
    capacity: CapacitySpec;          // { from: 'field'|'config'|'maxObserved'|'sweep', ... }
    remaining?: FieldSpec;
    sold?: FieldSpec;
    price: FieldSpec | { from: 'config' };
    location: FieldSpec;             // NEVER default to venue name, see §3.7
  };
  invariants: Invariant[];           // see §3.8
  quality: { measure: Measure; benchmarkEligible: boolean; excludeReason?: string };
}
```

Adding a Wix venue then becomes a config entry, not a file. Adding a *new* Wix-shaped platform becomes one adapter spec.

**Tier B: bespoke clients** stay bespoke, because the work is not fetching, it is inference:
- `zenotiClient.ts` — per-resource sweep, baseline calibration, pool dedupe
- `mindbodyV2Client.ts` — RSC flight parsing, action-id discovery, build-id caching
- `punchpassClient.ts` — HTML parse + capacity oracle + iCal skeleton join
- `helmbotClient.ts` — 650KB HTML scrape (only if built at all)

These four consume the shared helpers below rather than reimplementing them.

### 3.3 Shared helper: capacity by resource enumeration

```ts
deriveCapacityByResources({
  listResources,        // () => Promise<{id, displayName}[]>   Zenoti /Catalog/Therapists
  probeResource,        // (id, date) => Promise<slotTime[]>    Zenoti RequestedTherapist
  classifyPool,         // (names) => 'pseudo-resource' | 'real-staff' | 'ambiguous'
})
```

Three rules learned the hard way:

1. **Pool size is a ceiling, not a capacity.** Soak Alexandria's pool is 72 but the per-slot bookable cap is 4-12; Banya's pool is 22 but daytime cap is 18 with BH19-22 evening-only. Always calibrate against an observed baseline, never ship the raw pool count.
2. **Classify the pool before trusting it.** The same endpoint returns 29 real staff first names on a massage service and Bath01..Bath72 on a bathhouse service. The naive regex (common prefix + numeric suffix, >70%) misclassifies Nature's Energy Glebe, whose pool mixes identically-named "Glebe Bathhouse" entries with `ZGBH35`/`ZGBH36`. Prefer: same `Total` across multiple services + no photo paths + `ServiceTime` uniform. Fall back to `ambiguous` and require a config override rather than guessing.
3. **Dedupe by pool, not by service.** Hash the sorted resource id list into a `poolKey`. Ottoman's four hammam rituals share one 6-resource pool; Soak Origin and Soak Alchemy share Bath01-72; Arima's standard and student products share one pool of 36; Iremia's 30/60/90-minute sessions share MFM01-15. Model one capacity bucket per poolKey or utilisation is understated by the number of SKUs.

For non-persisted data: store only `Total` and resource `Id` for non-pseudo pools. Never persist `DisplayName` on a real-staff pool.

### 3.4 Shared helper: threshold sweep

```ts
thresholdSweep({ probe, param, maxN, assertMonotone: true })
  → { remainingBySlot: Map<isoTime, number>, monotone: boolean }
```

Serves Zenoti (`SlotBookings` repeat count), TH7 (`seats`), Peninsula (`guests`), and would have served Fresha (party size) had the ceiling been useful. All four are the same shape: a server-side filter over remaining capacity where one call returns the indicator `{remaining(t) >= N}` for every slot in the day at once.

**The monotonicity assertion is not optional, it is the correctness test.** A non-monotone result means the parameter is not a capacity filter — it is a price tier (Cloud 9's 1-Person and 2-Person services returned identical slots) or a duration filter (FareHarbor's 4-Person 90-min product was unavailable only because it needs a longer window). Fail loudly rather than emitting numbers.

Bisection over the monotone indicator replaces a linear sweep once maxN > 20 (~6 calls instead of ~37 at Nature's Energy Glebe and Arima). But note the Zenoti finding: the cheap group-size variant is **systematically biased**, so for Zenoti specifically, bisect the per-resource sweep, not the group sweep.

### 3.5 Shared helper: max-observed capacity with staleness

```ts
maxObservedCapacity(store, key, observed)
  // key: `${venueKey}|${poolKey ?? courseId}`
  // monotone max, persisted in the venue cache alongside sessions
  // ALARM: if observed > stored, the venue changed capacity. Refresh the baseline
  //        immediately and invalidate derived ticketsSold for that key.
```

Serves Punchpass, Greenhouse, HelmBot, Rezdy, FareHarbor, and the Zenoti baseline.

Two corrections baked in from the verification round:
- **Never seed from a single far-future sample.** Banya's 2026-10-10 and 2026-11-14 disagreed 9 vs 18. Sample at least three same-weekday far-future dates and take the max.
- **The alarm is the self-healing mechanism.** Punchpass's oracle held at 29/29 courses constant, but the only reason that is safe long-term is the max-ever rule plus the alarm.

### 3.6 Shared helper: poll and diff, for remaining-only and disappearance feeds

```ts
pollAndDiff({
  previous,             // last snapshot for this (venue, day)
  fresh,
  wasOffered,           // (slotKey) => boolean   operating-hours / baseline cross-check
})
  → { vanished: SlotKey[], appeared: SlotKey[], soldOut: SlotKey[] }
```

Three feed shapes need this:
- **Greenhouse**: sold-out sessions are omitted, ids are stable → a known classId absent while still future means `ticketsSold = capacity`, `soldSource: 'disappearance'`.
- **Wix APPOINTMENT venues and FareHarbor private hire**: booked slots are removed from the grid; the diff converts an otherwise dead feed into a `slot-occupancy` series.
- **Any remaining-only feed** where you want bookings-per-day as a flow rather than a level.

**The trap:** a slot can vanish because it sold out *or* because the venue closed that day, blocked it out, or changed hours. Recording a sell-out for a day the venue was not trading inflates utilisation badly. `wasOffered` must come from an independent source. Rezdy shows how to do it right with `hasConfirmedOrders` (0 seats + confirmed orders = genuine sell-out; 0 seats + no confirmed orders = closed, exclude from the denominator). Where no such flag exists, use the far-future baseline as the "was it ever offered" oracle, and where neither exists, mark `confidence: 'lower-bound'`.

### 3.7 Incremental cache merge where there is no stable session id

Most of the tail has no usable id: Zenoti has none at all, Alba has `departureKey` (usable), Rezdy has a session id (usable), Wix has a stable but 334-char opaque blob, Punchpass loses its id on cancelled rows, Fresha has nothing.

**Synthetic id rule:**

```ts
sessionId = sha1(`${platformKey}|${venueKey}|${poolKey ?? serviceKey}|${startsAtUtcISO}`).slice(0, 16)
```

Four non-negotiables, each one learned from a bug in this round:

1. **UTC, always.** Local wall-clock keys collide or split across DST boundaries. Mindbody, Zenoti and Greenhouse all return local times with no offset; convert with the venue's IANA zone before hashing.
2. **Include the pool/location discriminator.** This is the Portal Lyons clobber and it recurred twice in this round: Savu's five Tasmanian beaches would collapse into one venue if keyed on `location.id`, and Zenoti's shared pools would collide across services if keyed on serviceId alone. Get the discriminator right per platform (Savu: class name; Zenoti: poolKey; Salty Finn: merged room).
3. **Never include capacity, price, name or booked count.** They change; the session does not.
4. **Where a natural id exists, prefer it** and hash only for cache readability (Wix's 334-char sessionId is stable across different visitor tokens — verified — so hash it for file legibility, do not replace it).

Merge is then a straight upsert keyed on the synthetic id, with the existing `fetchAllHapanaSessions` rule: retain cached sessions whose `startsAt < now` and whose id is not in the fresh set. For Punchpass, the back-paged historical rows enter with `ticketsSold: null, soldSource: 'unknown'` and must never overwrite a row previously observed live.

### 3.8 Static capacity, declared not hidden

Some venues will only ever have hand-entered capacity: FareHarbor (no field), Rezdy (DOM `<select>`), Barrel Sauna, and Navia if it is ever built. Put it in config with its provenance and a review date, not inline in the client:

```ts
staticCapacity: { value: 8, source: 'item headline: "up to 8 guests"', observed: '2026-08-06', review: '2027-02-01' }
```

Then have the client cross-check every run: if an observed remaining ever exceeds `staticCapacity.value`, that is a loud failure, not a clamp.

### 3.9 Polling tiers and the canary layer

Fold into the existing `poll-venues.yml` Melbourne-time gate with three tiers:

- **Tier A, 30 min:** single-GET feeds. Wix (~3 calls/venue), Rezdy (~6/venue), ibisRES (~1/day of horizon), GymMaster (2), Greenhouse (~2). Plus the cheap sell-out signals: Zenoti N=1 aggregate (1 call/centre/day), GymMaster `getclassnumbers?bid=` (102 bytes, no auth).
- **Tier B, hourly:** FareHarbor detail sweep (~90 calls/venue), Mindbody V2 (~8 windows/venue) + marketplace tail paging (12/venue), Punchpass HTML (~4 pages).
- **Tier C, daily:** Zenoti per-resource sweeps, TH7 seats sweeps, Punchpass `.ics` (9MB), and all capacity baseline refreshes (monthly is enough for baselines).

**Per-feed invariant assertions, run every poll, failing loudly:**

| Invariant | Platform | Catches |
|---|---|---|
| `num_students + spacesfree === max_students` | GymMaster | field drift |
| every service `hidden:true` AND every past slot 100% open | Wix | **silent platform migration** (the TANK signature) |
| parsed instance count within ±20% of last run | Punchpass, HelmBot | front-end redesign breaking the parser |
| response contains `"capacity"` | Mindbody V2 | Mindbody redeploy invalidating the action id |
| sweep result is monotone in the party-size param | Zenoti, TH7 | the param stopped being a capacity filter |
| observed remaining ≤ stored baseline | Zenoti, all max-observed | venue changed capacity |
| `availabilityEntries.length < 1000` | Wix | silent cap truncation (no error field) |

The TANK signature deserves promotion to a **global** assertion across every platform we run, not just Wix. A venue quietly moving to another platform currently shows up as a flat-lining chart. It should show up as a failed poll.

Commit one captured fixture per response shape per platform. For Punchpass and HelmBot the parser is the fragile part, so the fixtures are the real deliverable.

---

## 4. The capacity derivation playbook

Seven techniques, ranked by how much they can be trusted.

### 4.1 Reported field (Wix, Mindbody, GymMaster, ibisRES)
**Sound:** always. Prefer per-slot over per-service every time. Wix's `totalSpots` overrides `defaultCapacity` and is provably right (a defaultCapacity-12 service returned slots at 12, 6, 5, 4, 3, 2 depending on the day).
**Misleading:** only when you read the wrong field. Also guard `capacity: 0` on live sessions (Mindbody).

### 4.2 Resource / pseudo-resource enumeration (Zenoti; attempted at Fresha)
**Sound when:** the resources are pseudo-resources for one shared room, the whole pool is releasable, and selecting a resource actually narrows availability.
**Misleading when:**
- The pool overstates what is rostered. Soak Alexandria pool 72, per-slot bookable cap 4-12. Shipping 72 as capacity would report ~15% utilisation on a full house.
- Resource selection does not narrow the response. At Fresha's Comma venues, each individual "Bath" returned a timeslot list **identical** to "Any professional" across three dates, so the roster count is real but occupancy is invisible.
- The pool is real staff, not resources. Needs classification, and the obvious regex fails on at least one live venue.
- Multiple SKUs share a pool. Understates utilisation by the SKU count if not deduped.

### 4.3 Max-observed availability as total (Punchpass, Greenhouse, HelmBot, Rezdy, FareHarbor, Zenoti baseline)
**Sound when:** the venue publishes far enough forward that genuinely unbooked occurrences exist, capacity is stable per recurring slot, you take the max across **several** samples, and you keep a staleness alarm. Punchpass is the exemplar: 29 courses, 29/29 with zero variance across a 20-day far-future window, and a near-term CLASS FULL occurrence of the same course resolving cleanly to 9/9.
**Misleading when:**
- The "far-future" date already carries bookings. **This is not hypothetical.** Banya's 2026-10-10 read 9 where 2026-11-14 read 18. A single-sample baseline would have recorded capacity 9 and clamped ticketsSold to 0 forever.
- The venue raises capacity mid-series. You under-report until the next unbooked observation. The alarm is what saves you.
- The observed maximum is clipped by a party-size cap rather than by real capacity (Fresha saturates at 3; Zenoti's UI offers 2-6 but the server accepts N=22, so always test the server not the UI).
- The venue is new and has never been empty. Then you have no oracle at all.

### 4.4 Threshold / party-size sweep (Zenoti, TH7, Peninsula)
**Sound when:** the parameter is a genuine server-side capacity filter and the result is monotone. TH7 verified twice on different days: 25/25/24/23/20/13/0.
**Misleading when:**
- The parameter is a **price tier**, not a capacity consumer. Cloud 9's "1 Person" and "2 Person" services returned identical slots because they are tiers on the same private room. Utilisation from that would be pure fiction.
- It **saturates below true capacity**. Fresha caps at 3, so a 30-person bathhouse reads as ≤3 and produces a clipped remaining with no denominator.
- It only reaches part of the product catalogue. Peninsula's `guests` sweep works, but only for Tour-type workshop products, not Bath House general entry, which is the number that matters.
- The cheap variant is biased. Zenoti's group-size probe is monotone *and wrong*, under-reporting remaining by 1-2 seats on affected slots in a way that survives sweep-order reversal. Monotonicity is necessary, not sufficient. **Cross-validate any sweep against a second independent method once, before shipping it.**

### 4.5 Shopify / Squarespace inventory as remaining stock (Barrel Sauna; the pattern generalises)
```
GET https://{host}/store?format=json-pretty      → variants[].qtyInStock, unlimited:false, priceMoney
GET https://{host}/products/{handle}.js          → Shopify equivalent
```
**Sound when:** one product variant maps to one dated session, `unlimited:false`, and you capture initial stock at listing time (or the first observation after a restock) as total.
**Misleading when:**
- The operator **restocks mid-sale**. Stock going up looks like mass cancellations. Needs a monotone-decreasing assertion per product with a restock event recorded, not smoothed over.
- One product covers many dates (a pack, a voucher, an open-dated pass). Then qtyInStock is aggregate inventory, not per-session remaining.
- The product is a class pack or gift voucher. Genuinely interesting as a **prepaid demand signal**, which we currently have for no venue at all, but it is not session capacity and must not be mixed in.

### 4.6 JSON-LD and sitemap scraping
**Sound for:** the session skeleton. Names, prices, times, cancellation state, and confirming what a venue actually sells.
**Never sound for capacity.** Humanitix's JSON-LD `offerCount` counts ticket **types**, not seats (4 for an event with First/Second/Final release plus Door). Fresha's JSON-LD is `HealthAndBeautyBusiness`/`DaySpa` schema with no availability at all. Use it for the numerator's labels, never for the denominator.

### 4.7 `_next/data` payloads and their variants
**Sound when:** the page is genuinely server-rendered with the data attached. Fresha's `/_next/data/{buildId}/_AU/a/{slug}.json` returns a clean 74KB catalogue with prices and durations.
**Fails when:**
- The flow is client-rendered. Fresha's `/booking.json` sibling returns 200 with an **HTML body**. There is no SSR timeslot payload to harvest.
- **The framework is not Next.** Humanitix is SvelteKit. The brief's premise sent a previous session down a dead end.
- The data sits behind a **Server Action** rather than a data route. This is the important variant and it is now a proven pattern: scrape the RSC flight stream for the 40-hex action id and the encrypted bound-args, then POST with `Next-Action:`. Mindbody V2 is the working example, and the action id turns out to be a per-*build* constant, so cache it against the buildId.

### 4.8 iCal feeds
**Sound for:** a DST-correct time skeleton. Punchpass's `all_classes.ics` ships a full `VTIMEZONE Australia/Sydney` with AEST/AEDT RRULEs, stable UUID UIDs, a `URL` field linking to the same instance ids the HTML uses, and `CANCELED - ` prefixed summaries. That solves timezone handling for free, which is otherwise a recurring correctness hazard (Mindbody, Zenoti, Greenhouse and TH7 all return local times with no offset).
**Never carries capacity.** Join the HTML/JSON badges onto the iCal skeleton, not the other way round. And poll it daily, not every 30 minutes: 9MB.

### 4.9 Disappearance as sold-out
**Sound when:** ids are stable and the feed provably omits sold-out rows. Greenhouse qualifies.
**Dangerous when:** the feed also omits closed or blocked slots, which is the common case. Then you record a sell-out for a day the venue was not trading. Needs an independent "was it offered" oracle. Rezdy solves this properly with `hasConfirmedOrders`; everywhere else, use the far-future baseline.

---

## 5. Data quality warnings

### 5.1 Where a derived capacity would corrupt the metric

| Risk | Platform / venue | Failure mode | Mitigation |
|---|---|---|---|
| **Per-booking cap mistaken for venue capacity** | **Navia** | `maxCapacity: 4` on every slot is the pricing option's party cap (proven: it becomes 2 for serviceOptionId 2/3/4). Utilisation censored at 4 and plausible-looking. | **Do not build.** A confidently wrong number is worse than none. |
| **Single-sample baseline** | **Zenoti** | Banya far-future 10-10 gave 9, 11-14 gave 18. Records capacity 9, clamps ticketsSold to 0, venue reads permanently empty. | Max across ≥3 same-weekday far-future samples + staleness alarm. |
| **Biased sweep method** | **Zenoti** | Group-size probe under-reports remaining by 1-2 seats systematically (survives order reversal). Inflates utilisation. | Ship the per-resource sweep. Cost is comparable. |
| **Occupancy summed as arrivals** | **Zenoti** Soak (90 on 15 grid), Nature's Energy (90 on 10), Arima (90 on 15) | One booking suppresses ~2×Duration/grid adjacent slots. Correct for utilisation curves, but summing across slots **overstates headcount by roughly 2×Duration/grid**. | `measure: 'concurrent-occupancy'`. Show in capacity charts, exclude from headcount and revenue rollups. Only Banya (dur 50 on hourly grid) and About Time (scheduling dur 15) map 1:1. |
| **Rolling entry counted as discrete sessions** | **Alba** (30-min cadence), **Navia** (15-min), **FICE** | Overlapping slots. Summing capacity across a day double-counts the venue several times over. | Declare the cadence as the denominator per platform. Never sum capacity across overlapping slots. |
| **Parallel services on one physical slot** | **Hello Sauna** (Wix) | Same slot published as 30/60-min communal and private on different scheduleIds. 105 of 360 keys collided. Produces a false 24.4%. | Curated `serviceIds` allow-list only. The grouping fallback is unsafe (65% null locations). |
| **Shared room across products** | **Salty Finn** (Rezdy), **Ottoman/Soak/Arima/Iremia** (Zenoti pools) | A private booking zeroes the communal seats and vice versa. Doubles session count, halves utilisation. | Merge per timeslot on `poolKey`. One capacity bucket per pool, never per SKU. |
| **Closed slots counted as sold out** | **Rezdy**, any disappearance feed | Salty Finn's six closed 9-Aug slots would each register as 100% utilised. | `seatsAvailable === 0 && !hasConfirmedOrders` → exclude from denominator, not `isCancelled`. |
| **Sold-out sessions dropped, cold start** | **Greenhouse** | Cannot distinguish sold-out from never-existed on first poll. Reads systematically low. | Suppress the venue from benchmarks until a full booking cycle is observed. |
| **Badge disappears at session start** | **Punchpass** | 30-min poll cadence on a 30-min session cadence means the last observation can be 30 minutes stale and late bookings are lost. | `confidence: 'lower-bound'`. Systematic **downward** bias, magnitude UNPROVEN. Consider tightening cadence near session start. |
| **Back-paged history with no utilisation** | **Punchpass** | 385/385 and 249/249 past instances have no badge. Writing 0 reads as an empty sauna. | `ticketsSold: null, soldSource: 'unknown'`. **Never 0.** |
| **Sparse historical index** | **Mindbody marketplace** | 1Remedy has 171 distinct days across a 2-year span. July 2026 backs out to an implausible 6.1%. Vintage of `openings` on old rows is unverifiable. | Do not seed history from it. Near-term is complete and verified; historical is a research curiosity only. |
| **Five sites collapsed into one** | **Savu** (Mindbody) | All 391 sessions carry one location object. Keying on `location.id` merges five Tasmanian venues. | Key on class name. This is the Portal Lyons clobber recurring. |
| **Silent platform migration** | **all** | TANK sites returned 639 and 105 past slots at **100% open** for months. Would have flat-lined at 0% forever. | Global assertion: all services hidden + all past slots fully open = loud failure. |
| **APPOINTMENT type switch** | **Wix** | A venue switching CLASS→APPOINTMENT silently starts reporting 0% rather than erroring (Wandering: 122 past slots all 1/1). | Filter on `slot.sessionId` presence; assert the CLASS service count is non-zero. |
| **Inferred capacity with a thin sample** | **HelmBot** (5, from 13 obs), **TH7** ceiling 7-8 (UNPROVEN) | Small samples; a single unusual day skews the max. | Flag `confidence: 'derived'` and require ≥20 observations before promoting to a benchmark denominator. |

### 5.2 Exclude from benchmark averages even where technically scrapeable

**Hard exclusions (different metric, not a worse metric):**
- **Float Away Mobile Saunas** — private hire only. Two items exist, one is a Gift Card. "Utilisation" means days booked vs days offered. `measure: 'slot-occupancy'`.
- **Wandering Sauna** — appointment-only, `openSpots` never moves even for long-past dates. Only a differencing poll can see anything.
- **B3 Brunswick Heads sauna** — walk-in by design, quoted verbatim from their own site. No booking record exists anywhere. Only the yoga/pilates studio and one "B3 Breath & Bath" class are measurable, and those are not sauna comparables.
- **Cloud 9, Comma private hire, Salty Finn private product** — N-Person variants are price tiers on one room.

**Quality exclusions:**
- **Navia** — censored denominator.
- **Fresha, anything** — no denominator at all. Even a "sessions gone from the grid" proxy measures a different thing and would silently corrupt cross-platform comparison.
- **Punchpass back-paged rows** — real schedule, unknown utilisation. Valuable for a **sessions-offered-per-week** and **cancellation-rate** series (39 cancellations on one 2026-06-01 page), which is genuinely new capability, but not for utilisation.
- **Greenhouse, first 3-4 weeks** — cold-start bias from dropped sold-outs.
- **Zenoti long-duration venues (Soak, Nature's Energy, Arima)** — include in utilisation and peak-load charts, exclude from headcount and revenue rollups.
- **Barrel Sauna** — one event product, not a session schedule.
- **Mindbody marketplace historical rows** — flag any figure derived from them.

**A structural recommendation:** the report UI needs a visible **"derived"** treatment. As the tail grows, the fraction of the benchmark built on inference rather than reported fields grows with it. `capacitySource` and `soldSource` should be surfaced, not just stored. A venue whose utilisation comes from a threshold sweep against a binary indicator should not sit in the same chart as one reading `numberRegistered` without the reader knowing.

---

## 6. Recommended build order

### Phase 0 — Foundations (2 days, do this first)
1. Widen `MomenceSession` to `SessionRecord` with the provenance envelope (§3.1). Make `ticketsSold` nullable and teach `sanitizeSessions` and `metricsCalculator` to respect `benchmarkEligible`.
2. Hoist the incremental-merge logic out of `hapanaClient`/`acuityClient` into a shared helper with the synthetic-id rule (§3.7).
3. Add the global "silent migration" assertion (§3.9) to every existing client. This is retroactive value: it protects the 68 venues we already have.

### Phase 1 — Fast wins (2.5 days, +7 venues → 75)
4. **Wix Bookings** (1.5 days, +4). Build first. Low effort, four venues, and **real backfillable history to 2024-05** which no other platform offers. CLASS-only filter, date-windowing, curated allow-list for Hello Sauna, `fallbackPrice` for the VARIED services.
5. **Rezdy** (0.5 days, +2). Browser UA required. `hasConfirmedOrders` gating. Merge Salty Finn's communal and private products per timeslot.
6. **ibisRES / Alba** (0.5 days, +1). Half a day for the highest-quality feed in the round: published `maxPlaces`, `space` including zeros, six-month forward horizon, multi-tenant platform.

### Phase 2 — The big one (5 days, +8 venues / 13 sites → 83)
7. **Zenoti**. Per-resource sweep (not group). Max-of-three far-future baselines. Pool dedupe by resource-id hash. Per-venue `measure` flag for the 90-min-on-short-grid venues. Daily full sweep plus a 30-minute N=1 sell-out signal. Drop TotalFusion and Soak South Melbourne.

Also run the free centre-discovery pass across the directory here — `/api/Catalog/Centers` on any tenant token returns the whole chain, and it already found 5 sites the directory missed.

### Phase 3 — Medium value (5.5 days, +6 venues → 89)
8. **Mindbody V2 + marketplace** (2.5 days, +3). Cache the action id against buildId. Key Savu on class name. Resolve the `location` flight ref. Page the marketplace from the **tail**. Park Saunaus. Record Contro/Life Hub/Rapid as `platform: 'mindbody-appointments'` with a reason string so nobody re-probes them in six months.
9. **Greenhouse** (1 day, +1). Pin times to Australia/Melbourne. Disappearance handling. Suppress from benchmarks for the first booking cycle.
10. **FareHarbor** (1 day, +1 as `slot-occupancy`). Calendar endpoint for discovery, detail endpoint for numbers. Never `approximate_available_capacity`. Static price and capacity.
11. **Punchpass** (1.5 days, +1). iCal skeleton + HTML badge join. `courseId` capacity oracle with max-ever. Back-paged rows as `ticketsSold: null`. Fall back to `(date, time, courseId)` for cancelled rows.

### Phase 4 — Opportunistic (3.5 days, +3 → 92 tracked)
12. **TH7** (1.5 days, +1 covering 7 Brisbane sites). Narrow the sweep to one representative protocol per location. Confirm the capacity ceiling against an empty far-future day first.
13. **GymMaster** (0.5 days, +1 tracked, 0 benchmark-eligible). Build it as the reference declarative adapter — it is the cleanest data in the tool and proves out the Tier A spec. Excluded from sauna benchmarks because the sauna is walk-in. Explicit comment in the client that `/portal/book/class/attendees?bid=` returns customer names and must never be called.
14. **HelmBot / Cedar** (1.5 days, +1). Only for completeness. 650KB HTML scrape, no history, small venue, thin capacity sample.

### Probe next (unscoped, budget half a day each, all UNPROVEN)
- **Roller** — highest expected value of the three. Two AU sauna venues (both TANK sites) that Wix can no longer supply. Requires a **browser XHR capture** on `ecom.roller.app/tankbathhouse`; curl will not work, the verifier confirmed the bundles load lazily and only `api.roller.app` is referenced.
- **NetBookings availability step for Ground Currumbin** — different tenant from Peninsula on the same platform. Expectations low given Peninsula's result, but the check is cheap.
- **Periode / Firestore** for The Sauna Project Sydney. Different integration shape (Firestore listen channels) to anything in the repo, so scope it as a spike before committing.

### Do not bother

| | Why |
|---|---|
| **Fresha** (5 venues) | No capacity entity exists in the schema. Proven three ways: bundle grep, validation-error oracle, and the structural fact that the only integer field appears only on already-fully-booked days. Plus IP rate limiting (429, 365s cooldown) that independently kills the request budget. An owner key would not help because the data model has no capacity concept. |
| **Humanitix** (2 venues) | Owner API key required (400), tRPC behind an explicit anti-automation token (403). And neither briefed venue actually runs sauna sessions on it. |
| **Peninsula / NetBookings anonymous API** | `{"Availability":"Y"}` and nothing else. 13 speculative capacity action names enumerated, all empty. The one derivation path reaches only workshop tours, not Bath House entry. Biggest venue in the country, and the only remaining route is asking them. |
| **Navia** | Beautiful API, broken denominator. Revisit only if a static venue capacity can be sourced and the rolling 15-minute occupancy model reconciled. |
| **Zenoti owner-key venues** (TotalFusion Platinum ×2, The Skin Bar) | TotalFusion has no bookable sauna inventory in Zenoti at all; Skin Bar bounces to SSO. |
| **Mindbody appointment venues** (Contro/Lume, Life Hub, Rapid Recovery NT) | Data-model wall. Appointments have no seat concept. Confirmed independently four ways. |
| **Saunaus** | No widget on any page; marketplace covers 2-3 of 12 daily slots with one day entirely absent; the complete route is Cloudflare-gated. |
| **Barrel Sauna, BitterSweat, KaarnaSauna, Vitality Steam Sauna** | One event product, or no booking system at all. Enquiry form and phone. |
| **Slow House** | Directory entry is wrong. `.co` is a US furniture brand, `.com.au` returns 402. **Re-source before spending any time.** |
| **Sauna on Wheels, Heaters Natural Sauna** | No DNS A record. Dead. Remove from the directory. |

---

## Conduct note

Every finding above came from read-only GET/POST requests against endpoints an ordinary anonymous visitor's browser already calls. No accounts were created, no bookings made, no forms submitted, no authentication bypassed. Two bot-protection gates were encountered and deliberately not defeated: Cloudflare on `clients.mindbodyonline.com` and the tRPC proof-of-frontend token on `events.humanitix.com`. Fresha's 429 rate limits were honoured with backoff rather than worked around.

Staff and instructor names appear in Zenoti (`/Catalog/Therapists` on treatment services), Mindbody V2 and marketplace payloads, GymMaster class rows, and Navia's `/services`. None were copied into any output. **The clients must persist only `Total` and `Id` for non-pseudo resource pools, never `DisplayName`.** Fresha and Humanitix location pages carry customer first names and avatars in review blocks; the current cache pipeline does not strip those, which is a further reason not to cache Fresha payloads. GymMaster's `/portal/book/class/attendees?bid=` returns customer attendee names and was deliberately never called — that needs an explicit comment in the client so nobody adds it later chasing richer data.