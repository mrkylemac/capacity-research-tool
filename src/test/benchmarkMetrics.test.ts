import { describe, it, expect } from 'vitest';
import {
  calculateBenchmarkMetrics,
  compareToSlowFolk,
  inferOperatingHours,
  formatOperatingHours,
  type OperatingHours,
} from '../lib/benchmarkMetrics';
import type { MomenceSession } from '../types/momence';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<MomenceSession> = {}): MomenceSession {
  return {
    id: String(Math.random()),
    sessionName: 'Sauna & Ice',
    startsAt: '2025-03-10T08:00:00Z', // Monday
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

// ─── inferOperatingHours ──────────────────────────────────────────────────────

describe('inferOperatingHours', () => {
  it('returns defaults for empty sessions', () => {
    const hours = inferOperatingHours([]);
    expect(hours.weekdayStart).toBe(6);
    expect(hours.weekdayEnd).toBe(21);
    expect(hours.weekendStart).toBe(6);
    expect(hours.weekendEnd).toBe(21);
  });

  it('correctly separates weekday and weekend sessions', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T06:00:00Z', durationMinutes: 60 }), // Monday
      makeSession({ startsAt: '2025-03-10T20:00:00Z', durationMinutes: 60 }), // Monday
      makeSession({ startsAt: '2025-03-08T07:00:00Z', durationMinutes: 60 }), // Saturday
      makeSession({ startsAt: '2025-03-08T18:00:00Z', durationMinutes: 90 }), // Saturday
    ];
    const hours = inferOperatingHours(sessions);

    expect(hours.weekdayStart).toBe(6);
    expect(hours.weekdayEnd).toBe(21); // 20 + 1hr duration
    expect(hours.weekendStart).toBe(7);
    expect(hours.weekendEnd).toBe(19.5); // 18 + 1.5hr duration
  });

  it('includes minutes in start times', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T06:30:00Z', durationMinutes: 60 }), // Monday 6:30am
    ];
    const hours = inferOperatingHours(sessions);
    expect(hours.weekdayStart).toBe(6.5); // 6:30
    expect(hours.weekdayEnd).toBe(7.5);   // 6:30 + 1hr
  });

  it('accounts for session duration in end time', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T20:00:00Z', durationMinutes: 90 }), // ends 21:30
    ];
    const hours = inferOperatingHours(sessions);
    expect(hours.weekdayEnd).toBe(21.5); // 20 + 1.5hr
  });

  it('handles only-weekend data with weekday defaults', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-08T09:00:00Z', durationMinutes: 60 }), // Saturday
    ];
    const hours = inferOperatingHours(sessions);
    expect(hours.weekdayStart).toBe(6);  // default
    expect(hours.weekdayEnd).toBe(21);   // default
    expect(hours.weekendStart).toBe(9);
    expect(hours.weekendEnd).toBe(10);
  });
});

// ─── calculateBenchmarkMetrics ────────────────────────────────────────────────

