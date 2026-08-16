import {
  slotsToObservations,
  mergeLedger,
  groupIntoBlocks,
  blockToSession,
  mergeWithCached,
  type NaviaSlot,
  type NaviaEntryObservation,
} from '@/lib/naviaClient';
import { NAVIA_CONFIG } from '@/config/api';
import type { MomenceSession } from '@/types/momence';

import byronDay from './fixtures/navia-byron-day.json';
import byronTuesday from './fixtures/navia-byron-tuesday.json';
import prahranDay from './fixtures/navia-prahran-day.json';

const BYRON = NAVIA_CONFIG.naviabyron;
const PRAHRAN = NAVIA_CONFIG.naviaprahran;

/** Any instant before the fixture day, so every slot counts as future. */
const BEFORE = new Date('2026-08-17T00:00:00.000Z');

function observe(slots: unknown, now = BEFORE): NaviaEntryObservation[] {
  return slotsToObservations(slots as NaviaSlot[], now);
}

describe('slotsToObservations', () => {
  it('keeps only slots that are still in the future', () => {
    const all = observe(byronDay);
    expect(all).toHaveLength(24);

    // Byron's fixture day runs 2026-08-18T21:00Z to 2026-08-19T07:45Z. Standing
    // midway through it should drop everything already started.
    const midway = observe(byronDay, new Date('2026-08-19T02:00:00.000Z'));
    expect(midway.length).toBeGreaterThan(0);
    expect(midway.length).toBeLessThan(24);
    for (const o of midway) {
      expect(new Date(o.startTime).getTime()).toBeGreaterThan(Date.parse('2026-08-19T02:00:00.000Z'));
    }
  });

  it('stamps observedAt so a reading can be aged', () => {
    expect(observe(byronDay)[0].observedAt).toBe(BEFORE.toISOString());
  });
});

describe('groupIntoBlocks — Byron', () => {
  it('splits a full day into six sittings of four entries', () => {
    const blocks = groupIntoBlocks(observe(byronDay), BYRON);
    expect(blocks).toHaveLength(6);
    expect(blocks.map(b => b.length)).toEqual([4, 4, 4, 4, 4, 4]);
  });

  it('handles the Tuesday variant, which drops the first sitting', () => {
    const blocks = groupIntoBlocks(observe(byronTuesday), BYRON);
    expect(blocks).toHaveLength(5);
    expect(blocks.map(b => b.length)).toEqual([4, 4, 4, 4, 4]);
  });

  it('ignores entries belonging to the other location', () => {
    const mixed = [...observe(byronDay), ...observe(prahranDay)];
    const blocks = groupIntoBlocks(mixed, BYRON);
    expect(blocks.flat().every(e => e.locationId === 1)).toBe(true);
    expect(blocks).toHaveLength(6);
  });
});

describe('blockToSession — Byron', () => {
  const blocks = groupIntoBlocks(observe(byronDay), BYRON);

  it('emits a 16-seat, 2-hour sitting anchored on the first entry', () => {
    const s = blockToSession(blocks[0], BYRON);
    expect(s.capacity).toBe(16);
    expect(s.durationMinutes).toBe(120);
    expect(s.startsAt).toBe(blocks[0][0].startTime);
    expect(s.capacitySource).toBe('derived-grid');
    expect(s.measure).toBe('seats');
    expect(s.confidence).toBe('medium');
    expect(s.utilisationKnown).toBeUndefined();
  });

  it('ends the sitting at anchor + duration, not at the last entry’s end', () => {
    // The final entry runs 45 minutes past the sitting. Using its end would
    // overlap consecutive blocks and fake a 32-seat concurrency curve.
    const s = blockToSession(blocks[0], BYRON);
    const span = new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime();
    expect(span).toBe(120 * 60 * 1000);

    const lastEntryEnd = new Date(blocks[0][3].endTime).getTime();
    expect(new Date(s.endsAt).getTime()).toBeLessThan(lastEntryEnd);
  });

  it('sums bookings across the four entries', () => {
    const block = blocks[0];
    const expected = block.reduce((n, e) => n + (e.maxCapacity - e.availableCapacity), 0);
    expect(blockToSession(block, BYRON).ticketsSold).toBe(expected);
  });

  it('never reuses the product-scoped slot id', () => {
    // slot.id is `{serviceOptionId}-{startTime}-{locationId}`, so the same
    // counter yields a different id per product.
    const s = blockToSession(blocks[0], BYRON);
    expect(s.id).toBe(`navia-1-${blocks[0][0].startTime}`);
    expect(s.id.startsWith('1-')).toBe(false);
  });

  it('prices every seat at the single active Byron product', () => {
    expect(blockToSession(blocks[0], BYRON).fixedTicketPrice).toBe(80);
  });
});

