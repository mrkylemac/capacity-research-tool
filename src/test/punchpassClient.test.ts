import fs from 'node:fs';
import path from 'node:path';
import {
  parseSchedulePage,
  parseDuration,
  localToUtc,
  priceFor,
  buildCapacityOracle,
  mergeWithCached,
  type PunchpassRow,
} from '@/lib/punchpassClient';
import { PUNCHPASS_CONFIG } from '@/config/api';
import type { MomenceSession } from '@/types/momence';

const FIXTURES = path.join(process.cwd(), 'src', 'test', 'fixtures');
const current = fs.readFileSync(path.join(FIXTURES, 'punchpass-current.html'), 'utf-8');
const farFuture = fs.readFileSync(path.join(FIXTURES, 'punchpass-farfuture.html'), 'utf-8');
const cfg = PUNCHPASS_CONFIG.bmsauna;

describe('parseSchedulePage', () => {
  const rows = parseSchedulePage(current);

  it('parses every instance in the fixture', () => {
    expect(rows).toHaveLength(72);
  });

  it('resolves the required fields on every row', () => {
    for (const r of rows) {
      expect(r.courseId).toMatch(/^\d+$/);
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.time).toMatch(/^\d{1,2}:\d{2}$/);
      expect(r.name.length).toBeGreaterThan(0);
    }
  });

  it('inherits the calendar date from the day anchor', () => {
    expect(new Set(rows.map(r => r.date))).toEqual(
      new Set(['2026-08-06', '2026-08-07', '2026-08-08']),
    );
  });

  it('reads "N SPOTS LEFT" as remaining', () => {
    const withSpots = rows.filter(r => r.spotsLeft !== null && r.spotsLeft > 0);
    expect(withSpots.length).toBeGreaterThan(30);
    for (const r of withSpots) expect(r.spotsLeft).toBeLessThanOrEqual(20);
  });

  it('reads CLASS FULL as zero remaining, not as missing', () => {
    expect(rows.filter(r => r.spotsLeft === 0)).toHaveLength(3);
  });

  it('flags cancelled sessions', () => {
    const cancelled = rows.filter(r => r.cancelled);
    expect(cancelled).toHaveLength(7);
    // Cancelled rows render no booking link, so they have no instance id and
    // must fall back to a synthetic key.
    for (const c of cancelled) expect(c.instanceId).toBeNull();
  });

  it('leaves spotsLeft null for sessions that have already started', () => {
    // The badge is dropped at session start, so today's earlier rows carry none.
    const elapsed = rows.filter(r => r.date === '2026-08-06' && r.spotsLeft === null && !r.cancelled);
    expect(elapsed.length).toBeGreaterThan(0);
  });

  it('never reads the TODAY/TOMORROW day-header labels as availability', () => {
    // Those are orange labels in the date header. If the badge selector leaked,
    // rows would pick up an unparseable badge and spotsLeft would be wrong.
    expect(current).toContain('orange label');
    const bad = rows.filter(r => r.spotsLeft !== null && (r.spotsLeft < 0 || r.spotsLeft > 100));
    expect(bad).toHaveLength(0);
  });

  it('extracts the per-occurrence instance id for bookable rows', () => {
    const bookable = rows.filter(r => !r.cancelled);
    for (const r of bookable) expect(r.instanceId).toMatch(/^\d+$/);
  });
});

