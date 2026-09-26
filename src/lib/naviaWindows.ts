/**
 * Navia's windows endpoint: its own record of who came, kept as fetched.
 *
 * `/slots/availability-windows` is a second public view of the same booking
 * counter the slot feed reads. For every quarter hour it gives the entries
 * booked into that 15 minute interval (`currentEntries`), the people in the
 * room across the stay (`currentOccupancy`), the room's limit (`maxCapacity`),
 * the per-entry limit and whether it can still be booked. Unlike the slot feed
 * it keeps serving past dates, so a count settles after the session has run.
 *
 * ── Why sittings are rebuilt from it ────────────────────────────────────────
 *
 * The slot feed drops an entry the moment it starts, so the last poll before
 * start is the only count it ever gives. Checked on 2026-09-13 against 1,675
 * Prahran entries:
 *
 *   - Read back to back, the two endpoints agreed on 149 of 149 entries. Same
 *     counter, same definition.
 *   - The gap between our last reading and Navia's settled figure shrank with
 *     how close to start we read: 0.14 per entry under 15 minutes, 1.09 at
 *     three to six hours. It tripled when polling fell from about 22 runs a day
 *     to 2 to 5 on 27 August, and stayed small on the days we still read close
 *     to start. So it is bookings made after we looked, not a change at Navia.
 *   - Even a reading inside the final 15 minutes misses about 0.15 per entry,
 *     taken at the last minute or at the door. Only a count read after the
 *     session can include those.
 *
 * ── What is kept ────────────────────────────────────────────────────────────
 *
 * Every window ever returned, keyed by location and start, with its latest
 * reading and the last reading taken before it started (which says what was
 * actually on sale). A post-start reading that is later replaced by a different
 * value is kept in `revisions`. Nothing is deleted: a future window Navia stops
 * listing is marked `withdrawnAt`, and a past one is never touched by an empty
 * response, in case Navia one day stops serving history.
 *
 * Stored one file per UTC month so a finished month stops being rewritten.
 *
 * ── Known limits ────────────────────────────────────────────────────────────
 *
 * Past windows report today's settings. Prahran's per-entry limit was 10 until
 * 3pm on 22 August 2026 and the endpoint shows 8 for every date, so the limit
 * in force comes from the reading before start, or `entryLimitHistory` when
 * there was none.
 */

import type { NaviaLocation } from '@/config/api';
import type { MomenceSession, SupersededSold } from '@/types/momence';
import type { NaviaEntryObservation, NaviaLocationContext } from '@/lib/naviaClient';
import { localDateKey } from '@/lib/tz';

// ── Raw API shape ────────────────────────────────────────────────────────────

export interface NaviaWindow {
  startAt: string;
  endAt: string;
  isBookable: boolean;
  currentOccupancy: number;
  maxCapacity: number;
  currentEntries: number;
  entryLimitPerInterval: number;
}

interface NaviaWindowsResponse {
  success: boolean;
  data?: { windows?: NaviaWindow[] };
}

// ── Stored shape ─────────────────────────────────────────────────────────────

export interface NaviaWindowReading {
  /** Entries booked into this 15 minute interval. */
  entries: number;
  /** People in the room during the stay. Null when read through the slot feed. */
  occupancy: number | null;
  /** The room's limit as reported at the time. Null when read through the slot feed. */
  roomCapacity: number | null;
  entryLimit: number;
  isBookable: boolean;
  observedAt: string;
  /**
   * `slot-feed` readings are the pre-start history recovered from the entry
   * ledger. Their `entries` is limit minus available seats, which overstates
   * bookings when the room rather than the entry is what is full.
   */
  source: 'windows' | 'slot-feed';
}

export interface NaviaWindowRecord {
  locationId: number;
  startAt: string;
  endAt: string;
  latest: NaviaWindowReading;
  /** The last reading taken before the window started. */
  preStart?: NaviaWindowReading;
  /** Post-start readings later replaced by a different value, oldest first. */
  revisions?: NaviaWindowReading[];
  /** Set when Navia stopped listing a window that had not started yet. */
  withdrawnAt?: string;
}

