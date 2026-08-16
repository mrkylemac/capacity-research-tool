# Adding a New Venue

A playbook for integrating a new venue on an unfamiliar booking platform.

---

## 1. Identify the booking platform

Start with DNS — it names the platform in about two seconds, before any HTML is fetched:

```bash
dig +short bookings.example.com CNAME
```

Then check their booking widget URL or page source. Common tells:

| Platform | URL pattern |
|---|---|
| Momence | `momence.com` |
| MarianaTek | `marianatek.com` |
| TryBe | `try.be` |
| Zenoti | `zenoti.com` |
| Glofox | `glofox.com` |
| Mindbody | `mindbodyonline.com` |
| Rezdy | `rezdy.com` |
| bsport | `bsport.io` |

---

## 2. Find the public API endpoints

Open DevTools → Network tab while clicking through their booking widget. Filter by `fetch/XHR`. Look for:

- A **services / classes / sessions list** call — this is the goldmine
- An **availability** call (date/time slots)
- Any auth token passed in request headers or embedded in the page source

---

## 3. Probe the key question: does it expose historical data?

```bash
curl "https://api.example.com/sessions?date=2025-01-01"
```

| Result | Approach |
|---|---|
| Returns past sessions with capacity + bookings (like Momence, MarianaTek) | Fetch 2–3 years of history in one go |
| Returns future/current only, past sessions removed (like TryBe) | Fetch forward window (90 days), merge with cached past sessions on each re-sync |
| 403 on historical endpoint (like Zenoti `/api/Appointments`) | Need a different / admin-level token — pause and investigate |

---

## 3a. Check that the feed's "capacity" is a *venue* capacity

The most expensive mistake available is a denominator that looks plausible and
is wrong. A field named `capacity` or `maxCapacity` is not evidence on its own.

Two tests, both cheap:

**Does it exceed itself?** Reconstruct concurrent occupancy from the bookings —
sum every booked slot over its own `[start, end]` window and take the peak. If
peak concurrency exceeds the advertised capacity, that field is a per-booking or
per-entry throttle, not the room. Navia Byron Bay reads `maxCapacity: 4` while
15 people are demonstrably inside.

**Does it move with the product?** Query the same day through a different
service option, price tier or duration. If the number changes, it belongs to the
product, not the venue.

If both tests are passed, the field is a real capacity. If not, look for a
derivable one — and if there isn't one, emit `capacity: 0` **and**
`utilisationKnown: false` rather than a guess. `sanitizeSessions` drops those on
either flag. A placeholder zero reads as an empty room and drags down every
average it touches.

### Measure classes

Not every venue's "utilisation" means the same thing, and only the first is
comparable to the benchmark averages:

| Measure | Meaning | Benchmark-eligible |
|---|---|---|
| `seats` | discrete session, bookings ÷ seats offered | yes |
| `concurrent-occupancy` | rolling entry, bodies in the room over time | no |
| `slot-occupancy` | private hire — the room is booked, seats don't apply | no |

Record where each number came from on the session itself (`capacitySource`,
`soldSource`, `measure`, `confidence`) so a derived denominator is visibly
derived wherever it surfaces.

### When the session boundary itself has to be derived

Some platforms publish bookable *entries* rather than sessions. Navia is the
worked example: it staggers four entries 15 minutes apart, each with its own
4-seat counter, and each entry buys a 2-hour stay. One session per entry would
report 24 sessions a day at a venue running six sittings and quarter every
per-session average.

