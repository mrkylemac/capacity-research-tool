import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  calculateBenchmarkMetrics,
  checkMetricInvariants,
  inferOperatingHours,
} from '../lib/benchmarkMetrics';
import { getPeriodRange } from '../components/ui/period-selector';
import type { MomenceSession } from '../types/momence';

/**
 * Accuracy stress tests for the benchmark metrics pipeline.
 *
 * These tests pin down behaviour for realistic-but-tricky venue patterns
 * that earlier tests didn't cover: sparse-week venues, free-tier pricing,
 * DST boundaries, future-dated cache entries, and label/denominator drift.
 *
 * Tests tagged "DOCUMENTS CURRENT BEHAVIOUR" capture today's output as a
 * regression baseline; some of them encode known-suboptimal behaviour that
 * downstream tasks will improve. Expected values are updated alongside
 * the fix so the test goes from passing→failing→passing.
 */

function makeSession(overrides: Partial<MomenceSession> = {}): MomenceSession {
  return {
    id: String(Math.random()),
    sessionName: 'Bathhouse Session',
    startsAt: '2025-03-10T08:00:00Z',
    endsAt: '2025-03-10T09:00:00Z',
    durationMinutes: 60,
    capacity: 12,
    ticketsSold: 8,
    fixedTicketPrice: 35,
    location: 'Test Venue',
    inPerson: true,
    ...overrides,
  };
}

// ── Sparse-week venue: open Mon/Wed/Fri only ────────────────────────────────

describe('Sparse-week venue (Mon/Wed/Fri only)', () => {
  /** 4 weeks of Mon/Wed/Fri sessions @ 9am, 12 capacity, 10 tickets sold each. */
  function makeSparseWeekSessions(): MomenceSession[] {
    const sessions: MomenceSession[] = [];
    // 2025-03-03 (Mon) → 2025-03-30 (Sun) = 4 weeks
    const mondays = ['2025-03-03', '2025-03-10', '2025-03-17', '2025-03-24'];
    const wednesdays = ['2025-03-05', '2025-03-12', '2025-03-19', '2025-03-26'];
    const fridays = ['2025-03-07', '2025-03-14', '2025-03-21', '2025-03-28'];
    [...mondays, ...wednesdays, ...fridays].forEach((d, i) => {
      sessions.push(makeSession({
        id: `sw-${i}`,
        startsAt: `${d}T09:00:00Z`,
        endsAt: `${d}T10:00:00Z`,
        durationMinutes: 60,
        ticketsSold: 10,
        capacity: 12,
      }));
    });
    return sessions;
  }

  it('weeklyVisits reflects the 4-week run-rate', () => {
    const sessions = makeSparseWeekSessions();
    // 12 sessions × 10 tickets = 120 visits across 28 days = 4 weeks → 30/week
    const m = calculateBenchmarkMetrics(sessions, '2025-03-03', '2025-03-30');
    expect(m.totalVisits).toBe(120);
    expect(m.daysInRange).toBe(28);
    expect(m.weeksInRange).toBe(4);
    expect(m.weeklyVisits).toBe(30);
  });

  it('visitsPerOpenHour counts only the days-of-week with sessions', () => {
    // Venue runs Mon/Wed/Fri 9-10am only.
    //   open weekdays = 3 (Mon, Wed, Fri), open weekend days = 0
    //   weeklyOpenHours = (10-9)*3 + 0 = 3
    //   weeklyVisits = 30 → visitsPerOpenHour = 30/3 = 10
    // (Previously the denominator was 35 — defaults for weekend hours leaked
    //  in, deflating this metric ~11×.)
    const sessions = makeSparseWeekSessions();
    const m = calculateBenchmarkMetrics(sessions, '2025-03-03', '2025-03-30');
    expect(m.openWeekdaysCount).toBe(3);
    expect(m.openWeekendDaysCount).toBe(0);
    expect(m.weeklyOpenHours).toBe(3);
    expect(m.visitsPerOpenHour).toBeCloseTo(10, 5);
  });

  it('weekend visits stay zero for a weekday-only venue', () => {
    const sessions = makeSparseWeekSessions();
    const m = calculateBenchmarkMetrics(sessions, '2025-03-03', '2025-03-30');
    expect(m.weekdayVisits).toBe(120);
    expect(m.weekendVisits).toBe(0);
    expect(m.weekdayShare).toBe(1);
    expect(m.weekendShare).toBe(0);
  });
});

