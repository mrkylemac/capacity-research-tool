import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildWindowSittings,
  combineLedgers,
  entryLimitAt,
  foldReading,
  mergeFeedObservations,
  mergeWindowsDay,
  serialiseLedger,
  splitLedgerByMonth,
  windowKey,
  type NaviaWindow,
  type NaviaWindowReading,
  type NaviaWindowRecord,
  type PersistedNaviaWindows,
} from '@/lib/naviaWindows';
import { resolveLocation, type NaviaEntryObservation } from '@/lib/naviaClient';
import { NAVIA_CONFIG } from '@/config/api';
import type { MomenceSession } from '@/types/momence';

const BYRON = resolveLocation(NAVIA_CONFIG, NAVIA_CONFIG.locations.find(l => l.name === 'Byron Bay')!);
const PRAHRAN = resolveLocation(NAVIA_CONFIG, NAVIA_CONFIG.locations.find(l => l.name === 'Prahran')!);

// Prahran, Monday 7 September 2026, 7pm Melbourne: well after the limit change.
const H = '2026-09-07T09:00:00.000Z';
const at = (base: string, minutes: number) => new Date(Date.parse(base) + minutes * 60_000).toISOString();

function reading(over: Partial<NaviaWindowReading> = {}): NaviaWindowReading {
  return {
    entries: 0,
    occupancy: 0,
    roomCapacity: 32,
    entryLimit: 8,
    isBookable: true,
    observedAt: at(H, 120),
    source: 'windows',
    ...over,
  };
}

function record(startAt: string, over: Partial<NaviaWindowRecord> = {}, locationId = 2): NaviaWindowRecord {
  return { locationId, startAt, endAt: at(startAt, 60), latest: reading(), ...over };
}

function ledgerOf(records: NaviaWindowRecord[]): PersistedNaviaWindows {
  return {
    refreshedAt: at(H, 120),
    windows: Object.fromEntries(records.map(r => [windowKey(r.locationId, r.startAt), r])),
  };
}

/** A full Prahran hour: four windows, each with a reading before start. */
function hour(start: string, entries: number[], pre: Partial<NaviaWindowReading> = {}): NaviaWindowRecord[] {
  return entries.map((n, i) => {
    const s = at(start, 15 * i);
    return record(s, {
      latest: reading({ entries: n, observedAt: at(start, 180) }),
      preStart: reading({ entries: n, observedAt: at(s, -10), ...pre }),
    });
  });
}

const NOW = new Date(at(H, 24 * 60));

function feedSitting(start: string, sold: number, location = 'Prahran', locationId = 2): MomenceSession {
  return {
    id: `navia-${locationId}-${start}`,
    sessionName: 'Bathing',
    startsAt: start,
    endsAt: at(start, 60),
    durationMinutes: 60,
    capacity: 32,
    ticketsSold: sold,
    fixedTicketPrice: 0,
    location,
    inPerson: true,
  };
}

describe('foldReading', () => {
  const base = { locationId: 2, startAt: H, endAt: at(H, 60) };

  it('treats a first reading before start as what was on sale', () => {
    const r = foldReading(undefined, base, reading({ observedAt: at(H, -5) }));
    expect(r.preStart?.observedAt).toBe(at(H, -5));
    expect(r.latest.observedAt).toBe(at(H, -5));
  });

  it('gives a first reading after start no pre-start reading', () => {
    expect(foldReading(undefined, base, reading()).preStart).toBeUndefined();
  });

  it('does not keep bookings moving before start as revisions', () => {
    let r = foldReading(undefined, base, reading({ entries: 1, observedAt: at(H, -60) }));
    r = foldReading(r, base, reading({ entries: 3, observedAt: at(H, -30) }));
    expect(r.revisions).toBeUndefined();
    expect(r.preStart?.entries).toBe(3);
  });

  it('keeps a settled figure that Navia later changes', () => {
    let r = foldReading(undefined, base, reading({ entries: 5, observedAt: at(H, 90) }));
    r = foldReading(r, base, reading({ entries: 4, observedAt: at(H, 600) }));
    expect(r.latest.entries).toBe(4);
    expect(r.revisions?.map(x => x.entries)).toEqual([5]);
  });

  it('does not record an unchanged re-read as a revision', () => {
    let r = foldReading(undefined, base, reading({ entries: 5, observedAt: at(H, 90) }));
    r = foldReading(r, base, reading({ entries: 5, observedAt: at(H, 600) }));
    expect(r.revisions).toBeUndefined();
    expect(r.latest.observedAt).toBe(at(H, 600));
  });

  it('ignores an older reading for latest', () => {
    let r = foldReading(undefined, base, reading({ entries: 5, observedAt: at(H, 600) }));
    r = foldReading(r, base, reading({ entries: 9, observedAt: at(H, 90) }));
    expect(r.latest.entries).toBe(5);
  });

  it('lets a slot-feed reading fill in before start but never replace latest', () => {
    let r = foldReading(undefined, base, reading({ entries: 5, observedAt: at(H, 600) }));
    r = foldReading(r, base, reading({ source: 'slot-feed', entries: 6, occupancy: null, roomCapacity: null, observedAt: at(H, -5) }));
    expect(r.latest.entries).toBe(5);
    expect(r.preStart?.source).toBe('slot-feed');
  });
});