export interface PersistedNaviaWindows {
  refreshedAt: string;
  /** `${locationId}|${startAt}` -> record. */
  windows: Record<string, NaviaWindowRecord>;
}

export const windowKey = (locationId: number, startAt: string) => `${locationId}|${startAt}`;

/** The UTC month a window is filed under, `YYYY-MM`. */
export const windowMonth = (startAt: string) => startAt.slice(0, 7);

export const WINDOWS_LEDGER_PREFIX = 'navia-windows-ledger-';

// ── Merge ────────────────────────────────────────────────────────────────────

function sameReading(a: NaviaWindowReading, b: NaviaWindowReading): boolean {
  return a.entries === b.entries
    && a.occupancy === b.occupancy
    && a.roomCapacity === b.roomCapacity
    && a.entryLimit === b.entryLimit
    && a.isBookable === b.isBookable;
}

/**
 * Fold one reading into a record. Pure: returns a new record.
 *
 * The latest reading always wins `latest`. If the one it replaces was itself
 * taken after start and says something different, it moves to `revisions`:
 * before start a count moving is just bookings, after start it is Navia
 * changing a settled figure, and that is worth keeping. `preStart` tracks the
 * newest reading taken before start, whichever source it came from.
 */
export function foldReading(
  record: NaviaWindowRecord | undefined,
  base: { locationId: number; startAt: string; endAt: string },
  reading: NaviaWindowReading,
): NaviaWindowRecord {
  const startMs = Date.parse(base.startAt);
  const readMs = Date.parse(reading.observedAt);
  const beforeStart = readMs < startMs;

  if (!record) {
    return { ...base, latest: reading, ...(beforeStart ? { preStart: reading } : {}) };
  }

  const next: NaviaWindowRecord = { ...record };

  if (beforeStart && (!record.preStart || readMs >= Date.parse(record.preStart.observedAt))) {
    next.preStart = reading;
  }

  // A slot-feed reading only ever fills in what happened before start; it never
  // replaces the windows endpoint's own latest figure.
  if (reading.source === 'windows' && readMs >= Date.parse(record.latest.observedAt)) {
    const prev = record.latest;
    const prevAfterStart = Date.parse(prev.observedAt) >= startMs && prev.source === 'windows';
    if (prevAfterStart && !sameReading(prev, reading)) {
      next.revisions = [...(record.revisions ?? []), prev];
    }
    next.latest = reading;
    next.endAt = base.endAt;
  }

  return next;
}

export function windowToReading(w: NaviaWindow, observedAt: string): NaviaWindowReading {
  return {
    entries: w.currentEntries,
    occupancy: w.currentOccupancy,
    roomCapacity: w.maxCapacity,
    entryLimit: w.entryLimitPerInterval,
    isBookable: w.isBookable,
    observedAt,
    source: 'windows',
  };
}

/**
 * Record one fetched day for a location. Windows missing from the response are
 * marked withdrawn only if they have not started: an empty past day is far
 * more likely Navia no longer serving history than a session that never ran.
 */
export function mergeWindowsDay(
  ledger: PersistedNaviaWindows,
  loc: Pick<NaviaLocation, 'locationId' | 'timezone'>,
  date: string,
  fetched: NaviaWindow[],
  now: Date,
): PersistedNaviaWindows {
  const observedAt = now.toISOString();
  const windows = { ...ledger.windows };
  const seen = new Set<string>();

  for (const w of fetched) {
    const key = windowKey(loc.locationId, w.startAt);
    seen.add(key);
    const folded = foldReading(windows[key], { locationId: loc.locationId, startAt: w.startAt, endAt: w.endAt }, windowToReading(w, observedAt));
    if (folded.withdrawnAt) delete folded.withdrawnAt;
    windows[key] = folded;
  }

  for (const [key, rec] of Object.entries(windows)) {
    if (rec.locationId !== loc.locationId || seen.has(key) || rec.withdrawnAt) continue;
    if (Date.parse(rec.startAt) <= now.getTime()) continue;
    if (localDateKey(new Date(rec.startAt), loc.timezone) !== date) continue;
    windows[key] = { ...rec, withdrawnAt: observedAt };
  }

  return { refreshedAt: observedAt, windows };
}