describe('blockToSession — invalidation', () => {
  const blocks = groupIntoBlocks(observe(byronDay), BYRON);

  const expectInvalid = (s: MomenceSession) => {
    // Both flags matter: sanitizeSessions checks capacity <= 0 and
    // utilisationKnown === false independently.
    expect(s.capacity).toBe(0);
    expect(s.ticketsSold).toBe(0);
    expect(s.utilisationKnown).toBe(false);
    expect(s.capacitySource).toBe('unknown');
    expect(s.confidence).toBe('low');
  };

  it('invalidates a partially observed sitting rather than fabricating it', () => {
    expectInvalid(blockToSession(blocks[0].slice(0, 3), BYRON));
  });

  it('invalidates an entry that advertises free seats but is not bookable', () => {
    const block = blocks[0].map((e, i) =>
      i === 2 ? { ...e, isBookable: false, availableCapacity: 4, occupancyLevel: 'available' } : e,
    );
    expectInvalid(blockToSession(block, BYRON));
  });

  it('invalidates a hidden hold — a full counter the venue calls "filling"', () => {
    const block = blocks[0].map((e, i) =>
      i === 1 ? { ...e, availableCapacity: e.maxCapacity, occupancyLevel: 'filling' } : e,
    );
    expectInvalid(blockToSession(block, BYRON));
  });

  it('invalidates a sitting whose entries disagree on capacity', () => {
    const block = blocks[0].map((e, i) => (i === 0 ? { ...e, maxCapacity: 5 } : e));
    expectInvalid(blockToSession(block, BYRON));
  });

  it('leaves the other sittings of the day untouched', () => {
    const sessions = blocks.map((b, i) => blockToSession(i === 0 ? b.slice(0, 3) : b, BYRON));
    expect(sessions[0].utilisationKnown).toBe(false);
    expect(sessions.slice(1).every(s => s.capacity === 16)).toBe(true);
  });
});

describe('Prahran — bookings without a denominator', () => {
  it('emits one session per entry, all schedule-only', () => {
    const blocks = groupIntoBlocks(observe(prahranDay), PRAHRAN);
    expect(blocks.every(b => b.length === 1)).toBe(true);

    const sessions = blocks.map(b => blockToSession(b, PRAHRAN));
    expect(sessions.length).toBeGreaterThan(50);
    for (const s of sessions) {
      expect(s.capacity).toBe(0);
      expect(s.utilisationKnown).toBe(false);
      expect(s.measure).toBe('slot-occupancy');
      // Its bookings are real, they just have nothing to divide by.
      expect(s.soldSource).toBe('reported-remaining');
      // The $50 and $80 products share one counter, so no seat has a price.
      expect(s.fixedTicketPrice).toBe(0);
    }
  });

  it('keeps the real booking count — only the denominator is missing', () => {
    // Prahran's bookings are directly observed. Zeroing them (which is right
    // for a Byron block that failed validation) would throw away the one number
    // this location does have.
    const sessions = groupIntoBlocks(observe(prahranDay), PRAHRAN).map(b => blockToSession(b, PRAHRAN));
    const booked = sessions.reduce((n, s) => n + s.ticketsSold, 0);
    const expected = observe(prahranDay).reduce((n, e) => n + (e.maxCapacity - e.availableCapacity), 0);

    expect(expected).toBeGreaterThan(0);
    expect(booked).toBe(expected);
  });

  it('never derives a denominator from the continuous grid', () => {
    // Summing maxCapacity across 61 overlapping starts would claim 610 seats a
    // day in a room measured at 15 concurrent.
    const sessions = groupIntoBlocks(observe(prahranDay), PRAHRAN).map(b => blockToSession(b, PRAHRAN));
    expect(sessions.reduce((n, s) => n + s.capacity, 0)).toBe(0);
  });
});

describe('mergeLedger', () => {
  const now = new Date('2026-08-19T00:00:00.000Z');

  it('keeps entries seen in earlier polls that have since expired', () => {
    const early = observe(byronDay, BEFORE);
    // A later poll sees only the tail of the day.
    const late = observe(byronDay, new Date('2026-08-19T04:00:00.000Z'));
    expect(late.length).toBeLessThan(early.length);

    const ledger = mergeLedger({ refreshedAt: BEFORE.toISOString(), entries: Object.fromEntries(early.map(o => [`${o.locationId}|${o.startTime}`, o])) }, late, now, 3, 3);
    expect(Object.keys(ledger.entries)).toHaveLength(24);
  });

  it('lets a fresh reading overwrite a stale one', () => {
    const first = observe(byronDay, BEFORE);
    const key = `${first[0].locationId}|${first[0].startTime}`;
    const updated = [{ ...first[0], availableCapacity: 0, observedAt: now.toISOString() }];

    const ledger = mergeLedger(
      { refreshedAt: BEFORE.toISOString(), entries: { [key]: first[0] } },
      updated,
      now,
      3,
      3,
    );
    expect(ledger.entries[key].availableCapacity).toBe(0);
  });

  it('prunes entries older than the retention window', () => {
    const old: NaviaEntryObservation = {
      ...observe(byronDay)[0],
      startTime: '2026-07-01T00:00:00.000Z',
    };
    const ledger = mergeLedger(
      { refreshedAt: BEFORE.toISOString(), entries: { '1|2026-07-01T00:00:00.000Z': old } },
      [],
      now,
      3,
      3,
    );
    expect(ledger.entries['1|2026-07-01T00:00:00.000Z']).toBeUndefined();
  });
});