describe('calculateBenchmarkMetrics', () => {
  it('calculates volume metrics correctly', () => {
    const sessions = [
      makeSession({ ticketsSold: 10 }),
      makeSession({ ticketsSold: 20 }),
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-14');
    // 14 days, 2 weeks
    expect(m.totalVisits).toBe(30);
    expect(m.daysInRange).toBe(14);
    expect(m.weeksInRange).toBe(2);
    expect(m.dailyVisits).toBeCloseTo(30 / 14, 5);
    expect(m.weeklyVisits).toBeCloseTo(30 / 2, 5);
  });

  it('uses fractional weeks for non-round day counts', () => {
    const sessions = [makeSession({ ticketsSold: 100 })];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-10');
    // 10 days = 10/7 ≈ 1.4286 weeks
    expect(m.daysInRange).toBe(10);
    expect(m.weeksInRange).toBeCloseTo(10 / 7, 5);
    expect(m.weeklyVisits).toBeCloseTo(100 / (10 / 7), 5);
  });

  it('minimum of 1 week for very short ranges', () => {
    const sessions = [makeSession({ ticketsSold: 50 })];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-03');
    // 3 days = 3/7 ≈ 0.43 → clamped to 1
    expect(m.weeksInRange).toBe(1);
    expect(m.weeklyVisits).toBe(50);
  });

  it('calculates occupancy rate as ratio (not percentage)', () => {
    const sessions = [
      makeSession({ ticketsSold: 9, capacity: 12 }),
      makeSession({ ticketsSold: 3, capacity: 12 }),
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-31');
    // occupancyRate = 12/24 = 0.5
    expect(m.occupancyRate).toBeCloseTo(0.5, 5);
  });

  it('calculates weekday/weekend split correctly', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T08:00:00Z', ticketsSold: 10 }), // Monday
      makeSession({ startsAt: '2025-03-11T08:00:00Z', ticketsSold: 15 }), // Tuesday
      makeSession({ startsAt: '2025-03-08T08:00:00Z', ticketsSold: 5 }),  // Saturday
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-31');

    expect(m.weekdayVisits).toBe(25);
    expect(m.weekendVisits).toBe(5);
    expect(m.weekdayShare).toBeCloseTo(25 / 30, 5);
    expect(m.weekendShare).toBeCloseTo(5 / 30, 5);
  });

  it('handles zero total visits without division by zero', () => {
    const sessions = [
      makeSession({ ticketsSold: 0, capacity: 12 }),
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-31');
    expect(m.weekdayShare).toBe(0);
    expect(m.weekendShare).toBe(0);
    expect(m.occupancyRate).toBe(0);
  });

  it('calculates implied ARPV as volume-weighted average price', () => {
    const sessions = [
      makeSession({ ticketsSold: 10, fixedTicketPrice: 30 }),
      makeSession({ ticketsSold: 10, fixedTicketPrice: 50 }),
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-31');
    // Weighted: (30*10 + 50*10) / (10+10) = 800/20 = 40
    expect(m.impliedArpv).toBeCloseTo(40, 5);
  });

  it('calculates avgPrice as simple average across all sessions', () => {
    const sessions = [
      makeSession({ fixedTicketPrice: 30 }),
      makeSession({ fixedTicketPrice: 50 }),
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-31');
    expect(m.avgPrice).toBeCloseTo(40, 5);
  });

  it('falls back to avgPrice when no volume for ARPV', () => {
    const sessions = [
      makeSession({ ticketsSold: 0, fixedTicketPrice: 35 }),
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-31');
    expect(m.impliedArpv).toBe(35);
  });

  it('uses operating hours override when provided, scaled by open days-of-week', () => {
    const override: OperatingHours = {
      weekdayStart: 6,
      weekdayEnd: 22,
      weekendStart: 7,
      weekendEnd: 21,
    };
    // Single Monday session → 1 weekday DOW with data, 0 weekend DOWs.
    const sessions = [makeSession({ ticketsSold: 100 })];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-14', override);
    // Open weekdays = 1 (Mon), open weekend days = 0.
    // weeklyOpenHours = (22-6)*1 + (21-7)*0 = 16
    expect(m.openWeekdaysCount).toBe(1);
    expect(m.openWeekendDaysCount).toBe(0);
    expect(m.weeklyOpenHours).toBe(16);
  });

  it('calculates visitsPerOpenHour correctly', () => {
    const override: OperatingHours = {
      weekdayStart: 6,
      weekdayEnd: 18,  // 12hrs
      weekendStart: 8,
      weekendEnd: 16,  // 8hrs
    };
    const sessions = [
      makeSession({ ticketsSold: 100, startsAt: '2025-03-10T08:00:00Z' }), // Monday
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-07', override);
    // Single Mon session → 1 weekday DOW, 0 weekend DOWs.
    // weeklyOpenHours = 12*1 + 8*0 = 12
    // weeksInRange = 1, weeklyVisits = 100 → visitsPerOpenHour = 100/12
    expect(m.weeklyOpenHours).toBe(12);
    expect(m.visitsPerOpenHour).toBeCloseTo(100 / 12, 5);
  });

  it('sets lastSessionAt to the latest session start, regardless of input order', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-12T08:00:00.000Z' }),
      makeSession({ startsAt: '2025-03-03T08:00:00.000Z' }),
      makeSession({ startsAt: '2025-03-10T08:00:00.000Z' }),
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2026-07-22');
    expect(m.lastSessionAt).toBe('2025-03-12T08:00:00.000Z');
    // computedTo stays the window end — lastSessionAt is the freshness signal
    expect(m.computedTo).toBe('2026-07-22');
  });

  it('falls back lastSessionAt to the window end when no sessions are provided', () => {
    const m = calculateBenchmarkMetrics([], '2025-03-01', '2025-03-14');
    expect(m.lastSessionAt).toBe('2025-03-14');
  });
});

// ─── compareToSlowFolk ────────────────────────────────────────────────────────

describe('compareToSlowFolk', () => {
  it('returns comparison metrics with correct status indicators', () => {
    const metrics = calculateBenchmarkMetrics(
      [
        makeSession({ ticketsSold: 10, capacity: 12, fixedTicketPrice: 35, startsAt: '2025-03-10T08:00:00Z' }),
      ],
      '2025-03-01',
      '2025-03-31'
    );
    const comparisons = compareToSlowFolk(metrics);

    expect(comparisons.length).toBeGreaterThan(0);

    // Each comparison should have the expected shape
    comparisons.forEach(c => {
      expect(c).toHaveProperty('metric');
      expect(c).toHaveProperty('value');
      expect(c).toHaveProperty('target');
      expect(c).toHaveProperty('unit');
      expect(c).toHaveProperty('status');
      expect(c).toHaveProperty('delta');
      expect(c).toHaveProperty('deltaPercent');
      expect(['above', 'below', 'on-target']).toContain(c.status);
    });
  });

  it('marks values within 5% as on-target', () => {
    // Build metrics that are exactly on Slow Folk targets
    const metrics = calculateBenchmarkMetrics(
      // We'll check the comparison logic directly
      [],
      '2025-03-01',
      '2025-03-31'
    );
    // Override with mock to test comparison logic
    const comparisons = compareToSlowFolk({
      ...metrics,
      weeklyVisits: 686, // exact target
      occupancyRate: 0.60,
      weekdayShare: 0.63,
      visitsPerOpenHour: 686 / 60.5,
      impliedArpv: 34.81,
      avgVisitorsPerSession: 15 * 0.60,
    });

    const weeklyVisits = comparisons.find(c => c.metric === 'Weekly Visits');
    expect(weeklyVisits!.status).toBe('on-target');
    expect(weeklyVisits!.deltaPercent).toBeCloseTo(0, 1);
  });

  it('correctly identifies above and below status', () => {
    const metrics = calculateBenchmarkMetrics(
      [],
      '2025-03-01',
      '2025-03-31'
    );
    const comparisons = compareToSlowFolk({
      ...metrics,
      weeklyVisits: 1000,      // well above 686
      occupancyRate: 0.20,     // well below 60%
      weekdayShare: 0.63,
      visitsPerOpenHour: 11.3,
      impliedArpv: 34.81,
      avgVisitorsPerSession: 9,
    });

    const weeklyVisits = comparisons.find(c => c.metric === 'Weekly Visits');
    expect(weeklyVisits!.status).toBe('above');

    const occupancy = comparisons.find(c => c.metric === 'Occupancy Rate');
    expect(occupancy!.status).toBe('below');
  });

  it('calculates delta and deltaPercent correctly', () => {
    const metrics = calculateBenchmarkMetrics([], '2025-03-01', '2025-03-31');
    const comparisons = compareToSlowFolk({
      ...metrics,
      weeklyVisits: 750,
      occupancyRate: 0.60,
      weekdayShare: 0.63,
      visitsPerOpenHour: 11.3,
      impliedArpv: 34.81,
      avgVisitorsPerSession: 9,
    });

    const weeklyVisits = comparisons.find(c => c.metric === 'Weekly Visits');
    // value=750, target=686, delta=64
    expect(weeklyVisits!.delta).toBe(750 - 686);
    expect(weeklyVisits!.deltaPercent).toBeCloseTo(((750 - 686) / 686) * 100, 2);
  });
});

// ─── formatOperatingHours ─────────────────────────────────────────────────────

describe('formatOperatingHours', () => {
  it('formats matching weekday/weekend hours as single range', () => {
    const hours: OperatingHours = {
      weekdayStart: 6,
      weekdayEnd: 21,
      weekendStart: 6,
      weekendEnd: 21,
    };
    expect(formatOperatingHours(hours)).toBe('6am–9pm');
  });

  it('formats different weekday/weekend hours separately', () => {
    const hours: OperatingHours = {
      weekdayStart: 6,
      weekdayEnd: 22,
      weekendStart: 8,
      weekendEnd: 20,
    };
    expect(formatOperatingHours(hours)).toBe('Weekdays 6am–10pm, Weekends 8am–8pm');
  });

  it('handles noon and midnight formatting', () => {
    const hours: OperatingHours = {
      weekdayStart: 0,
      weekdayEnd: 12,
      weekendStart: 0,
      weekendEnd: 12,
    };
    expect(formatOperatingHours(hours)).toBe('12am–12pm');
  });

  it('formats decimal hours as readable time (no raw decimals in UI)', () => {
    const hours: OperatingHours = {
      weekdayStart: 4,
      weekdayEnd: 18.083333333333332,
      weekendStart: 6,
      weekendEnd: 15.833333333333334,
    };
    expect(formatOperatingHours(hours)).toBe('Weekdays 4am–6:05pm, Weekends 6am–3:50pm');
  });
});