describe('mergeWindowsDay', () => {
  const loc = { locationId: 2, timezone: 'Australia/Melbourne' };
  const w = (startAt: string, entries = 1): NaviaWindow => ({
    startAt, endAt: at(startAt, 60), isBookable: true, currentOccupancy: entries,
    maxCapacity: 32, currentEntries: entries, entryLimitPerInterval: 8,
  });

  it('marks a future window Navia stopped listing as withdrawn, without deleting it', () => {
    const future = '2026-09-10T09:00:00.000Z'; // Thursday 7pm Melbourne
    const now = new Date('2026-09-09T00:00:00.000Z');
    let l = mergeWindowsDay({ refreshedAt: '', windows: {} }, loc, '2026-09-10', [w(future)], now);
    l = mergeWindowsDay(l, loc, '2026-09-10', [], new Date('2026-09-09T01:00:00.000Z'));
    expect(l.windows[windowKey(2, future)].withdrawnAt).toBe('2026-09-09T01:00:00.000Z');
    // And back again if Navia relists it.
    l = mergeWindowsDay(l, loc, '2026-09-10', [w(future)], new Date('2026-09-09T02:00:00.000Z'));
    expect(l.windows[windowKey(2, future)].withdrawnAt).toBeUndefined();
  });

  it('never touches a past window when a day comes back empty', () => {
    const past = '2026-09-07T09:00:00.000Z';
    let l = mergeWindowsDay({ refreshedAt: '', windows: {} }, loc, '2026-09-07', [w(past, 6)], new Date('2026-09-08T00:00:00.000Z'));
    l = mergeWindowsDay(l, loc, '2026-09-07', [], new Date('2026-09-09T00:00:00.000Z'));
    expect(l.windows[windowKey(2, past)].withdrawnAt).toBeUndefined();
    expect(l.windows[windowKey(2, past)].latest.entries).toBe(6);
  });

  it('leaves the other location and other days alone', () => {
    const other = record('2026-09-10T09:00:00.000Z', {}, 1);
    const nextDay = record('2026-09-11T09:00:00.000Z');
    const l = mergeWindowsDay(ledgerOf([other, nextDay]), loc, '2026-09-10', [], new Date('2026-09-09T00:00:00.000Z'));
    expect(l.windows[windowKey(1, other.startAt)].withdrawnAt).toBeUndefined();
    expect(l.windows[windowKey(2, nextDay.startAt)].withdrawnAt).toBeUndefined();
  });
});

describe('mergeFeedObservations', () => {
  const obs = (over: Partial<NaviaEntryObservation>): NaviaEntryObservation => ({
    locationId: 2, startTime: H, endTime: at(H, 60), maxCapacity: 10, availableCapacity: 7,
    isBookable: false, occupancyLevel: 'filling', serviceOptionId: 9, observedAt: at(H, -20), ...over,
  });

  it('records what the feed showed before start', () => {
    const l = mergeFeedObservations(ledgerOf([record(H)]), [obs({})]);
    expect(l.windows[windowKey(2, H)].preStart).toMatchObject({
      source: 'slot-feed', entries: 3, entryLimit: 10, isBookable: false, occupancy: null,
    });
  });

  it('skips readings at or after start and windows the endpoint never returned', () => {
    const l0 = ledgerOf([record(H)]);
    expect(mergeFeedObservations(l0, [obs({ observedAt: H })])).toBe(l0);
    expect(mergeFeedObservations(l0, [obs({ startTime: at(H, 15) })])).toBe(l0);
  });
});