describe('parseDuration', () => {
  it.each([
    ['2 hours', 120],
    ['1 hour', 60],
    ['90 minutes', 90],
    ['1 hour 30 minutes', 90],
    ['45 mins', 45],
  ])('parses %s', (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it('returns null when there is nothing to parse', () => {
    expect(parseDuration(null)).toBeNull();
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('all day')).toBeNull();
  });
});

describe('localToUtc', () => {
  // Sydney is UTC+10 in winter (AEST) and UTC+11 in summer (AEDT). Punchpass
  // renders a bare wall clock, so a fixed offset would be an hour out for
  // roughly half the year.
  it('applies AEST for a winter date', () => {
    expect(localToUtc('2026-08-06', '16:30', 'Australia/Sydney').toISOString())
      .toBe('2026-08-06T06:30:00.000Z');
  });

  it('applies AEDT for a summer date', () => {
    expect(localToUtc('2026-12-17', '16:30', 'Australia/Sydney').toISOString())
      .toBe('2026-12-17T05:30:00.000Z');
  });

  it('does not shift a session across a day boundary', () => {
    const d = localToUtc('2026-08-06', '7:00', 'Australia/Sydney');
    expect(d.toISOString()).toBe('2026-08-05T21:00:00.000Z');
  });
});

describe('priceFor', () => {
  it('charges peak on weekends from 10am', () => {
    expect(priceFor({ weekday: 6, hour: 10 }, cfg)).toBe(55);
    expect(priceFor({ weekday: 0, hour: 14 }, cfg)).toBe(55);
  });

  it('charges off-peak on weekends before 10am', () => {
    expect(priceFor({ weekday: 6, hour: 7 }, cfg)).toBe(45);
  });

  it('charges off-peak all day on weekdays', () => {
    expect(priceFor({ weekday: 1, hour: 7 }, cfg)).toBe(45);
    expect(priceFor({ weekday: 5, hour: 19 }, cfg)).toBe(45);
  });
});

describe('buildCapacityOracle', () => {
  const oracle = buildCapacityOracle(parseSchedulePage(farFuture));

  it('learns a capacity for the recurring courses', () => {
    expect(oracle.size).toBeGreaterThan(5);
    for (const cap of oracle.values()) expect(cap).toBeGreaterThan(0);
  });

  it('takes the maximum ever observed, never the first', () => {
    // An understated capacity overstates utilisation permanently and never
    // self-corrects, so max is the only safe reducer.
    const rows: PunchpassRow[] = [
      { date: '2026-11-19', time: '7:00', courseId: '1', instanceId: '10', name: 'A', sessionType: '', durationMinutes: 120, spotsLeft: 4, cancelled: false },
      { date: '2026-11-20', time: '7:00', courseId: '1', instanceId: '11', name: 'A', sessionType: '', durationMinutes: 120, spotsLeft: 9, cancelled: false },
      { date: '2026-11-21', time: '7:00', courseId: '1', instanceId: '12', name: 'A', sessionType: '', durationMinutes: 120, spotsLeft: 6, cancelled: false },
    ];
    expect(buildCapacityOracle(rows).get('1')).toBe(9);
  });

  it('ignores cancelled rows and rows with no badge', () => {
    const rows: PunchpassRow[] = [
      { date: '2026-11-19', time: '7:00', courseId: '2', instanceId: '20', name: 'A', sessionType: '', durationMinutes: 120, spotsLeft: 99, cancelled: true },
      { date: '2026-11-20', time: '7:00', courseId: '2', instanceId: '21', name: 'A', sessionType: '', durationMinutes: 120, spotsLeft: null, cancelled: false },
      { date: '2026-11-21', time: '7:00', courseId: '2', instanceId: '22', name: 'A', sessionType: '', durationMinutes: 120, spotsLeft: 7, cancelled: false },
    ];
    expect(buildCapacityOracle(rows).get('2')).toBe(7);
  });

  it('carries forward a previously learned oracle', () => {
    const prior = new Map([['99', 12]]);
    expect(buildCapacityOracle([], prior).get('99')).toBe(12);
  });

  it('never lets a live reading exceed the capacity it learned', () => {
    // The load-bearing invariant: if remaining > capacity the oracle is stale
    // and ticketsSold would go negative.
    const oracleRows = parseSchedulePage(farFuture);
    const o = buildCapacityOracle(oracleRows);
    for (const r of parseSchedulePage(current)) {
      const cap = o.get(r.courseId);
      if (cap !== undefined && r.spotsLeft !== null) {
        expect(r.spotsLeft).toBeLessThanOrEqual(cap);
      }
    }
  });
});

describe('mergeWithCached', () => {
  const session = (over: Partial<MomenceSession>): MomenceSession => ({
    id: 'punchpass-1', sessionName: 'S', startsAt: '2026-08-06T06:30:00.000Z',
    endsAt: '2026-08-06T08:30:00.000Z', durationMinutes: 120, capacity: 9,
    ticketsSold: 4, fixedTicketPrice: 45, location: 'Blue Mountains', inPerson: true,
    ...over,
  });

  it('keeps a cached observation over a fresh badge-less row', () => {
    // The whole point: once a session starts, Punchpass stops publishing its
    // availability forever. The reading captured before it started is the only
    // one that will ever exist, and must survive every later poll.
    const cached = [session({ ticketsSold: 4 })];
    const fresh = [session({ ticketsSold: 0, utilisationKnown: false })];
    const merged = mergeWithCached(fresh, cached);
    expect(merged).toHaveLength(1);
    expect(merged[0].ticketsSold).toBe(4);
    expect(merged[0].utilisationKnown).toBeUndefined();
  });

  it('lets a fresh observation overwrite a cached one', () => {
    const merged = mergeWithCached([session({ ticketsSold: 7 })], [session({ ticketsSold: 4 })]);
    expect(merged[0].ticketsSold).toBe(7);
  });

  it('still records a cancellation that happened after the last reading', () => {
    const cached = [session({ ticketsSold: 4 })];
    const fresh = [session({ ticketsSold: 0, utilisationKnown: false, isCancelled: true })];
    const merged = mergeWithCached(fresh, cached);
    expect(merged[0].isCancelled).toBe(true);
    expect(merged[0].ticketsSold).toBe(4);
  });

  it('retains cached sessions that are absent from the fresh set', () => {
    const cached = [session({ id: 'punchpass-old', startsAt: '2026-01-01T00:00:00.000Z' })];
    const merged = mergeWithCached([session({})], cached);
    expect(merged).toHaveLength(2);
  });

  it('returns sessions sorted by start time', () => {
    const merged = mergeWithCached(
      [session({ id: 'b', startsAt: '2026-08-07T00:00:00.000Z' })],
      [session({ id: 'a', startsAt: '2026-08-05T00:00:00.000Z' })],
    );
    expect(merged.map(s => s.id)).toEqual(['a', 'b']);
  });
});
