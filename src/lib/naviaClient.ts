/**
 * Navia Bathhouse — bespoke booking API (api.naviabathhouse.com.au).
 *
 * Navia runs its own booking platform across two venues: Byron Bay (trading
 * since March 2026) and Prahran (opened 2026-08-15). The API is public, needs
 * no auth, and returns genuine UTC timestamps.
 *
 * ── The session boundary has to be derived ──────────────────────────────────
 *
 * The feed does not publish sessions. It publishes *entries*: a bookable start
 * time with its own seat counter. Byron admits four staggered entries 15
 * minutes apart (07:00/07:15/07:30/07:45), each capped at 4 seats, and each
 * entry buys a 2-hour stay. The next group of four opens at 09:00.
 *
 * So a Byron "sitting" is four entries, and its capacity is 4 x 4 = 16. This
 * was verified across 16 consecutive trading days: every block held exactly
 * four entries, every entry capped at 4, and the maximum overlap depth across
 * a whole day was exactly 4 — the blocks tile without ever stacking, which is
 * what makes 16 a ceiling rather than a guess.
 *
 * Emitting one session per entry instead would report 24 sessions a day at a
 * venue that runs six sittings, inflating every per-session average fourfold.
 *
 * ── Why Prahran carries no capacity ─────────────────────────────────────────
 *
 * Prahran runs a continuous 15-minute grid from 06:00 to 20:00 with no gap to
 * break on, so there is no block boundary to derive a sitting from. Its
 * overlap depth is a function of which product you query (8-deep for the
 * 2-hour, 4-deep for the 1-hour), so a grid-derived denominator would be 80 or
 * 40 for the same room on the same day. Summing `maxCapacity` across its 57
 * overlapping starts claims 570 seats a day in a room measured at 15
 * concurrent.
 *
 * Prahran therefore emits `capacity: 0` + `utilisationKnown: false`, which
 * `sanitizeSessions` drops from every average. Its bookings are real and are
 * still cached; only the denominator is missing.
 *
 * ── No history ──────────────────────────────────────────────────────────────
 *
 * Slots are filtered `startTime > now` server-side and vanish the instant they
 * start. Past dates return `{success: true, data: []}` — a 200, not an error.
 * Incremental caching is the only path and a polling gap is permanent loss.
 *
 * Because entries expire individually, a mid-block poll sees a partial block
 * that cannot be rebuilt from a cached block session. The entry ledger
 * (`{hostId}-navia-ledger.json`) exists for exactly this: it keeps the last
 * pre-start reading of every entry so a complete sitting can be assembled
 * after some of its entries have already expired.
 */

import type { NaviaConfig, NaviaLocation } from '@/config/api';
import type { MomenceSession } from '@/types/momence';
import { localDateKey, addLocalDays } from '@/lib/tz';

// ── Raw API shape ────────────────────────────────────────────────────────────

export interface NaviaSlot {
  /** `{serviceOptionId}-{startTime}-{locationId}` — product-scoped, never use as a session id. */
  id: string;
  serviceOptionId: number;
  locationId: number;
  startTime: string;
  endTime: string;
  availableCapacity: number;
  maxCapacity: number;
  isBookable: boolean;
  bufferTimeMinutes?: number;
  resource?: { id: number; name: string };
  occupancyLevel?: string;
}

interface NaviaResponse {
  success: boolean;
  data?: NaviaSlot[];
}

// ── Entry ledger ─────────────────────────────────────────────────────────────

/** One pre-start reading of a single entry's seat counter. */
export interface NaviaEntryObservation {
  locationId: number;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  availableCapacity: number;
  isBookable: boolean;
  occupancyLevel: string;
  /** Which product this was read through, kept for provenance. */
  serviceOptionId: number;
  observedAt: string;
}

export interface PersistedNaviaLedger {
  refreshedAt: string;
  /** `${locationId}|${startTime}` -> last pre-start observation. */
  entries: Record<string, NaviaEntryObservation>;
}

