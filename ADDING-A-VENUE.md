# Adding a New Venue

A playbook for integrating a new venue on an unfamiliar booking platform.

---

## 1. Identify the booking platform

Check their booking widget URL or page source. Common tells:

| Platform | URL pattern |
|---|---|
| Momence | `momence.com` |
| MarianaTek | `marianatek.com` |
| TryBe | `try.be` |
| Zenoti | `zenoti.com` |
| Glofox | `glofox.com` |
| Mindbody | `mindbodyonline.com` |
| Rezdy | `rezdy.com` |

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

### Zenoti (paused)
- Public `getTokenForV2` token works for Services, Centers, Therapists only
- `POST /api/Catalog/Appointments/Availabletimes` → 503 "Booking slots not found" (cause unknown)
- `GET /api/Appointments` → 403 Forbidden (admin-only endpoint)
- Capacity model uses "fake therapists" as resource slots (e.g. Bath01–72 = 72 capacity)
- Needs an admin/API-level token to unlock booking history — worth pursuing with the venue