/**
 * Seed `preStart` from a slot-feed reading. Used to carry the entry ledger's
 * history, which is the only record of what was on sale before start for the
 * weeks before this endpoint was polled.
 */
export function mergeFeedObservations(
  ledger: PersistedNaviaWindows,
  observations: NaviaEntryObservation[],
): PersistedNaviaWindows {
  let windows: Record<string, NaviaWindowRecord> | null = null;
  for (const o of observations) {
    // The ledger only ever holds readings from before start; anything else is
    // clock skew and says nothing about what was on sale.
    if (Date.parse(o.observedAt) >= Date.parse(o.startTime)) continue;
    const key = windowKey(o.locationId, o.startTime);
    const rec = (windows ?? ledger.windows)[key];
    // Only windows the endpoint itself has returned. A feed reading on its own
    // would create a record with no settled figure.
    if (!rec) continue;
    const folded = foldReading(rec, rec, {
      entries: Math.max(0, o.maxCapacity - o.availableCapacity),
      occupancy: null,
      roomCapacity: null,
      entryLimit: o.maxCapacity,
      isBookable: o.isBookable,
      observedAt: o.observedAt,
      source: 'slot-feed',
    });
    if (folded.preStart === rec.preStart) continue;
    windows ??= { ...ledger.windows };
    windows[key] = folded;
  }
  return windows ? { ...ledger, windows } : ledger;
}

/** Combine monthly files into one ledger. */
export function combineLedgers(parts: PersistedNaviaWindows[]): PersistedNaviaWindows {
  const windows: Record<string, NaviaWindowRecord> = {};
  let refreshedAt = '';
  for (const p of parts) {
    Object.assign(windows, p.windows);
    if (p.refreshedAt > refreshedAt) refreshedAt = p.refreshedAt;
  }
  return { refreshedAt, windows };
}

/** Split a ledger into monthly files, keys in start order. */
export function splitLedgerByMonth(ledger: PersistedNaviaWindows): Map<string, PersistedNaviaWindows> {
  const out = new Map<string, PersistedNaviaWindows>();
  for (const key of Object.keys(ledger.windows).sort()) {
    const rec = ledger.windows[key];
    const month = windowMonth(rec.startAt);
    if (!out.has(month)) out.set(month, { refreshedAt: ledger.refreshedAt, windows: {} });
    out.get(month)!.windows[key] = rec;
  }
  return out;
}

/**
 * One window per line. A month holds about 3,000 windows, and pretty printing
 * each over a dozen lines makes every poll's diff unreadable for no benefit.
 */
export function serialiseLedger(ledger: PersistedNaviaWindows): string {
  const lines = Object.keys(ledger.windows)
    .sort()
    .map(k => `    ${JSON.stringify(k)}: ${JSON.stringify(ledger.windows[k])}`);
  return `{\n  "refreshedAt": ${JSON.stringify(ledger.refreshedAt)},\n  "windows": {\n${lines.join(',\n')}\n  }\n}\n`;
}

// ── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchWindowsDay(cfg: NaviaLocationContext, date: string): Promise<NaviaWindow[]> {
  const url =
    `${cfg.baseUrl}/slots/availability-windows` +
    `?serviceOptionId=${cfg.serviceOptionId}` +
    `&date=${date}&intervalMinutes=15&includeCapacity=true&includePast=true`;

  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'slowfolk-sauna-benchmark/1.0 (+https://slowfolk.com.au)',
    },
  });
  if (!res.ok) throw new Error(`Navia windows ${cfg.name} ${date}: HTTP ${res.status}`);

  const body = (await res.json()) as NaviaWindowsResponse;
  if (!body.success) throw new Error(`Navia windows ${cfg.name} ${date}: success=false`);
  return body.data?.windows ?? [];
}

// ── Sittings ─────────────────────────────────────────────────────────────────