// ── Weekend-only venue ──────────────────────────────────────────────────────

describe('Weekend-only venue', () => {
  function makeWeekendOnlySessions(): MomenceSession[] {
    const sessions: MomenceSession[] = [];
    // 4 consecutive Saturdays
    ['2025-03-01', '2025-03-08', '2025-03-15', '2025-03-22'].forEach((d, i) => {
      sessions.push(makeSession({
        id: `sat-${i}`,
        startsAt: `${d}T10:00:00Z`,
        durationMinutes: 120,
        ticketsSold: 20,
        capacity: 25,
      }));
    });
    return sessions;
  }

  it('weekend-only venue: open hours count only the actual open days-of-week', () => {
    // Sessions only on Saturday → 1 weekend day-of-week, 0 weekday DOWs.
    // weekendStart=10, weekendEnd=12 → weekendHours = (12-10)*1 = 2
    // Weekday defaults (6-21) are ignored because openWeekdaysCount = 0.
    const sessions = makeWeekendOnlySessions();
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-28');
    expect(m.operatingHours.weekendStart).toBe(10);
    expect(m.operatingHours.weekendEnd).toBe(12);
    expect(m.openWeekdaysCount).toBe(0);
    expect(m.openWeekendDaysCount).toBe(1);
    expect(m.weeklyOpenHours).toBe(2);
    expect(m.visitsPerOpenHour).toBeCloseTo(20 / 2, 5); // 20 visits/wk ÷ 2 open hrs
  });

  it('weeklyVisits divides into 4 weeks correctly', () => {
    const sessions = makeWeekendOnlySessions();
    // 4 Saturdays × 20 = 80 visits across 28 days = 4 weeks → 20/wk
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-28');
    expect(m.totalVisits).toBe(80);
    expect(m.weeklyVisits).toBe(20);
  });
});

// ── Pricing with free / $0 sessions ─────────────────────────────────────────