describe('mergeWithCached', () => {
  const session = (id: string, startsAt: string): MomenceSession => ({
    id, sessionName: 'Bathing', startsAt, endsAt: startsAt,
    durationMinutes: 120, capacity: 16, ticketsSold: 4, fixedTicketPrice: 80,
    location: 'Byron Bay', inPerson: true,
  });

  const windowStart = Date.parse('2026-08-16T00:00:00.000Z');
  const windowEnd = Date.parse('2026-08-25T00:00:00.000Z');
  // "now" sits inside the window so the past/future split is exercised.
  const nowMs = Date.parse('2026-08-19T00:00:00.000Z');

  it('preserves history from before the rebuild window', () => {
    const cached = [session('old', '2026-08-01T00:00:00.000Z')];
    expect(mergeWithCached([], cached, windowStart, windowEnd, nowMs).map(s => s.id)).toEqual(['old']);
  });

  it('drops in-window FUTURE sessions the fresh build no longer produces', () => {
    // A cache-wins rule would keep serving a cancelled day as ghost sessions
    // forever. Past sittings are exempt — see the test above.
    const cached = [
      session('old', '2026-08-01T00:00:00.000Z'),
      session('ghost', '2026-08-21T00:00:00.000Z'),
    ];
    expect(mergeWithCached([], cached, windowStart, windowEnd, nowMs).map(s => s.id)).toEqual(['old']);
  });

  it('lets a fresh reading win over a cached one for the same sitting', () => {
    const cached = [{ ...session('s1', '2026-08-18T00:00:00.000Z'), ticketsSold: 1 }];
    const fresh = [{ ...session('s1', '2026-08-18T00:00:00.000Z'), ticketsSold: 9 }];
    expect(mergeWithCached(fresh, cached, windowStart, windowEnd, nowMs)[0].ticketsSold).toBe(9);
  });

  it('never drops a sitting that has already run', () => {
    // Its entries are gone from the feed and age out of the ledger, so the
    // fresh build stops producing it. Dropping it would delete history that
    // cannot be re-fetched — the bug the poller's write guard caught.
    const ran = session('ran', '2026-08-18T00:00:00.000Z'); // inside the window, before nowMs
    expect(mergeWithCached([], [ran], windowStart, windowEnd, nowMs).map(s => s.id)).toEqual(['ran']);
  });

  it('still rebuilds the future so a closure self-corrects', () => {
    // Byron shuts 2026-08-31 to 09-06. A future sitting the fresh build no
    // longer produces must disappear rather than linger as a ghost.
    const ghost = session('ghost', '2026-08-21T00:00:00.000Z'); // inside window, after nowMs
    expect(mergeWithCached([], [ghost], windowStart, windowEnd, nowMs)).toEqual([]);
  });

  it('keeps the forward schedule a short poll did not reach', () => {
    // A 3-day routine poll must not delete the 35-day horizon the nightly deep
    // pass built, or the two would undo each other every fifteen minutes.
    const cached = [session('far', '2026-09-10T00:00:00.000Z')];
    expect(mergeWithCached([], cached, windowStart, windowEnd, nowMs).map(s => s.id)).toEqual(['far']);
  });

  it('returns sessions in chronological order', () => {
    const fresh = [
      session('b', '2026-08-20T00:00:00.000Z'),
      session('a', '2026-08-19T00:00:00.000Z'),
    ];
    expect(mergeWithCached(fresh, [], windowStart, windowEnd, nowMs).map(s => s.id)).toEqual(['a', 'b']);
  });
});

describe('timezone handling', () => {
  it('keeps evening sittings that fall on the previous UTC date', () => {
    // Eight of Byron's 24 daily slots carry the previous UTC date, so bucketing
    // on startsAt.slice(0, 10) would split every trading day in two.
    const dates = new Set((byronDay as NaviaSlot[]).map(s => s.startTime.slice(0, 10)));
    expect(dates.size).toBe(2);
  });

  it('parses the feed as genuine UTC rather than local dressed as UTC', () => {
    const sessions = groupIntoBlocks(observe(byronDay), BYRON).map(b => blockToSession(b, BYRON));
    const first = new Date(sessions[0].startsAt);
    const local = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(first);
    // Byron's first sitting of the day is 07:00 local.
    expect(local).toBe('07:00');
  });
});