describe('monthly files', () => {
  it('splits by UTC month and recombines to the same ledger', () => {
    const l = ledgerOf([record('2026-08-31T23:45:00.000Z'), record('2026-09-01T00:00:00.000Z'), record(H)]);
    const parts = splitLedgerByMonth(l);
    expect([...parts.keys()]).toEqual(['2026-08', '2026-09']);
    expect(Object.keys(parts.get('2026-09')!.windows)).toHaveLength(2);
    expect(combineLedgers([...parts.values()]).windows).toEqual(l.windows);
  });

  it('serialises one window per line and parses back', () => {
    const l = ledgerOf([record(H), record(at(H, 15))]);
    const text = serialiseLedger(l);
    expect(text.split('\n').filter(line => line.includes('"latest"'))).toHaveLength(2);
    expect(JSON.parse(text)).toEqual(l);
  });
});

describe('entryLimitAt', () => {
  it('follows Prahran through its change at 3pm on 22 August', () => {
    expect(entryLimitAt(PRAHRAN, '2026-08-22T04:45:00.000Z')).toBe(10);
    expect(entryLimitAt(PRAHRAN, '2026-08-22T05:00:00.000Z')).toBe(8);
    expect(entryLimitAt(PRAHRAN, '2026-08-01T00:00:00.000Z')).toBeNull();
  });
});

describe('buildWindowSittings', () => {
  const build = (records: NaviaWindowRecord[], feed: MomenceSession[] = [], previous: MomenceSession[] = [], loc = PRAHRAN) =>
    buildWindowSittings(ledgerOf(records), loc, feed, previous, NOW);

  it('makes one sitting per clock hour from Navia’s own counts', () => {
    const [s] = build(hour(H, [8, 6, 3, 0]));
    expect(s).toMatchObject({
      id: `navia-2-${H}`, startsAt: H, endsAt: at(H, 60), ticketsSold: 17, capacity: 32,
      soldSource: 'reported', capacitySource: 'derived-grid', confidence: 'medium', location: 'Prahran',
    });
    expect(s.capacityNotes).toBeUndefined();
  });

  it('counts only the seats already taken in an entry that was closed before start', () => {
    const records = hour(H, [2, 2, 2, 2]);
    records[1].preStart!.isBookable = false;
    expect(build(records)[0].capacity).toBe(8 + 2 + 8 + 8);
  });

  it('never offers fewer seats than people who came', () => {
    const records = hour(H, [12, 0, 0, 0]);
    expect(build(records)[0].capacity).toBe(12 + 8 + 8 + 8);
  });

  it('uses the limit in force before start, not today’s', () => {
    const before = '2026-08-20T09:00:00.000Z';
    const [s] = build(hour(before, [1, 1, 1, 1], { entryLimit: 10 }));
    expect(s.capacity).toBe(40);
  });

  it('labels capacity before the limit change as not confirmed', () => {
    const [s] = build(hour('2026-08-22T04:00:00.000Z', [1, 1, 1, 1], { entryLimit: 10 }));
    expect(s.confidence).toBe('low');
    expect(s.capacityNotes).toEqual([PRAHRAN.capacityUnconfirmedNote]);
    const [after] = build(hour('2026-08-22T05:00:00.000Z', [1, 1, 1, 1]));
    expect(after.capacityNotes).toBeUndefined();
  });

  it('infers an entry with no reading before start as open unless it filled, and says so', () => {
    const records = hour(H, [8, 3, 0, 0]);
    delete records[0].preStart;
    delete records[1].preStart;
    const [s] = build(records);
    expect(s.capacity).toBe(8 + 8 + 8 + 8);
    expect(s.confidence).toBe('low');
    expect(s.capacityNotes).toHaveLength(1);
    expect(s.capacityNotes![0]).toMatch(/inferred/);
  });

  it('marks an hour with nothing on sale and nobody booked as cancelled', () => {
    const [s] = build(hour(H, [0, 0, 0, 0], { isBookable: false }));
    expect(s.isCancelled).toBe(true);
    expect(s.capacity).toBe(0);
  });

  it('skips withdrawn windows', () => {
    const records = hour(H, [1, 1, 1, 1]).map(r => ({ ...r, withdrawnAt: at(H, -60) }));
    expect(build(records)).toHaveLength(0);
  });

  describe('when Navia’s count is below ours', () => {
    it('uses Navia’s and keeps ours as a cancellation after our reading', () => {
      const records = hour(H, [4, 2, 0, 0]);
      records[0].preStart!.entries = 5;
      const [s] = build(records, [feedSitting(H, 7)]);
      expect(s.ticketsSold).toBe(6);
      expect(s.supersededSold).toMatchObject({ ticketsSold: 7, source: 'slot-feed', reason: 'cancelled-after-reading', decidedOn: '2026-09-13' });
      expect(s.supersededSold!.note).toMatch(/We recorded 7/);
    });

    it('calls it an overcount when the room was nearly full', () => {
      const records = hour(H, [4, 2, 0, 0]);
      records[0].preStart!.entries = 5;
      records[0].latest.occupancy = 31;
      expect(build(records, [feedSitting(H, 7)])[0].supersededSold!.reason).toBe('room-full-read-as-sold');
    });

    it('says so when no reading before start supports our figure', () => {
      const records = hour(H, [1, 1, 1, 1]);
      for (const r of records) delete r.preStart;
      expect(build(records, [feedSitting(H, 7)])[0].supersededSold!.reason).toBe('no-supporting-reading');
    });

    it('adds nothing when Navia’s count is the same or higher', () => {
      expect(build(hour(H, [2, 2, 2, 2]), [feedSitting(H, 8)])[0].supersededSold).toBeUndefined();
    });

    it('carries a superseded count forward if the feed cache no longer has the sitting', () => {
      const [first] = build(hour(H, [1, 1, 1, 1]), [feedSitting(H, 9)]);
      const [again] = build(hour(H, [1, 1, 1, 1]), [], [first]);
      expect(again.supersededSold).toEqual(first.supersededSold);
    });
  });

  it('never drops a past sitting the previous build had', () => {
    const orphan = { ...feedSitting(at(H, -24 * 60), 5), id: 'navia-2-kept' };
    const out = build(hour(H, [1, 1, 1, 1]), [], [orphan]);
    expect(out.map(s => s.id)).toContain('navia-2-kept');
  });

  it('anchors Byron on the slot feed’s sittings, ignoring the quarter hours between them', () => {
    const byronStart = '2026-09-07T23:00:00.000Z'; // 9am Sydney
    const inSitting = hour(byronStart, [3, 2, 1, 0]).map(r => ({ ...r, locationId: 1 }));
    const between = hour(at(byronStart, 60), [0, 0, 0, 0]).map(r => ({ ...r, locationId: 1 }));
    const out = build([...inSitting, ...between], [feedSitting(byronStart, 6, 'Byron Bay', 1)], [], BYRON);
    expect(out.map(s => s.startsAt)).toEqual([byronStart]);
    expect(out[0]).toMatchObject({ ticketsSold: 6, location: 'Byron Bay', durationMinutes: 120 });
  });
});