describe('avgPrice with mixed free and paid sessions', () => {
  it('avgPrice ignores $0 sessions so free trials don\'t drag the list price down', () => {
    // 4 paid @ $35, 4 free @ $0
    // avgPrice = mean across PAID sessions only = 35
    // impliedArpv = volume-weighted across paid sessions = 35
    // (Previously avgPrice was (35*4 + 0*4)/8 = 17.5 — half the true list price.)
    const sessions = [
      ...Array.from({ length: 4 }, (_, i) => makeSession({ id: `paid-${i}`, fixedTicketPrice: 35, ticketsSold: 10 })),
      ...Array.from({ length: 4 }, (_, i) => makeSession({ id: `free-${i}`, fixedTicketPrice: 0, ticketsSold: 5 })),
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-31');
    expect(m.avgPrice).toBeCloseTo(35, 5);
    expect(m.impliedArpv).toBeCloseTo(35, 5);
  });

  it('avgPrice returns 0 when every session is free (no division-by-zero, no NaN)', () => {
    const sessions = [makeSession({ fixedTicketPrice: 0, ticketsSold: 5 })];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-31');
    expect(m.avgPrice).toBe(0);
  });
});

// ── DST transition in Adelaide ──────────────────────────────────────────────

describe('Operating-hours inference across DST', () => {
  /**
   * Adelaide DST: clocks fall back on first Sunday of April, spring forward
   * first Sunday of October. A 9am-local session crosses a UTC-offset boundary.
   *
   * 2025-04-06 = DST end (UTC+10:30 → UTC+9:30 after 03:00 local)
   *
   * Without timezone awareness, inferOperatingHours uses UTC hours and DST
   * sessions will appear to start at different "decimal hours" — making the
   * inferred operating range artificially wide.
   */
  it('DOCUMENTS CURRENT BEHAVIOUR: UTC mode treats DST sessions as different hours', () => {
    // Same local 9am Adelaide, before and after DST end
    // 2025-03-31 Mon 09:00 Adelaide (UTC+10:30) = 22:30 UTC Sun 30 Mar
    // 2025-04-14 Mon 09:00 Adelaide (UTC+9:30)  = 23:30 UTC Sun 13 Apr
    const sessions = [
      makeSession({ id: 'pre-dst', startsAt: '2025-03-30T22:30:00Z', durationMinutes: 60 }),
      makeSession({ id: 'post-dst', startsAt: '2025-04-13T23:30:00Z', durationMinutes: 60 }),
    ];
    const hoursUtc = inferOperatingHours(sessions); // no timezone arg
    // In UTC, "starts at" looks like 22:30 and 23:30 — both treated as Sunday weekend
    expect(hoursUtc.weekendStart).toBeLessThan(24);

    const hoursTz = inferOperatingHours(sessions, 'Australia/Adelaide');
    // With TZ awareness, both should land on Monday 9am local — no spread.
    expect(hoursTz.weekdayStart).toBe(9);
    expect(hoursTz.weekdayEnd).toBe(10);
  });
});

// ── Future-dated sessions in cache ──────────────────────────────────────────

describe('Future-dated sessions (booked but not yet occurred)', () => {
  /**
   * Some platforms (TryBe, Acuity, Wix) return future sessions in the cache.
   * For a "this month" view we'd expect those to either be included with their
   * pre-sale tickets, or filtered out — but never silently inflate the rate.
   *
   * calculateBenchmarkMetrics itself doesn't filter by date; filtering happens
   * in report-client.tsx (period range) and then activeSessions filter
   * (ticketsSold > 0). These tests assert what the math does when the caller
   * does or doesn't include future sessions.
   */
  it('includes future sessions with non-zero tickets if caller passes them', () => {
    // 7 past sessions @ 10 tickets each, plus 7 future sessions @ 0 (pre-sale empty)
    // If the caller filters to ticketsSold > 0, future ones drop out automatically.
    const past = Array.from({ length: 7 }, (_, i) => makeSession({
      id: `past-${i}`,
      startsAt: `2025-03-0${i + 1}T08:00:00Z`,
      ticketsSold: 10,
    }));
    const future = Array.from({ length: 7 }, (_, i) => makeSession({
      id: `fut-${i}`,
      startsAt: `2025-03-1${i + 1}T08:00:00Z`,
      ticketsSold: 0,
    }));
    // Simulate the report-client active-sessions filter:
    const active = [...past, ...future].filter(s => s.ticketsSold > 0);
    expect(active).toHaveLength(7);
    const m = calculateBenchmarkMetrics(active, '2025-03-01', '2025-03-07');
    expect(m.totalVisits).toBe(70);
  });

  it('preserves dailyVisits × daysInRange = totalVisits invariant', () => {
    // Even with messy input, the basic invariant must hold.
    const sessions = Array.from({ length: 20 }, (_, i) => makeSession({
      id: `s-${i}`,
      startsAt: `2025-03-${String((i % 28) + 1).padStart(2, '0')}T08:00:00Z`,
      ticketsSold: (i % 5) + 1,
    }));
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-28');
    expect(m.dailyVisits * m.daysInRange).toBeCloseTo(m.totalVisits, 5);
    expect(m.weeklyVisits * m.weeksInRange).toBeCloseTo(m.totalVisits, 5);
  });
});

// ── Timezone-aware period boundaries ────────────────────────────────────────

describe('getPeriodRange timezone awareness', () => {
  // Pin "now" to a known wall-clock moment so DST and month-boundary tests
  // are deterministic. 2026-05-23 12:00 UTC = 2026-05-23 21:30 Adelaide.
  const FIXED_NOW = new Date('2026-05-23T12:00:00Z');

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('"This month" for an Adelaide venue starts at May 1 00:00 Adelaide', () => {
    const range = getPeriodRange('1m', 'Australia/Adelaide');
    // May 1 00:00 Adelaide (UTC+9:30 — post-DST in May) = April 30 14:30 UTC
    expect(range.from.toISOString()).toBe('2026-04-30T14:30:00.000Z');
    expect(range.to.getTime()).toBe(FIXED_NOW.getTime());
  });

  it('"This month" for a Honolulu venue starts at May 1 00:00 Honolulu', () => {
    const range = getPeriodRange('1m', 'Pacific/Honolulu');
    // May 1 00:00 Honolulu (UTC-10, no DST) = May 1 10:00 UTC
    expect(range.from.toISOString()).toBe('2026-05-01T10:00:00.000Z');
  });

  it('"Today" honours the venue clock, not the viewer\'s', () => {
    // FIXED_NOW = 2026-05-23 12:00 UTC. In Honolulu that's still 2026-05-23 02:00.
    // In Auckland (UTC+12) that's already 2026-05-24 00:00.
    const honolulu = getPeriodRange('today', 'Pacific/Honolulu');
    expect(honolulu.from.toISOString()).toBe('2026-05-23T10:00:00.000Z'); // 00:00 HST 23 May
    expect(honolulu.to.toISOString()).toBe('2026-05-24T09:59:59.000Z');   // 23:59:59 HST 23 May

    const auckland = getPeriodRange('today', 'Pacific/Auckland');
    // Wall clock in Auckland at FIXED_NOW = 2026-05-24 00:00 NZST
    expect(auckland.from.toISOString()).toBe('2026-05-23T12:00:00.000Z'); // 00:00 NZST 24 May
  });

  it('falls back to browser local time when timezone is omitted', () => {
    // Without TZ arg, "today" uses browser local startOfDay/endOfDay.
    // Just verify the shape: from < now < to and they're both Date objects.
    const range = getPeriodRange('today');
    expect(range.from).toBeInstanceOf(Date);
    expect(range.to).toBeInstanceOf(Date);
    expect(range.from.getTime()).toBeLessThanOrEqual(FIXED_NOW.getTime());
    expect(range.to.getTime()).toBeGreaterThanOrEqual(FIXED_NOW.getTime());
  });

  it('"This week" starts on Monday in the venue timezone', () => {
    // FIXED_NOW = Sat 23 May 2026. Monday of that week = Mon 18 May.
    const range = getPeriodRange('1w', 'Australia/Adelaide');
    // Mon 18 May 00:00 Adelaide = Sun 17 May 14:30 UTC
    expect(range.from.toISOString()).toBe('2026-05-17T14:30:00.000Z');
  });

  it('"1 month" (rolling) handles month-length edges', () => {
    // FIXED_NOW = 23 May 2026 → 1 month back = 23 April 2026
    const range = getPeriodRange('last1m', 'Australia/Adelaide');
    // 23 April 21:30 Adelaide = 23 April 12:00 UTC (still AEST, no DST)
    // Note: April in Australia is AEST (UTC+10) after DST end. So 21:30 AEST = 11:30 UTC.
    // Actually Adelaide is ACST/ACDT — UTC+9:30 (standard) / UTC+10:30 (DST).
    // DST ends first Sunday of April: 5 April 2026. After 5 April, Adelaide = UTC+9:30.
    // So 23 April 2026 21:30 Adelaide = 23 April 12:00 UTC.
    expect(range.from.toISOString()).toBe('2026-04-23T12:00:00.000Z');
  });
});

// ── Metric invariants ───────────────────────────────────────────────────────

describe('checkMetricInvariants', () => {
  it('returns no violations for a healthy metrics object', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T08:00:00Z', ticketsSold: 10 }),
      makeSession({ startsAt: '2025-03-11T08:00:00Z', ticketsSold: 15 }),
      makeSession({ startsAt: '2025-03-15T08:00:00Z', ticketsSold: 5 }),
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-31');
    expect(checkMetricInvariants(m)).toEqual([]);
  });

  it('flags weeklyVisits × weeksInRange drift', () => {
    const sessions = [makeSession({ ticketsSold: 30 })];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-14');
    // Mutate to break the invariant
    const broken = { ...m, weeklyVisits: 999 };
    const violations = checkMetricInvariants(broken);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toMatch(/weeklyVisits.*totalVisits/);
  });

  it('flags weekday/weekend split drift', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T08:00:00Z', ticketsSold: 10 }), // Mon
      makeSession({ startsAt: '2025-03-08T08:00:00Z', ticketsSold: 5 }),  // Sat
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-31');
    const broken = { ...m, weekdayVisits: 50, weekendVisits: 50 }; // sums to 100, not 15
    const violations = checkMetricInvariants(broken);
    expect(violations.some(v => /weekdayVisits.*weekendVisits/.test(v))).toBe(true);
  });
});

// ── Computed window drift vs requested window ───────────────────────────────

describe('Computed window honesty', () => {
  it('exposes computedFrom/computedTo so callers can show "data through X"', () => {
    const sessions = [
      makeSession({ startsAt: '2025-05-01T09:00:00Z', ticketsSold: 50 }),
      makeSession({ startsAt: '2025-05-22T18:00:00Z', ticketsSold: 50 }),
    ];
    const m = calculateBenchmarkMetrics(
      sessions,
      '2025-05-01T09:00:00Z',
      '2025-05-22T18:00:00Z',
    );
    // Computed window matches the inputs — caller is expected to derive it
    // from first/last *active* session (not the period range).
    expect(m.computedFrom).toBe('2025-05-01T09:00:00Z');
    expect(m.computedTo).toBe('2025-05-22T18:00:00Z');
  });
});