const entryKey = (o: { locationId: number; startTime: string }) =>
  `${o.locationId}|${o.startTime}`;

/**
 * One location plus the venue-wide settings it needs, flattened.
 *
 * Navia is one venue with two locations that measure differently, so the
 * blocking and session-building functions work per location. Flattening keeps
 * them taking a single object rather than threading two.
 */
export type NaviaLocationContext = NaviaLocation & Pick<
  NaviaConfig,
  'baseUrl' | 'sessionName' | 'entryStrideMinutes' | 'maxBlockEntries' |
  'hotDays' | 'horizonDays' | 'ledgerRetentionDays'
>;

export function resolveLocation(cfg: NaviaConfig, loc: NaviaLocation): NaviaLocationContext {
  return {
    ...loc,
    baseUrl: cfg.baseUrl,
    sessionName: cfg.sessionName,
    entryStrideMinutes: cfg.entryStrideMinutes,
    maxBlockEntries: cfg.maxBlockEntries,
    hotDays: cfg.hotDays,
    horizonDays: cfg.horizonDays,
    ledgerRetentionDays: cfg.ledgerRetentionDays,
  };
}

/**
 * Keep only slots still in the future.
 *
 * The feed only ever returns future slots, so an observation at or after its
 * own start time means clock skew or an API change. Dropping it is safer than
 * recording a reading that may already have lost late bookings.
 */