Derive the grouping from the data — a gap larger than the entry stride starts a
new sitting — rather than hardcoding clock times, and validate every group
against an expected shape. Byron drops a sitting on Tuesdays, so hardcoded
anchors would mis-block one day in seven. Where no boundary exists at all
(Navia Prahran's unbroken 15-minute grid), there is no honest denominator and
the venue is schedule-only.

---

## 4. Map to `MomenceSession`

| Field | Where to find it |
|---|---|
| `capacity` | session max spots, room capacity, or resource pool count |
| `ticketsSold` | `capacity - remaining` OR a direct booked count field |
| `fixedTicketPrice` | watch for **cents vs dollars** — divide by 100 if needed |
| `startsAt` / `endsAt` | ISO 8601 datetime — watch for timezone offsets |
| `durationMinutes` | usually explicit; or derive from `end - start` |
| `sessionName` | service/offering name from config if not in response |
| `location` | room name, facility name, or venue name |

---

## 5. Add to the codebase

**`src/config/api.ts`**
1. Add platform name to the `Platform` union type
2. Add a `YOURPLATFORM_CONFIG` object with venue-specific values (IDs, tokens, filters)
3. Add the venue to the `VENUES` array

**`src/app/api/fetch-venue/route.ts`**
1. Add fetcher function(s) for the new platform
2. Add an `else if (platform === '...' && hostId === '...')` branch in the route handler
3. If future-only: read `existingSessions` from the existing cache file on disk and pass it through for merging (see the TryBe pattern)

No CORS proxy needed — all external API calls happen server-side in the route handler.

---

## 6. Add a UI caveat if data is limited

If historical data isn't available, add a note below the Snapshot heading.

In `ReportSections.tsx`, the `SnapshotSection` accepts a `platform` prop and renders a caveat when `platform === 'trybe'`. Follow the same pattern for any new platform with the same limitation.

---

## Platform notes

### Momence
- Public readonly API, no auth required
- Full history available via date-range pagination
- `hostId` = numeric venue ID from their URL

### MarianaTek
- Public customer API, no auth required
- Full history via `/api/customer/v1/classes`
- Filter by `class_type.name` to isolate the relevant session type
- `ticketsSold = capacity - available_spot_count`

### TryBe
- Public API, no auth required
- **Future sessions only** — past sessions disappear once started
- Two separate offering IDs per venue; deduplicate by session `id`
- `ticketsSold = capacity - remaining_capacity`; price is in cents
- Merge newly fetched sessions with previously cached past sessions on each re-sync

### Glofox
- Requires a Bearer token (guest token from the booking widget)
- Tokens expire — check `tokenExpiry` in config and refresh periodically
- Full history available via `/2.0/events` with Unix timestamp range
- `ticketsSold = booked`; `capacity = size`

### bsport
- Public API, no auth required (`api.production.bsport.io/book/v1/offer/`)
- Full history available via `min_date`/`max_date` pagination (`page`/`page_size`)
- `capacity = effectif`; `ticketsSold = validated_booking_count`
- Include **all** public offers — venues rotate `meta_activity` IDs as they
  introduce new class formats, so an activity allowlist silently drops new
  classes over time. Exclude `manager_only` offers and any establishments
  that are third-party booking mirrors (e.g. Mindbody placeholders with zero
  bookings)
- Pricing is credit-based; use a static per-visit rate from the venue's website
- `establishment` ID maps to a location name (multi-location venues)

### Navia (bespoke)
- Public API, no auth (`api.naviabathhouse.com.au/api/v2`), genuine UTC timestamps
- **Future sessions only** — slots vanish at `startTime`, past dates return `{success: true, data: []}` (a 200, not an error)
- `startDate`/`endDate` is validated then ignored — **one request per venue per day**, no batching or pagination
- Publishes bookable *entries*, not sessions. Byron Bay groups four 15-minute-staggered entries into one 2-hour sitting of 16 seats; Prahran's grid is continuous and has no derivable denominator
- `maxCapacity` is a per-entry throttle, **not** venue capacity. `option.maxCapacity` from `/service-options/{id}` is a third, different number (a per-booking party cap) and is not even enforced
- All service options at a location share one seat counter — poll the option with the superset of start times, never both
- Entries expire individually, so an entry ledger (`{hostId}-navia-ledger.json`) preserves pre-start readings; without it a mid-block poll can't rebuild a complete sitting
- Empty days are normal (Byron closes for a week from 2026-08-31)

### Zenoti (paused)
- Public `getTokenForV2` token works for Services, Centers, Therapists only
- `POST /api/Catalog/Appointments/Availabletimes` → 503 "Booking slots not found" (cause unknown)
- `GET /api/Appointments` → 403 Forbidden (admin-only endpoint)
- Capacity model uses "fake therapists" as resource slots (e.g. Bath01–72 = 72 capacity)
- Needs an admin/API-level token to unlock booking history — worth pursuing with the venue
