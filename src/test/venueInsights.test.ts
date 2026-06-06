import {
  isPartialMonth,
  getStrongestMonth,
  getVisitorGrowth,
  getTimeToPeak,
  buildCapacityString,
  buildSessionDesignDescription,
  buildOpeningPatternDescription,
  buildSummary,
  computePeriodSummary,
  computeMonthlyTrajectory,
} from '@/lib/venueInsights';
import type { MonthlyData } from '@/types/momence';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMonth(month: string, year: number, overrides: Partial<MonthlyData> = {}): MonthlyData {
  return {
    month,
    year,
    sessions: 30,
    ticketsSold: 300,
    capacity: 600,
    utilisation: 50,
    revenue: 13500,
    ...overrides,
  };
}

function makeMetrics(overrides: Partial<BenchmarkMetrics> = {}): BenchmarkMetrics {
  return {
    totalSessions: 120,
    totalVisits: 1200,
    totalCapacity: 2400,
    occupancyRate: 0.5,
    weeklyVisits: 300,
    weeklySessions: 30,
    modalCapacity: 20,
    avgTicketsPerSession: 10,
    peakSlot: '9:00 AM',
    peakSlotAvg: 15,
    weekdayShare: 0.6,
    weekendShare: 0.4,
    avgPrice: 45,
    estimatedWeeklyRevenue: 13500,
    daysInRange: 28,
    weeksInRange: 4,
    computedFrom: '2026-01-01',
    computedTo: '2026-01-28',
    ...overrides,
  } as BenchmarkMetrics;
}

// ═══════════════════════════════════════════════════════════════════════════════
// isPartialMonth
// ═══════════════════════════════════════════════════════════════════════════════

