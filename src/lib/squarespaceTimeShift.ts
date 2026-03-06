/**
 * Squarespace Scheduling — Date Time-Shift Experiments
 *
 * The Squarespace Scheduling API rejects startDate values before today:
 *   422 "startDate - The date \"2025-03-06\" must not be before the current day."
 *
 * These utilities let the UI pretend it's showing past dates while only
 * requesting valid (future) dates from the API.
 *
 * Two approaches:
 *   1. Offset-based fake history — caller converts dates before/after fetch
 *   2. Request interception layer — transparent proxy rewrites dates on the wire
 *
 * Toggle via DISPLAY_OFFSET_DAYS. Set to 0 to disable all shifting.
 */

// ── Configuration ────────────────────────────────────────────────────────────

/** How many days to shift. Positive = display dates appear N days in the past. */
export let DISPLAY_OFFSET_DAYS = 30;

/** Change the offset at runtime (useful for quick experimentation). */
export function setDisplayOffset(days: number) {
  DISPLAY_OFFSET_DAYS = days;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

/** Add `days` to a Date, returning a new Date. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Subtract `days` from a Date, returning a new Date. */
export function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

/** Format a Date as YYYY-MM-DD (what the Squarespace API expects). */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parse a YYYY-MM-DD string to a Date (midnight UTC). */
export function parseDate(str: string): Date {
  return new Date(str + 'T00:00:00Z');
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPROACH 1 — Offset-based fake history
// ═══════════════════════════════════════════════════════════════════════════════
//
// The caller explicitly converts dates:
//   displayDate → toApiDate() → send to Squarespace
//   response dates → toDisplayDate() → render in UI
//
// Good when you want full control and visibility over the shifting.

/**
 * Convert a "display date" (what the user sees, possibly in the past)
 * to an API-safe date by adding the offset.
 *
 * Example (offset = 30):
 *   displayDate 2026-02-04 → apiDate 2026-03-06 (today, valid)
 */
export function toApiDate(displayDate: Date): Date {
  return addDays(displayDate, DISPLAY_OFFSET_DAYS);
}

/**
 * Convert an API date from a Squarespace response back to the
 * "display date" the user expects, by subtracting the offset.
 */
export function toDisplayDate(apiDate: Date): Date {
  return subtractDays(apiDate, DISPLAY_OFFSET_DAYS);
}

/**
 * Shift all date strings in a Squarespace availability response
 * back to display dates. Works on the keyed `{ "YYYY-MM-DD": [...] }`
 * response format.
 */
export function shiftResponseDates<T>(
  response: Record<string, T>,
): Record<string, T> {
  if (DISPLAY_OFFSET_DAYS === 0) return response;

  const shifted: Record<string, T> = {};
  for (const [dateKey, value] of Object.entries(response)) {
    const displayDate = toDisplayDate(parseDate(dateKey));
    shifted[toDateString(displayDate)] = value;
  }
  return shifted;
}

/**
 * Convenience: fetch the Squarespace `/availability/times` endpoint
 * with date shifting applied.
 *
 * Usage:
 *   const slots = await fetchWithOffset({
 *     owner: '6f7bfa9c',
 *     appointmentTypeId: 86988395,
 *     calendarId: 13261360,
 *     displayStartDate: '2025-03-06',  // "past" date the UI wants
 *     maxDays: 2,
 *     timezone: 'Australia/Sydney',
 *   });
 *   // `slots` keys are display dates (shifted back)
 */
export async function fetchWithOffset(params: {
  baseUrl?: string;
  owner: string;
  appointmentTypeId: number;
  calendarId: number;
  displayStartDate: string; // YYYY-MM-DD — what the user selected
  maxDays?: number;
  timezone?: string;
}): Promise<Record<string, unknown[]>> {
  const {
    baseUrl = 'https://app.squarespacescheduling.com',
    owner,
    appointmentTypeId,
    calendarId,
    displayStartDate,
    maxDays = 7,
    timezone = 'Australia/Sydney',
  } = params;

  // Shift the display date forward so the API accepts it
  const apiStartDate = toDateString(toApiDate(parseDate(displayStartDate)));

  const url = new URL(`${baseUrl}/api/scheduling/v1/availability/times`);
  url.searchParams.set('owner', owner);
  url.searchParams.set('appointmentTypeId', String(appointmentTypeId));
  url.searchParams.set('calendarId', String(calendarId));
  url.searchParams.set('startDate', apiStartDate);
  url.searchParams.set('maxDays', String(maxDays));
  url.searchParams.set('timezone', timezone);

  console.log(`[TimeShift/Offset] Display: ${displayStartDate} → API: ${apiStartDate} (offset: ${DISPLAY_OFFSET_DAYS}d)`);

  const res = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      'x-secondo-owner': owner,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Squarespace API ${res.status}: ${body}`);
  }

  const data: Record<string, unknown[]> = await res.json();

  // Shift response date keys back to display dates
  const shifted = shiftResponseDates(data);

  // Also shift `time` fields inside each slot
  for (const slots of Object.values(shifted)) {
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      if (slot && typeof slot === 'object' && 'time' in slot) {
        const s = slot as { time: string };
        try {
          const t = new Date(s.time);
          s.time = subtractDays(t, DISPLAY_OFFSET_DAYS).toISOString();
        } catch {
          // leave as-is
        }
      }
    }
  }

  return shifted;
}


// ═══════════════════════════════════════════════════════════════════════════════
// APPROACH 2 — Request interception layer (transparent proxy)
// ═══════════════════════════════════════════════════════════════════════════════
//
// The app uses "logical" (real) dates everywhere. The proxy rewrites dates
// on the wire so the API never sees past dates.
//
// Good when you want zero changes to the rest of the app — just swap
// `fetch` for `squarespaceFetch`.

/**
 * Transparent fetch wrapper that rewrites `startDate` in URL query params
 * (for GET requests to /availability/times) and in JSON bodies (for POST
 * requests to /availability/class).
 *
 * Response date keys are shifted back so the caller sees logical dates.
 *
 * Usage:
 *   // Instead of fetch(url, init):
 *   const res = await squarespaceFetch(url, init);
 *   const data = await res.json(); // dates are already shifted back
 */
export async function squarespaceFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (DISPLAY_OFFSET_DAYS === 0) {
    return fetch(input, init);
  }

  let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const newInit: RequestInit = { ...init };

  // ── Rewrite GET query params ───────────────────────────────────────────
  const parsed = new URL(url);
  const startDateParam = parsed.searchParams.get('startDate');
  if (startDateParam) {
    const logical = parseDate(startDateParam);
    const shifted = addDays(logical, DISPLAY_OFFSET_DAYS);
    parsed.searchParams.set('startDate', toDateString(shifted));
    url = parsed.toString();
    console.log(`[TimeShift/Proxy] GET startDate: ${startDateParam} → ${toDateString(shifted)}`);
  }

  // ── Rewrite POST JSON body ─────────────────────────────────────────────
  if (newInit.body && typeof newInit.body === 'string') {
    try {
      const body = JSON.parse(newInit.body);
      if (body.startDate) {
        const logical = parseDate(body.startDate);
        body.startDate = toDateString(addDays(logical, DISPLAY_OFFSET_DAYS));
        console.log(`[TimeShift/Proxy] POST startDate: ${startDateParam} → ${body.startDate}`);
        newInit.body = JSON.stringify(body);
      }
    } catch {
      // Not JSON, pass through
    }
  }

  const res = await fetch(url, newInit);

  // ── Rewrite response date keys ─────────────────────────────────────────
  // Clone and transform so the caller sees logical dates
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();

    // The availability endpoints return { "YYYY-MM-DD": [...] }
    // Check if top-level keys look like dates
    const keys = Object.keys(data);
    const looksLikeDateKeyed = keys.length > 0 && keys.every(k => /^\d{4}-\d{2}-\d{2}$/.test(k));

    const transformed = looksLikeDateKeyed ? shiftResponseDates(data) : data;

    // Also shift any `time` fields inside slot arrays
    if (looksLikeDateKeyed) {
      for (const slots of Object.values(transformed) as unknown[][]) {
        if (!Array.isArray(slots)) continue;
        for (const slot of slots) {
          if (slot && typeof slot === 'object' && 'time' in slot) {
            const s = slot as { time: string };
            try {
              const t = new Date(s.time);
              s.time = subtractDays(t, DISPLAY_OFFSET_DAYS).toISOString();
            } catch {
              // leave as-is
            }
          }
        }
      }
    }

    return new Response(JSON.stringify(transformed), {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  }

  return res;
}


// ═══════════════════════════════════════════════════════════════════════════════
// Diagnostic / experimentation helpers
// ═══════════════════════════════════════════════════════════════════════════════

/** Quick sanity check — log what a display date maps to. */
export function debugShift(displayDateStr: string) {
  const display = parseDate(displayDateStr);
  const api = toApiDate(display);
  console.table({
    displayDate: toDateString(display),
    apiDate: toDateString(api),
    offsetDays: DISPLAY_OFFSET_DAYS,
    isApiDateFuture: api >= new Date(),
  });
}

/**
 * Find the maximum offset that keeps a given display date valid
 * (i.e. the API date lands on or after today).
 */
export function maxOffsetFor(displayDateStr: string): number {
  const display = parseDate(displayDateStr);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diffMs = today.getTime() - display.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