const HOUR_MS = 60 * 60 * 1000;

/**
 * Minute of hour is identical in UTC and every Australian timezone Navia trades
 * in (all whole-hour offsets), so flooring in UTC lands on the local hour.
 */
const hourOf = (iso: string) => {
  const d = new Date(iso);
  d.setUTCMinutes(0, 0, 0);
  return d.getTime();
};

export function entryLimitAt(loc: Pick<NaviaLocation, 'entryLimitHistory'>, startAt: string): number | null {
  const t = Date.parse(startAt);
  let limit: number | null = null;
  for (const step of loc.entryLimitHistory) {
    if (Date.parse(step.from) <= t) limit = step.limit;
  }
  return limit;
}

/**
 * Seats one entry put on sale, from the reading taken before it started.
 *
 * A bookable entry offered its limit; one that was closed offered only the
 * seats already taken, since its free seats could not be bought. Navia admits
 * over the limit now and then (staff bookings, by the look of it), so offered
 * never falls below the people who actually came.
 *
 * With no reading before start the limit comes from `entryLimitHistory`, and
 * the entry is taken as open unless it filled. That is Navia's own rule: an
 * entry closes when it or the room is full. The room half cannot be checked
 * for past dates, so this can only overstate what was offered, and the
 * sitting says so.
 */
function offeredSeats(rec: NaviaWindowRecord, loc: NaviaLocation): { offered: number; inferred: boolean } {
  const came = rec.latest.entries;
  const pre = rec.preStart;
  if (pre) {
    return { offered: pre.isBookable ? Math.max(pre.entryLimit, came) : came, inferred: false };
  }
  const limit = entryLimitAt(loc, rec.startAt) ?? rec.latest.entryLimit;
  return { offered: came >= limit ? came : limit, inferred: true };
}

const INFERRED_NOTE =
  'Capacity partly inferred. No reading was taken before some entries started, so each was taken as open unless it filled.';

export const SUPERSEDED_DECIDED_ON = '2026-09-13';

function supersededNote(reason: SupersededSold['reason'], ours: number, navia: number): string {
  const tail = `Navia's figure is used, decided ${SUPERSEDED_DECIDED_ON}. Our count is kept here so that can be revisited.`;
  switch (reason) {
    case 'room-full-read-as-sold':
      return `We recorded ${ours} and Navia has ${navia}. The room was nearly full when we read it, and the slot feed reports a full room as seats sold, so ours was most likely an overcount rather than cancellations. ${tail}`;
    case 'no-supporting-reading':
      return `We recorded ${ours} and Navia has ${navia}, and no reading before start supports our figure, so where it came from cannot be checked. ${tail}`;
    default:
      return `We recorded ${ours} before the sitting started and Navia now has ${navia}. Treated as bookings cancelled after our reading. ${tail}`;
  }
}

function supersededReason(windows: NaviaWindowRecord[], ours: number): SupersededSold['reason'] {
  const roomFull = windows.some(w =>
    w.preStart
    && w.preStart.entries > w.latest.entries
    && w.latest.occupancy !== null
    && w.latest.roomCapacity !== null
    && w.latest.occupancy >= w.latest.roomCapacity - 2,
  );
  if (roomFull) return 'room-full-read-as-sold';
  const readBeforeStart = windows.reduce((n, w) => n + (w.preStart?.entries ?? 0), 0);
  if (ours > readBeforeStart) return 'no-supporting-reading';
  return 'cancelled-after-reading';
}

/**
 * Build one location's sittings from the ledger.
 *
 * A sitting is the windows starting inside one clock hour, the same shape the
 * slot feed's blocks take, and it carries the same id so the two caches line
 * up. `feedSessions` supplies the anchors for a gapped grid and the counts we
 * recorded before start; `previous` is this cache's last build, whose past
 * sittings are never dropped and whose superseded counts are carried forward
 * if the feed cache ever loses them.
 */
