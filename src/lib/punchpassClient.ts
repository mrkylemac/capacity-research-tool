/**
 * Punchpass client — scrapes the public studio schedule pages.
 *
 * Punchpass (punchpass.com) renders its schedule server-side as HTML; there is
 * no public JSON API. Blue Mountains Sauna's schedule lives at
 * `https://bmsauna.punchpass.com/classes` and paginates forward via a
 * `from_time` cursor. No auth/cookies are required for the public view.
 *
 * Data model — the crux of this integration:
 * - **Future sessions only.** Once a session has started, its page/list entry
 *   stops advertising availability, so past bookings can't be read back. Like
 *   TryBe/Acuity, we merge fresh (future) sessions with previously cached past
 *   sessions to accumulate history over time.
 * - **No capacity or booked count is exposed** — only "N spots left" (remaining)
 *   per session, or "CLASS FULL" (0 remaining). We infer capacity per class
 *   ("course") as the maximum remaining-spots ever advertised for that course:
 *   far-future instances are added empty, so their remaining spots equal the
 *   room's spot limit. `ticketsSold = capacity - spotsLeft`. The inference
 *   ratchets upward and self-corrects as emptier instances appear.
 * - Sessions with no availability label (e.g. earlier-today sessions that have
 *   already started) carry no derivable booking count and are skipped; they are
 *   retained from cache if captured on an earlier poll.
 * - Price is a static per-visit rate from config (Punchpass sells passes, not
 *   per-session tickets).
 * - All session types (Regular / Males Only / Females Only / Silent / INFUSION)
 *   run in the same physical venue, so every session is labelled with the single
 *   configured location, mirroring the TryBe room-consolidation approach.
 */

import type { MomenceSession } from '@/types/momence';
import type { PunchpassConfig } from '@/config/api';

// ── Timezone helpers ───────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map(x => [x.type, x.value]));
  // Intl renders 24:00 as '24' at midnight in some engines; normalise to 00.
  const hour = p.hour === '24' ? '00' : p.hour;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +hour, +p.minute, +p.second);
  return asUTC - date.getTime();
}

/** Convert a wall-clock time in `timeZone` to a UTC ISO string. */
function zonedToUtcISO(
  year: number, month: number, day: number,
  hour: number, minute: number, timeZone: string,
): string {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = tzOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset).toISOString();
}

/** Parse Punchpass duration strings ("2 hours", "90 minutes", "1 hour 30 minutes"). */
function parseDurationMinutes(text: string | null): number {
  if (!text) return 0;
  let minutes = 0;
  const h = text.match(/(\d+)\s*hour/);
  const m = text.match(/(\d+)\s*min/);
  if (h) minutes += parseInt(h[1], 10) * 60;
  if (m) minutes += parseInt(m[1], 10);
  return minutes;
}

// ── HTML parsing ────────────────────────────────────────────────────────────────

interface RawInstance {
  id: string;
  courseId: string;
  sessionType: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  durationMinutes: number;
  /** Remaining spots (0 = full). null when no availability is advertised. */
  spotsLeft: number | null;
}

const DAY_HEADER_RE =
  /schedule__dates__date__month">([A-Za-z]{3})<\/div><div class="schedule__dates__date__day">(\d+)/g;

/**
 * Parse a Punchpass schedule page into raw instances.
 *
 * The page is grouped into day sections (each with an abbreviated month + day
 * number but no year). Instances follow their day header in document order.
 * Years are inferred by starting at `startYear` and rolling over whenever the
 * month decreases (Dec → Jan).
 */