export function slotsToObservations(slots: NaviaSlot[], now: Date): NaviaEntryObservation[] {
  const nowMs = now.getTime();
  const out: NaviaEntryObservation[] = [];

  for (const s of slots) {
    const startMs = new Date(s.startTime).getTime();
    if (!Number.isFinite(startMs) || startMs <= nowMs) continue;

    out.push({
      locationId: s.locationId,
      startTime: s.startTime,
      endTime: s.endTime,
      maxCapacity: s.maxCapacity,
      availableCapacity: s.availableCapacity,
      isBookable: s.isBookable,
      occupancyLevel: s.occupancyLevel ?? 'available',
      serviceOptionId: s.serviceOptionId,
      observedAt: now.toISOString(),
    });
  }

  return out;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fold fresh observations into the ledger, last write wins, then trim it to the
 * window either side of now that it actually needs to cover.
 *
 * Bounded on both sides deliberately. The ledger exists only to recover entries
 * that have *expired* — forward entries come back complete on every poll, so
 * persisting a month of them would rewrite a 700KB file every fifteen minutes
 * to no purpose. Backwards it only needs to outlive the longest plausible
 * polling gap: once a sitting is fully past, its session is frozen into the
 * session cache and its entries are dead weight.
 */
export function mergeLedger(
  cached: PersistedNaviaLedger | null,
  fresh: NaviaEntryObservation[],
  now: Date,
  retentionDays: number,
  forwardDays: number,
): PersistedNaviaLedger {
  const entries: Record<string, NaviaEntryObservation> = { ...(cached?.entries ?? {}) };

  for (const o of fresh) entries[entryKey(o)] = o;

  const from = now.getTime() - retentionDays * DAY_MS;
  const to = now.getTime() + forwardDays * DAY_MS;
  for (const [key, o] of Object.entries(entries)) {
    const startMs = new Date(o.startTime).getTime();
    if (startMs < from || startMs > to) delete entries[key];
  }

  return { refreshedAt: now.toISOString(), entries };
}

// ── Blocking ─────────────────────────────────────────────────────────────────

/**
 * Split entries into sittings. A new one starts on a gap larger than the entry
 * stride, or on the hour.
 *
 * The gap rule alone is derived rather than hardcoded, which matters because
 * Byron drops its 07:00 sitting on Tuesdays (five blocks, 20 slots) and fixed
 * clock anchors would mis-block one day in seven.
 *
 * The on-the-hour rule is what lets a continuous grid be blocked at all. Byron
 * hands you the boundaries for free because its sittings are separated by 75
 * minutes of dead air; Prahran runs an unbroken 15-minute cadence with no gap to
 * break on, so without this every entry of the day collapses into one block.
 * Both venues put four entries at :00/:15/:30/:45, so the same rule blocks both
 * identically and Byron's result is unchanged.
 *
 * Reading the minute in UTC is safe here: every Australian timezone Navia
 * operates in is a whole-hour offset, so minute-of-hour is identical in UTC and
 * local time. It would not be safe for a venue on a 30- or 45-minute offset.
 */
export function groupIntoBlocks(
  entries: NaviaEntryObservation[],
  cfg: NaviaLocationContext,
): NaviaEntryObservation[][] {
  const sorted = [...entries]
    .filter(e => e.locationId === cfg.locationId)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (sorted.length === 0) return [];

  // No block model — every entry stands alone (Prahran's continuous grid).
  if (cfg.blockEntries === null) return sorted.map(e => [e]);

  const strideMs = cfg.entryStrideMinutes * 60 * 1000;
  const blocks: NaviaEntryObservation[][] = [];
  let current: NaviaEntryObservation[] = [sorted[0]];

  for (const entry of sorted.slice(1)) {
    const start = new Date(entry.startTime);
    const gap = start.getTime() - new Date(current[current.length - 1].startTime).getTime();
    if (gap > strideMs || start.getUTCMinutes() === 0) {
      blocks.push(current);
      current = [entry];
    } else {
      current.push(entry);
    }
  }
  blocks.push(current);

  return blocks;
}

/**
 * Reasons a block's denominator cannot be trusted. Returning a reason means
 * the session is emitted as schedule-only rather than with a wrong number.
 */
function invalidateReason(block: NaviaEntryObservation[], cfg: NaviaLocationContext): string | null {
  if (cfg.blockEntries === null) return 'no-block-model';

  if (block.length !== cfg.blockEntries) {
    // Fires on a partially-observed block: the first poll of the day, or after
    // a poller outage swallowed some of its entries.
    return `partial-block (${block.length}/${cfg.blockEntries} entries)`;
  }
  if (block.length > cfg.maxBlockEntries) {
    return `grid-changed (${block.length} entries)`;
  }
  if (new Set(block.map(e => e.maxCapacity)).size > 1) {
    return 'mixed-entry-capacity';
  }
  for (const e of block) {
    // Seats advertised as free on an unsellable entry are not actually on
    // offer, so the block's denominator is unknown. Observed on Byron
    // 2026-08-17 13:00/13:15/13:30: avail 4, occupancyLevel "available",
    // isBookable false.
    if (!e.isBookable && e.availableCapacity > 0) return 'unsellable-entry';

    // A full counter that the venue does not call "available" is the tell for
    // a hold the feed does not expose. Proving it needs a guestCount sweep at
    // 5-11x the request budget; this catches the visible cases for free.
    if (e.availableCapacity === e.maxCapacity && e.occupancyLevel !== 'available') {
      return 'hidden-hold';
    }
  }

  return null;
}

/**
 * Turn one sitting into a session.
 *
 * `endsAt` is the anchor plus the product duration, never the last entry's own
 * end. Byron's final entry runs 45 minutes past the sitting, so using it would
 * overlap consecutive blocks and render a phantom 32-seat concurrency curve in
 * the operating-model chart.
 */
export function blockToSession(block: NaviaEntryObservation[], cfg: NaviaLocationContext): MomenceSession {
  const sorted = [...block].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const anchor = sorted[0];
  const startMs = new Date(anchor.startTime).getTime();
  const endsAt = new Date(startMs + cfg.sessionDurationMinutes * 60 * 1000).toISOString();

  const reason = cfg.utilisationEligible ? invalidateReason(sorted, cfg) : 'location-ineligible';
  const sold = sorted.reduce((n, e) => n + Math.max(0, e.maxCapacity - e.availableCapacity), 0);

  const base: MomenceSession = {
    id: `navia-${cfg.locationId}-${anchor.startTime}`,
    sessionName: cfg.sessionName,
    startsAt: anchor.startTime,
    endsAt,
    durationMinutes: cfg.sessionDurationMinutes,
    capacity: 0,
    ticketsSold: 0,
    fixedTicketPrice: cfg.seatPrice ?? 0,
    location: cfg.name,
    inPerson: true,
  };

  if (reason) {
    // Two different gaps hide behind one flag, and they are not interchangeable.
    //
    // A location with no derivable denominator (Prahran) still has a real,
    // directly observed booking count — only the seat total is missing, so
    // `ticketsSold` is kept and stays usable as a visit figure.
    //
    // A sitting that failed validation (a partial Byron block) has an
    // unreliable count as well, so it is zeroed.
    //
    // Either way capacity is 0 and utilisationKnown is false, which
    // `sanitizeSessions` checks independently — neither number reaches an
    // average, and a placeholder zero never reads as an empty room.
    const soldIsReal = !cfg.utilisationEligible;
    return {
      ...base,
      capacity: 0,
      ticketsSold: soldIsReal ? sold : 0,
      utilisationKnown: false,
      capacitySource: 'unknown',
      soldSource: soldIsReal ? 'reported-remaining' : 'unknown',
      measure: cfg.measure,
      confidence: 'low',
    };
  }

  return {
    ...base,
    capacity: sorted.reduce((n, e) => n + e.maxCapacity, 0),
    ticketsSold: sold,
    capacitySource: 'derived-grid',
    soldSource: 'derived-grid',
    measure: cfg.measure,
    confidence: 'medium',
  };
}

// ── Merge ────────────────────────────────────────────────────────────────────

/**
 * Rebuild the window this poll actually covered, and leave everything outside
 * it untouched.
 *
 * Deliberately unlike the Punchpass rule that a cached observation always beats
 * a fresh unknown. Navia publishes genuine closures — Byron is shut
 * 2026-08-31 to 09-06 — and a cache-wins rule would keep serving those days as
 * ghost sessions forever. Rebuilding means a schedule change or a closure
 * self-corrects on the next poll.
 *
 * The window is bounded at both ends, which is what lets a 3-day routine poll
 * coexist with a 35-day nightly one: history before it is frozen, and the
 * forward schedule beyond it survives instead of being deleted and refetched.
 */
export function mergeWithCached(
  fresh: MomenceSession[],
  cached: MomenceSession[],
  windowStartMs: number,
  windowEndMs: number,
  nowMs: number,
): MomenceSession[] {
  const byId = new Map<string, MomenceSession>();
  const freshIds = new Set(fresh.map(s => s.id));

  for (const s of cached) {
    const startMs = new Date(s.startsAt).getTime();
    const outsideWindow = startMs < windowStartMs || startMs > windowEndMs;

    // A sitting that has already begun cannot be rebuilt: its entries are gone
    // from the feed for good, and they age out of the ledger a few days later.
    // Once that happens the fresh build simply stops producing it, so dropping
    // it here would quietly delete history that can never be re-fetched.
    // Future sittings are still rebuilt wholesale, which is what lets a closure
    // or a timetable change self-correct.
    const alreadyRan = startMs < nowMs;

    if (outsideWindow || (alreadyRan && !freshIds.has(s.id))) byId.set(s.id, s);
  }
  // A sitting that has already run must never have its booking count fall.
  // Two pollers reading the same sitting at different moments see different
  // totals, and bookings accumulate, so the higher reading is the later one.
  // Without this, a poll that rebuilds an already-run sitting from a staler
  // ledger silently erases bookings an earlier poll had captured — which is how
  // 27 real bookings were nearly lost on 2026-08-20.
  const cachedById = new Map(cached.map(s => [s.id, s]));
  for (const s of fresh) {
    const prior = cachedById.get(s.id);
    const alreadyRan = new Date(s.startsAt).getTime() < nowMs;
    byId.set(
      s.id,
      alreadyRan && prior && prior.ticketsSold > s.ticketsSold
        ? { ...s, ticketsSold: prior.ticketsSold }
        : s,
    );
  }

  return [...byId.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

// ── Fetch ────────────────────────────────────────────────────────────────────

export interface NaviaFetchOptions {
  onProgress?: (count: number) => void;
  cachedLedger?: PersistedNaviaLedger | null;
  onLedger?: (ledger: PersistedNaviaLedger) => void;
  /** Walk the full forward horizon instead of just the hot window. */
  forceDeepRefresh?: boolean;
}

/**
 * One request per venue-local day. `endDate` is validated but then ignored —
 * the response always contains exactly the day named by `startDate` — so there
 * is no batching, no pagination and no cursor to exploit.
 */
async function fetchDay(cfg: NaviaLocationContext, date: string): Promise<NaviaSlot[]> {
  const url =
    `${cfg.baseUrl}/slots/availability` +
    `?serviceId=${cfg.serviceId}` +
    `&locationId=${cfg.locationId}` +
    `&serviceOptionId=${cfg.serviceOptionId}` +
    `&startDate=${date}&endDate=${date}` +
    `&guestCount=0`;

  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'slowfolk-sauna-benchmark/1.0 (+https://slowfolk.com.au)',
    },
  });

  if (!res.ok) throw new Error(`Navia ${cfg.name} ${date}: HTTP ${res.status}`);

  const body = (await res.json()) as NaviaResponse;
  if (!body.success) throw new Error(`Navia ${cfg.name} ${date}: success=false`);

  // An empty day is normal, not a failure: Byron closes for a week from
  // 2026-08-31 and Prahran had no slots before it opened on 2026-08-15.
  return body.data ?? [];
}