export function buildWindowSittings(
  ledger: PersistedNaviaWindows,
  loc: NaviaLocationContext,
  feedSessions: MomenceSession[],
  previous: MomenceSession[],
  now: Date,
): MomenceSession[] {
  const nowMs = now.getTime();
  const records = Object.values(ledger.windows).filter(
    r => r.locationId === loc.locationId && !r.withdrawnAt,
  );

  const byHour = new Map<number, NaviaWindowRecord[]>();
  for (const r of records) {
    const h = hourOf(r.startAt);
    if (!byHour.has(h)) byHour.set(h, []);
    byHour.get(h)!.push(r);
  }

  const atLocation = (s: MomenceSession) => s.location === loc.name;
  const anchors = loc.sittingAnchors === 'every-hour'
    ? [...byHour.keys()]
    : [...new Set(feedSessions.filter(atLocation).map(s => hourOf(s.startsAt)))];

  const feedById = new Map(feedSessions.filter(atLocation).map(s => [s.id, s]));
  const previousById = new Map(previous.filter(atLocation).map(s => [s.id, s]));
  const confirmedFromMs = loc.capacityConfirmedFrom ? Date.parse(loc.capacityConfirmedFrom) : null;

  const built: MomenceSession[] = [];

  for (const h of anchors.sort((a, b) => a - b)) {
    const windows = (byHour.get(h) ?? []).sort((a, b) => a.startAt.localeCompare(b.startAt));
    if (windows.length === 0) continue;

    const startsAt = new Date(h).toISOString();
    const id = `navia-${loc.locationId}-${startsAt}`;
    const sold = windows.reduce((n, w) => n + w.latest.entries, 0);

    const base: MomenceSession = {
      id,
      sessionName: loc.sessionName,
      startsAt,
      endsAt: new Date(h + loc.sessionDurationMinutes * 60 * 1000).toISOString(),
      durationMinutes: loc.sessionDurationMinutes,
      capacity: 0,
      ticketsSold: sold,
      fixedTicketPrice: loc.seatPrice ?? 0,
      location: loc.name,
      inPerson: true,
      soldSource: 'reported',
      measure: loc.measure,
    };

    if (!loc.utilisationEligible) {
      built.push({ ...base, utilisationKnown: false, capacitySource: 'unknown', confidence: 'low' });
      continue;
    }

    let capacity = 0;
    let inferred = false;
    for (const w of windows) {
      const o = offeredSeats(w, loc);
      capacity += o.offered;
      inferred ||= o.inferred;
    }

    const notes: string[] = [];
    if (confirmedFromMs !== null && h < confirmedFromMs && loc.capacityUnconfirmedNote) {
      notes.push(loc.capacityUnconfirmedNote);
    }
    if (inferred) notes.push(INFERRED_NOTE);

    const session: MomenceSession = {
      ...base,
      capacity,
      capacitySource: 'derived-grid',
      confidence: notes.length > 0 ? 'low' : 'medium',
      ...(notes.length > 0 ? { capacityNotes: notes } : {}),
      // Nothing on sale and nobody came: a closed hour, not an empty one.
      ...(capacity === 0 ? { isCancelled: true } : {}),
    };

    if (h < nowMs) {
      const feed = feedById.get(id);
      if (feed && feed.ticketsSold > sold) {
        const reason = supersededReason(windows, feed.ticketsSold);
        session.supersededSold = {
          ticketsSold: feed.ticketsSold,
          source: 'slot-feed',
          reason,
          note: supersededNote(reason, feed.ticketsSold, sold),
          decidedOn: SUPERSEDED_DECIDED_ON,
        };
      } else if (!feed && previousById.get(id)?.supersededSold) {
        session.supersededSold = previousById.get(id)!.supersededSold;
      }
    }

    built.push(session);
  }

  // A sitting that has run is never dropped, even if a later build stops
  // producing it: the ledger is append-only, so this should not happen, and if
  // it does the old record is safer than a hole.
  const builtIds = new Set(built.map(s => s.id));
  for (const s of previous.filter(atLocation)) {
    if (Date.parse(s.startsAt) < nowMs && !builtIds.has(s.id)) built.push(s);
  }

  return built.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