describe('merge driver: windows ledger', () => {
  const driver = path.join(process.cwd(), 'scripts', 'merge-venue-cache.mjs');

  function runDriver(ours: PersistedNaviaWindows, theirs: PersistedNaviaWindows): PersistedNaviaWindows {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'windows-merge-'));
    const a = path.join(dir, 'ours.json');
    const b = path.join(dir, 'theirs.json');
    fs.writeFileSync(a, serialiseLedger(ours));
    fs.writeFileSync(b, serialiseLedger(theirs));
    execFileSync('node', [driver, 'base', a, b, 'navia-windows-ledger-2026-09.json'], { stdio: 'ignore' });
    return JSON.parse(fs.readFileSync(a, 'utf-8'));
  }

  it('keeps windows from both sides', () => {
    const out = runDriver(ledgerOf([record(H)]), ledgerOf([record(at(H, 15))]));
    expect(Object.keys(out.windows)).toHaveLength(2);
  });

  it('takes the newer reading, keeps the replaced settled figure and the newest pre-start reading', () => {
    const stale = record(H, { latest: reading({ entries: 5, observedAt: at(H, 90) }), preStart: reading({ observedAt: at(H, -5) }) });
    const fresh = record(H, { latest: reading({ entries: 4, observedAt: at(H, 600) }), preStart: reading({ observedAt: at(H, -30) }) });
    for (const [ours, theirs] of [[stale, fresh], [fresh, stale]]) {
      const out = runDriver(ledgerOf([ours]), ledgerOf([theirs])).windows[windowKey(2, H)];
      expect(out.latest.entries).toBe(4);
      expect(out.revisions?.map(r => r.entries)).toEqual([5]);
      expect(out.preStart?.observedAt).toBe(at(H, -5));
    }
  });

  it('writes the same one-window-per-line layout as the poller', () => {
    const l = ledgerOf([record(H), record(at(H, 15))]);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'windows-merge-'));
    const a = path.join(dir, 'ours.json');
    fs.writeFileSync(a, serialiseLedger(l));
    fs.writeFileSync(path.join(dir, 'theirs.json'), serialiseLedger(l));
    execFileSync('node', [driver, 'base', a, path.join(dir, 'theirs.json'), 'x'], { stdio: 'ignore' });
    expect(fs.readFileSync(a, 'utf-8')).toBe(serialiseLedger(l));
  });
});