function parseSchedulePage(html: string, startYear: number): RawInstance[] {
  const out: RawInstance[] = [];
  const headers = [...html.matchAll(DAY_HEADER_RE)];
  let prevMonth: number | null = null;
  let year = startYear;

  for (let i = 0; i < headers.length; i++) {
    const month = MONTHS[headers[i][1]];
    const day = parseInt(headers[i][2], 10);
    if (month === undefined) continue;
    if (prevMonth !== null && month < prevMonth) year += 1;
    prevMonth = month;

    const segStart = headers[i].index! + headers[i][0].length;
    const segEnd = i + 1 < headers.length ? headers[i + 1].index! : html.length;
    const segment = html.slice(segStart, segEnd);

    const blocks = segment.split('<div class="schedule__instance instance"').slice(1);
    for (const b of blocks) {
      const idM = b.match(/\/classes\/(\d+)/);
      const courseM = b.match(/data-course-id="(\d+)"/);
      const locM = b.match(/data-location="([^"]*)"/);
      const timeM = b.match(/schedule__instance__time">(\d{1,2}):(\d{2})/);
      const lenM = b.match(/schedule__instance__length">.*?<\/span>\s*([^<]+)<\/span>/s);
      const labelM = b.match(/label">(\d+) SPOT|label">(CLASS FULL)/);
      if (!idM || !courseM || !timeM) continue;

      let spotsLeft: number | null = null;
      if (labelM) spotsLeft = labelM[1] ? parseInt(labelM[1], 10) : 0;

      out.push({
        id: idM[1],
        courseId: courseM[1],
        sessionType: (locM ? locM[1] : '').replace(/&#39;/g, "'").trim(),
        year, month, day,
        hour: parseInt(timeM[1], 10),
        minute: parseInt(timeM[2], 10),
        durationMinutes: parseDurationMinutes(lenM ? lenM[1] : null),
        spotsLeft,
      });
    }
  }
  return out;
}

// ── Fetch + assemble ─────────────────────────────────────────────────────────────

/**
 * Fetch the forward schedule for a Punchpass studio, paging via the `from_time`
 * cursor until the fetch window is covered.
 */
async function fetchSchedule(
  cfg: PunchpassConfig,
  windowDays: number,
  onProgress?: (count: number) => void,
): Promise<RawInstance[]> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowDays * 86_400_000);
  const seen = new Set<string>();
  const all: RawInstance[] = [];

  // Cursor is a wall-clock instant in the venue timezone; start from now.
  let cursor = now;
  const MAX_PAGES = 40;

  for (let page = 0; page < MAX_PAGES; page++) {
    // Punchpass wants the cursor in the studio's local time with offset.
    const localCursor = new Date(cursor.getTime() + tzOffsetMs(cursor, cfg.timezone));
    const y = localCursor.getUTCFullYear();
    const mo = String(localCursor.getUTCMonth() + 1).padStart(2, '0');
    const d = String(localCursor.getUTCDate()).padStart(2, '0');
    const hh = String(localCursor.getUTCHours()).padStart(2, '0');
    const mi = String(localCursor.getUTCMinutes()).padStart(2, '0');
    const ss = String(localCursor.getUTCSeconds()).padStart(2, '0');
    const offMin = -tzOffsetMs(cursor, cfg.timezone) / 60_000;
    const sign = offMin <= 0 ? '+' : '-';
    const oh = String(Math.floor(Math.abs(offMin) / 60)).padStart(2, '0');
    const om = String(Math.abs(offMin) % 60).padStart(2, '0');
    const fromTime = `${y}-${mo}-${d}T${hh}:${mi}:${ss}${sign}${oh}:${om}`;

    const url = `${cfg.baseUrl}/classes?from_time=${encodeURIComponent(fromTime)}`;
    const res = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) throw new Error(`Punchpass ${cfg.name}: ${res.status} ${res.statusText}`);
    const html = await res.text();

    const instances = parseSchedulePage(html, y);
    let added = 0;
    let maxInstant = cursor.getTime();
    for (const inst of instances) {
      const startIso = zonedToUtcISO(
        inst.year, inst.month, inst.day, inst.hour, inst.minute, cfg.timezone,
      );
      const t = new Date(startIso).getTime();
      if (t > maxInstant) maxInstant = t;
      if (!seen.has(inst.id)) {
        seen.add(inst.id);
        all.push(inst);
        added++;
      }
    }
    onProgress?.(all.length);

    // Stop when the page yielded nothing new, or we've paged past the window.
    if (added === 0 || maxInstant >= windowEnd.getTime()) break;
    // Advance the cursor one second past the furthest instance seen.
    const next = new Date(maxInstant + 1000);
    if (next.getTime() <= cursor.getTime()) break;
    cursor = next;
  }

  return all;
}

/**
 * Fetch all Punchpass sessions for a studio and merge with previously cached
 * past sessions (Punchpass exposes future sessions only).
 */
export async function fetchAllPunchpassSessions(
  cfg: PunchpassConfig,
  windowDays: number,
  existingSessions: MomenceSession[],
  onProgress?: (count: number) => void,
): Promise<MomenceSession[]> {
  const now = new Date();
  const raw = await fetchSchedule(cfg, windowDays, onProgress);

  // Infer capacity per course = max advertised remaining spots across the fetch.
  const capacityByCourse = new Map<string, number>();
  for (const inst of raw) {
    if (inst.spotsLeft === null) continue;
    const prev = capacityByCourse.get(inst.courseId) ?? 0;
    if (inst.spotsLeft > prev) capacityByCourse.set(inst.courseId, inst.spotsLeft);
  }

  const fresh: MomenceSession[] = [];
  for (const inst of raw) {
    // Skip sessions with no advertised availability (already started / no data).
    if (inst.spotsLeft === null) continue;
    const capacity = capacityByCourse.get(inst.courseId) ?? inst.spotsLeft;
    const durationMinutes = inst.durationMinutes || 120;
    const startsAt = zonedToUtcISO(inst.year, inst.month, inst.day, inst.hour, inst.minute, cfg.timezone);
    const endsAt = new Date(new Date(startsAt).getTime() + durationMinutes * 60_000).toISOString();
    fresh.push({
      id: inst.id,
      sessionName: inst.sessionType || 'Sauna Session',
      startsAt,
      endsAt,
      durationMinutes,
      capacity,
      ticketsSold: Math.max(0, capacity - inst.spotsLeft),
      fixedTicketPrice: cfg.sessionPrice,
      location: cfg.location,
      inPerson: true,
    });
  }

  const freshIds = new Set(fresh.map(s => s.id));
  // Preserve cached sessions that have now passed (Punchpass drops their
  // availability once started), normalising location to the configured name.
  const past = existingSessions
    .filter(s => new Date(s.startsAt) < now && !freshIds.has(s.id))
    .map(s => ({ ...s, location: cfg.location }));

  return [...past, ...fresh].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