describe('isPartialMonth', () => {
  it('returns false for a single month of data', () => {
    const months = [makeMonth('January', 2026)];
    expect(isPartialMonth(months[0], months)).toBe(false);
  });

  it('returns false when all months have similar session counts', () => {
    const months = [
      makeMonth('January', 2026, { sessions: 30 }),
      makeMonth('February', 2026, { sessions: 28 }),
      makeMonth('March', 2026, { sessions: 31 }),
    ];
    expect(isPartialMonth(months[0], months)).toBe(false);
    expect(isPartialMonth(months[1], months)).toBe(false);
  });

  it('detects a partial month with very few sessions', () => {
    const months = [
      makeMonth('January', 2026, { sessions: 30 }),
      makeMonth('February', 2026, { sessions: 28 }),
      makeMonth('March', 2026, { sessions: 3 }), // < 40% of median (28)
    ];
    expect(isPartialMonth(months[2], months)).toBe(true);
  });

  it('returns false when zero-session month is assessed (no active months ≥ 2)', () => {
    const months = [
      makeMonth('January', 2026, { sessions: 0 }),
      makeMonth('February', 2026, { sessions: 0 }),
    ];
    expect(isPartialMonth(months[0], months)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getStrongestMonth
// ═══════════════════════════════════════════════════════════════════════════════

describe('getStrongestMonth', () => {
  it('returns null for empty data', () => {
    expect(getStrongestMonth([])).toBeNull();
  });

  it('returns null when all sessions are zero', () => {
    const months = [
      makeMonth('January', 2026, { sessions: 0, ticketsSold: 0 }),
      makeMonth('February', 2026, { sessions: 0, ticketsSold: 0 }),
    ];
    expect(getStrongestMonth(months)).toBeNull();
  });

  it('finds the month with the most visitors', () => {
    const months = [
      makeMonth('January', 2026, { ticketsSold: 200 }),
      makeMonth('February', 2026, { ticketsSold: 400 }),
      makeMonth('March', 2026, { ticketsSold: 300 }),
    ];
    const result = getStrongestMonth(months);
    expect(result).toEqual({ label: 'February 2026', visitors: 400 });
  });

  it('excludes partial months from the peak', () => {
    const months = [
      makeMonth('January', 2026, { sessions: 30, ticketsSold: 300 }),
      makeMonth('February', 2026, { sessions: 30, ticketsSold: 250 }),
      makeMonth('March', 2026, { sessions: 2, ticketsSold: 500 }), // partial
    ];
    const result = getStrongestMonth(months);
    expect(result?.label).toBe('January 2026');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getVisitorGrowth
// ═══════════════════════════════════════════════════════════════════════════════

describe('getVisitorGrowth', () => {
  it('returns 0 for fewer than 2 full months', () => {
    expect(getVisitorGrowth([])).toBe(0);
    expect(getVisitorGrowth([makeMonth('January', 2026)])).toBe(0);
  });

  it('calculates positive growth correctly', () => {
    // Need 4+ months so first-3 and last-3 windows don't fully overlap
    const months = [
      makeMonth('January', 2026, { ticketsSold: 100, sessions: 30 }),
      makeMonth('February', 2026, { ticketsSold: 100, sessions: 30 }),
      makeMonth('March', 2026, { ticketsSold: 100, sessions: 30 }),
      makeMonth('April', 2026, { ticketsSold: 200, sessions: 30 }),
      makeMonth('May', 2026, { ticketsSold: 200, sessions: 30 }),
      makeMonth('June', 2026, { ticketsSold: 200, sessions: 30 }),
    ];
    // first 3 avg = 100, last 3 avg = 200, growth = 100%
    expect(getVisitorGrowth(months)).toBe(100);
  });

  it('calculates negative growth correctly', () => {
    const months = [
      makeMonth('January', 2026, { ticketsSold: 200, sessions: 30 }),
      makeMonth('February', 2026, { ticketsSold: 200, sessions: 30 }),
      makeMonth('March', 2026, { ticketsSold: 200, sessions: 30 }),
      makeMonth('April', 2026, { ticketsSold: 100, sessions: 30 }),
      makeMonth('May', 2026, { ticketsSold: 100, sessions: 30 }),
      makeMonth('June', 2026, { ticketsSold: 100, sessions: 30 }),
    ];
    // first 3 avg = 200, last 3 avg = 100, growth = -50%
    expect(getVisitorGrowth(months)).toBe(-50);
  });

  it('calculates growth with just 2 months (non-overlapping windows)', () => {
    const months = [
      makeMonth('January', 2026, { ticketsSold: 100, sessions: 30 }),
      makeMonth('February', 2026, { ticketsSold: 200, sessions: 30 }),
    ];
    // n = floor(2/2) = 1, first avg = 100, last avg = 200, growth = 100%
    expect(getVisitorGrowth(months)).toBe(100);
  });

  it('returns 0 when first average is zero', () => {
    const months = [
      makeMonth('January', 2026, { ticketsSold: 0, sessions: 30 }),
      makeMonth('February', 2026, { ticketsSold: 100, sessions: 30 }),
    ];
    expect(getVisitorGrowth(months)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getTimeToPeak
// ═══════════════════════════════════════════════════════════════════════════════

describe('getTimeToPeak', () => {
  it('returns 0 for empty data', () => {
    expect(getTimeToPeak([])).toBe(0);
  });

  it('returns 0 when first month is already at peak', () => {
    const months = [
      makeMonth('January', 2026, { ticketsSold: 500, sessions: 30 }),
      makeMonth('February', 2026, { ticketsSold: 300, sessions: 30 }),
    ];
    expect(getTimeToPeak(months)).toBe(0);
  });

  it('counts months to reach 80% of peak', () => {
    const months = [
      makeMonth('January', 2026, { ticketsSold: 100, sessions: 30 }),
      makeMonth('February', 2026, { ticketsSold: 200, sessions: 30 }),
      makeMonth('March', 2026, { ticketsSold: 400, sessions: 30 }),  // 80% of 500 = 400
      makeMonth('April', 2026, { ticketsSold: 500, sessions: 30 }),
    ];
    // 80% of 500 = 400, reached at March (index 2), so 2 months to get there
    expect(getTimeToPeak(months)).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// buildSessionDesignDescription
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildSessionDesignDescription', () => {
  it('returns fallback when duration is 0', () => {
    expect(buildSessionDesignDescription(0, 0, 0, 0)).toBe(
      'Session design could not be determined from the available data.',
    );
  });

  it('builds description with rolling interval and concurrent sessions', () => {
    const result = buildSessionDesignDescription(60, 30, 2, 24);
    expect(result).toContain('60-minute sessions');
    expect(result).toContain('rolling every 30 minutes');
    expect(result).toContain('2 concurrent sessions');
    expect(result).toContain('24 guests on site');
  });

  it('omits concurrent sessions when only 1', () => {
    const result = buildSessionDesignDescription(60, 30, 1, 12);
    expect(result).not.toContain('concurrent');
    expect(result).toContain('12 guests');
  });

  it('handles no rolling interval', () => {
    const result = buildSessionDesignDescription(60, 0, 1, 0);
    expect(result).toBe('60-minute sessions.');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// buildOpeningPatternDescription
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildOpeningPatternDescription', () => {
  it('handles uniform hours (weekday = weekend)', () => {
    const result = buildOpeningPatternDescription(7, 84, '7am–7pm', '7am–7pm');
    expect(result).toContain('Open 7 days');
    expect(result).toContain('7am–7pm daily');
    expect(result).not.toContain('weekdays');
  });

  it('handles different weekday/weekend hours', () => {
    const result = buildOpeningPatternDescription(7, 92, '7am–9pm', '8am–8pm');
    expect(result).toContain('weekdays 7am–9pm');
    expect(result).toContain('weekends 8am–8pm');
  });

  it('handles fewer than 7 days', () => {
    const result = buildOpeningPatternDescription(5, 60, '9am–9pm', '9am–9pm');
    expect(result).toContain('Open 5 days per week');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// computePeriodSummary
// ═══════════════════════════════════════════════════════════════════════════════

describe('computePeriodSummary', () => {
  it('computes correct averages', () => {
    const metrics = makeMetrics({
      totalVisits: 1200,
      totalCapacity: 2400,
      totalSessions: 120,
      weeksInRange: 4,
      daysInRange: 28,
      computedFrom: '2026-01-01',
      computedTo: '2026-01-28',
    });
    const summary = computePeriodSummary(metrics);
    expect(summary.visitorsPerWeek).toBe(300);
    expect(summary.seatsPerWeek).toBe(600);
    expect(summary.sessionsPerWeek).toBe(30);
    expect(summary.visitorsPerDay).toBeCloseTo(42.86, 1);
    expect(summary.occupancyPercent).toBe(50);
    expect(summary.periodLabel).toBe('4 weeks');
  });

  it('returns 0% occupancy when totalCapacity is 0', () => {
    const metrics = makeMetrics({ totalCapacity: 0 });
    const summary = computePeriodSummary(metrics);
    expect(summary.occupancyPercent).toBe(0);
  });

  it('uses correct period labels for various ranges', () => {
    expect(computePeriodSummary(makeMetrics({ daysInRange: 1, weeksInRange: 1 / 7 })).periodLabel).toBe('1 day');
    expect(computePeriodSummary(makeMetrics({ daysInRange: 5, weeksInRange: 5 / 7 })).periodLabel).toBe('5 days');
    expect(computePeriodSummary(makeMetrics({ daysInRange: 90, weeksInRange: 90 / 7 })).periodLabel).toBe('3 months');
    expect(computePeriodSummary(makeMetrics({ daysInRange: 365, weeksInRange: 365 / 7 })).periodLabel).toBe('1 year');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// computeMonthlyTrajectory
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeMonthlyTrajectory', () => {
  it('returns empty array for empty data', () => {
    const result = computeMonthlyTrajectory([], { from: '2026-01-01', to: '2026-03-31' });
    expect(result).toHaveLength(0);
  });

  it('maps months to trajectory points with labels', () => {
    const months = [
      makeMonth('January', 2026, { ticketsSold: 300, capacity: 600 }),
      makeMonth('February', 2026, { ticketsSold: 400, capacity: 600 }),
    ];
    const result = computeMonthlyTrajectory(months, { from: '2025-12-01', to: '2026-03-31' });
    expect(result).toHaveLength(2);
    expect(result[0].monthLabel).toBe("Jan '26");
    expect(result[0].visitors).toBe(300);
    expect(result[0].occupancy).toBe(0.5);
    expect(result[1].monthLabel).toBe("Feb '26");
  });

  it('marks boundary months as partial', () => {
    const months = [
      makeMonth('January', 2026, { sessions: 30 }),
      makeMonth('February', 2026, { sessions: 28 }),
      makeMonth('March', 2026, { sessions: 30 }),
    ];
    // The "from" date cuts into January, and "to" cuts into March
    const result = computeMonthlyTrajectory(months, { from: '2026-01-15', to: '2026-03-15' });
    expect(result[0].isPartial).toBe(true);  // Jan — boundary
    expect(result[1].isPartial).toBe(false); // Feb — full
    expect(result[2].isPartial).toBe(true);  // Mar — boundary
  });

  it('flags low data when visitors below threshold', () => {
    const months = [makeMonth('January', 2026, { sessions: 30, ticketsSold: 20 })];
    const result = computeMonthlyTrajectory(months, { from: '2025-12-01', to: '2026-02-28' }, { minVisitors: 50 });
    expect(result[0].isLowData).toBe(true);
  });

  it('handles zero capacity without division error', () => {
    const months = [makeMonth('January', 2026, { ticketsSold: 0, capacity: 0 })];
    const result = computeMonthlyTrajectory(months, { from: '2025-12-01', to: '2026-02-28' });
    expect(result[0].occupancy).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// buildCapacityString
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildCapacityString', () => {
  it('uses single-day format when daysInRange <= 1', () => {
    const metrics = makeMetrics({ daysInRange: 1, totalVisits: 110, totalCapacity: 60 });
    const result = buildCapacityString(metrics);
    expect(result).toContain('visitors today');
    expect(result).toContain('seats today');
    expect(result).toContain('183.3%');
  });

  it('uses weekly format when daysInRange > 1', () => {
    const metrics = makeMetrics({ daysInRange: 28 });
    const result = buildCapacityString(metrics);
    expect(result).toContain('visitors/week');
    expect(result).toContain('seats/week');
  });

  it('handles zero capacity', () => {
    const metrics = makeMetrics({ totalCapacity: 0, daysInRange: 7 });
    const result = buildCapacityString(metrics);
    expect(result).toContain('0.0%');
  });

  it('summary seats/week equals tile seats/week for mixed-capacity sessions', () => {
    // Fixture: 8 sessions @ 4 seats + 2 sessions @ 12 seats over a 7-day week
    //   totalCapacity = 8*4 + 2*12 = 56
    //   totalSessions = 10  → 10 sessions/week
    //   modalCapacity = 4   (most common)
    //   30 visitors total  → 53.6% occupancy
    // Old formula (modal × sessions/week) gave 40 seats/week — wrong, dropped the two big rooms.
    // New formula (totalCapacity / weeksInRange) gives 56 seats/week — matches the Capacity tile.
    const metrics = makeMetrics({
      totalSessions: 10,
      totalVisits: 30,
      totalCapacity: 56,
      modalCapacity: 4,
      weeklyVisits: 30,
      daysInRange: 7,
      weeksInRange: 1,
      occupancyRate: 30 / 56,
    });
    const result = buildCapacityString(metrics);
    expect(result).toContain('30 visitors/week');
    expect(result).toContain('56 seats/week');
    expect(result).toContain('53.6% seat occupancy');
    // The displayed seats/week MUST be reproducible from the other displayed numbers:
    // visitors/week ÷ seats/week ≈ occupancy %  (within 0.1 pp)
    expect((30 / 56) * 100).toBeCloseTo(53.6, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// buildSummary
// ═══════════════════════════════════════════════════════════════════════════════

describe('buildSummary', () => {
  it('generates a summary string with key stats', () => {
    const metrics = makeMetrics();
    const months = [
      makeMonth('January', 2026, { ticketsSold: 400, sessions: 40 }),
      makeMonth('February', 2026, { ticketsSold: 400, sessions: 40 }),
      makeMonth('March', 2026, { ticketsSold: 400, sessions: 40 }),
    ];
    const result = buildSummary(metrics, months);
    expect(result).toContain('1,200 visitors');
    expect(result).toContain('120 sessions');
    expect(result).toContain('300/week');
    expect(result).toContain('50%');
  });

  it('includes growth info when 3+ full months available', () => {
    const metrics = makeMetrics();
    const months = [
      makeMonth('January', 2026, { ticketsSold: 100, sessions: 30 }),
      makeMonth('February', 2026, { ticketsSold: 200, sessions: 30 }),
      makeMonth('March', 2026, { ticketsSold: 300, sessions: 30 }),
    ];
    const result = buildSummary(metrics, months);
    expect(result).toContain('up');
  });

  it('omits growth sentence when 3 raw months but fewer than 3 full months', () => {
    const metrics = makeMetrics();
    const months = [
      makeMonth('January', 2026, { ticketsSold: 100, sessions: 30 }),
      makeMonth('February', 2026, { ticketsSold: 200, sessions: 30 }),
      makeMonth('March', 2026, { ticketsSold: 5, sessions: 1 }), // partial — will be excluded
    ];
    const result = buildSummary(metrics, months);
    // Only 2 full months, so no growth sentence should appear
    expect(result).not.toContain('Visitor volume is');
    expect(result).not.toContain('Volume is');
    expect(result).not.toContain('Volume has');
  });

  it('describes weekend-skewed demand', () => {
    const metrics = makeMetrics({ weekdayShare: 0.3, weekendShare: 0.7 });
    const result = buildSummary(metrics, []);
    expect(result).toContain('weekend-skewed');
  });
});