export async function fetchAllNaviaSessions(
  cfg: NaviaConfig,
  existingSessions: MomenceSession[],
  options: NaviaFetchOptions = {},
): Promise<MomenceSession[]> {
  const { onProgress, cachedLedger = null, onLedger, forceDeepRefresh = false } = options;
  const now = new Date();
  const days = forceDeepRefresh ? cfg.horizonDays : cfg.hotDays;

  // One ledger covers both locations: entries are keyed by locationId already.
  const observations: NaviaEntryObservation[] = [];
  const built: MomenceSession[] = [];
  let fetched = 0;

  for (const location of cfg.locations) {
    const loc = resolveLocation(cfg, location);
    const today = localDateKey(now, loc.timezone);

    const slots: NaviaSlot[] = [];
    for (let i = 0; i < days; i++) {
      slots.push(...(await fetchDay(loc, addLocalDays(today, i))));
      fetched += 1;
      onProgress?.(fetched);
    }
    observations.push(...slotsToObservations(slots, now));
  }

  const ledger = mergeLedger(cachedLedger, observations, now, cfg.ledgerRetentionDays, cfg.hotDays);
  onLedger?.(ledger);

  // Build from the ledger (which supplies entries that have since expired) plus
  // everything seen this poll, so a deep pass still emits its full horizon.
  const byKey = new Map<string, NaviaEntryObservation>();
  for (const o of Object.values(ledger.entries)) byKey.set(entryKey(o), o);
  for (const o of observations) byKey.set(entryKey(o), o);
  const entries = [...byKey.values()];

  for (const location of cfg.locations) {
    const loc = resolveLocation(cfg, location);
    built.push(...groupIntoBlocks(entries, loc).map(b => blockToSession(b, loc)));
  }

  const windowStartMs = now.getTime() - cfg.ledgerRetentionDays * DAY_MS;
  const windowEndMs = now.getTime() + days * DAY_MS;
  return mergeWithCached(built, existingSessions, windowStartMs, windowEndMs, now.getTime());
}
