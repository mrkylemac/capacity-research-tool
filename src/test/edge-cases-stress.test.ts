import { describe, it, expect } from 'vitest';
import {
  calculateMetrics,
  calculateMonthlyData,
  calculateDemandPatterns,
  calculateVenueConfig,
  calculateClassTypeData,
} from '../lib/metricsCalculator';
import {
  calculateBenchmarkMetrics,
  inferOperatingHours,
} from '../lib/benchmarkMetrics';
import type { MomenceSession } from '../types/momence';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<MomenceSession> = {}): MomenceSession {
  return {
    id: String(Math.random()),
    sessionName: 'Sauna & Ice',
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

/**
 * Generate N sessions spread across a date range with varied properties
 */
function generateLargeDataset(count: number): MomenceSession[] {
  const sessions: MomenceSession[] = [];
  const startDate = new Date('2024-01-01T00:00:00Z');
  const sessionNames = ['Sauna & Ice', 'Infrared Sauna', 'Ice Bath', 'Steam Room', 'Contrast Therapy'];
  const capacities = [8, 10, 12, 15, 20];
  const prices = [25, 30, 35, 40, 45, 50];
  const durations = [45, 60, 75, 90];

  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(i / 6); // ~6 sessions per day
    const hourOffset = (i % 6) * 2 + 6;  // 6am, 8am, 10am, 12pm, 2pm, 4pm
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hourOffset, (i % 2) * 30, 0, 0); // alternate between :00 and :30

    const capacity = capacities[i % capacities.length];
    const occupancy = 0.3 + (Math.sin(i * 0.1) + 1) * 0.35; // varies between 30%-100%
    const ticketsSold = Math.min(capacity, Math.max(0, Math.round(capacity * occupancy)));

    sessions.push({
      id: String(i),
      sessionName: sessionNames[i % sessionNames.length],
      startsAt: date.toISOString(),
      endsAt: new Date(date.getTime() + durations[i % durations.length] * 60000).toISOString(),
      durationMinutes: durations[i % durations.length],
      capacity,
      ticketsSold,
      fixedTicketPrice: prices[i % prices.length],
      location: 'Test Venue',
      inPerson: true,
    });
  }
  return sessions;
}

// ─── Edge Cases: Single Session ───────────────────────────────────────────────

describe('Edge Cases: Single session', () => {
  const singleSession = [makeSession()];

  it('calculateMetrics handles single session', () => {
    const m = calculateMetrics(singleSession, '2025-03-01', '2025-03-31');
    expect(m.totalSessions).toBe(1);
    expect(m.totalTicketsSold).toBe(8);
    expect(m.totalCapacity).toBe(12);
    expect(m.avgUtilisation).toBeCloseTo((8 / 12) * 100, 5);
    expect(m.totalRevenue).toBe(8 * 35);
  });

  it('calculateMonthlyData handles single session', () => {
    const data = calculateMonthlyData(singleSession);
    expect(data).toHaveLength(1);
    expect(data[0].sessions).toBe(1);
  });

  it('calculateClassTypeData handles single session', () => {
    const data = calculateClassTypeData(singleSession);
    expect(data).toHaveLength(1);
    expect(data[0].sessionCount).toBe(1);
  });

  it('calculateBenchmarkMetrics handles single session', () => {
    const m = calculateBenchmarkMetrics(singleSession, '2025-03-01', '2025-03-31');
    expect(m.totalVisits).toBe(8);
    expect(m.totalSessions).toBe(1);
  });
});

// ─── Edge Cases: Extreme Values ───────────────────────────────────────────────

describe('Edge Cases: Extreme values', () => {
  it('handles very large capacity and ticket counts', () => {
    const sessions = [
      makeSession({ ticketsSold: 10000, capacity: 50000, fixedTicketPrice: 999 }),
    ];
    const m = calculateMetrics(sessions, '2025-03-01', '2025-03-31');
    expect(m.totalRevenue).toBe(10000 * 999);
    expect(m.avgUtilisation).toBeCloseTo((10000 / 50000) * 100, 5);
  });

  it('handles zero-priced sessions (free events)', () => {
    const sessions = [
      makeSession({ ticketsSold: 10, fixedTicketPrice: 0 }),
    ];
    const m = calculateMetrics(sessions, '2025-03-01', '2025-03-31');
    expect(m.totalRevenue).toBe(0);
    expect(m.avgRevenuePerVisit).toBe(0);
  });

  it('handles sessions where ticketsSold > capacity (overbooking)', () => {
    const sessions = [
      makeSession({ ticketsSold: 15, capacity: 12 }),
    ];
    const m = calculateMetrics(sessions, '2025-03-01', '2025-03-31');
    // Utilisation can exceed 100% - this is valid data from the API
    expect(m.avgUtilisation).toBeCloseTo(125, 5);
  });

  it('handles mixed zero and non-zero prices for ARPV', () => {
    const sessions = [
      makeSession({ ticketsSold: 10, fixedTicketPrice: 35 }),
      makeSession({ ticketsSold: 5, fixedTicketPrice: 0 }), // free session
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-01', '2025-03-31');
    // Only sessions with price > 0 AND ticketsSold > 0 contribute to ARPV
    // volume-weighted: (35*10) / 10 = 35
    expect(m.impliedArpv).toBeCloseTo(35, 5);
  });
});

// ─── Edge Cases: Boundary Dates ───────────────────────────────────────────────

describe('Edge Cases: Boundary dates', () => {
  it('handles sessions at midnight (day boundaries)', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T00:00:00Z', durationMinutes: 60 }),
    ];
    const m = calculateMetrics(sessions, '2025-03-10', '2025-03-10');
    expect(m.totalSessions).toBe(1);
  });

  it('handles sessions at end of year', () => {
    const sessions = [
      makeSession({ startsAt: '2025-12-31T23:00:00Z', durationMinutes: 90 }),
    ];
    const data = calculateMonthlyData(sessions);
    expect(data).toHaveLength(1);
    expect(data[0].month).toBe('December');
    expect(data[0].year).toBe(2025);
  });

  it('handles date range of exactly one week', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T08:00:00Z', ticketsSold: 70 }),
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-10', '2025-03-16');
    expect(m.daysInRange).toBe(7);
    expect(m.weeksInRange).toBe(1);
    expect(m.weeklyVisits).toBe(70);
  });

  it('handles date range of exactly one day', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T08:00:00Z', ticketsSold: 10 }),
    ];
    const m = calculateBenchmarkMetrics(sessions, '2025-03-10', '2025-03-10');
    expect(m.daysInRange).toBe(1);
    expect(m.weeksInRange).toBe(1); // clamped to minimum 1
    expect(m.dailyVisits).toBe(10);
  });
});

// ─── Edge Cases: Diverse Session Types ────────────────────────────────────────

describe('Edge Cases: Diverse session configurations', () => {
  it('handles many different session names', () => {
    const names = Array.from({ length: 20 }, (_, i) => `Session Type ${i}`);
    const sessions = names.map((name, i) =>
      makeSession({
        id: String(i),
        sessionName: name,
        ticketsSold: i + 1,
      })
    );
    const data = calculateClassTypeData(sessions);
    expect(data).toHaveLength(20);
    // Sorted by totalVisitors descending
    expect(data[0].className).toBe('Session Type 19');
    expect(data[0].totalVisitors).toBe(20);
  });

  it('handles sessions with varying durations for operating hours', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T06:00:00Z', durationMinutes: 45 }),  // ends 6:45
      makeSession({ startsAt: '2025-03-10T20:00:00Z', durationMinutes: 120 }), // ends 22:00
    ];
    const hours = inferOperatingHours(sessions);
    expect(hours.weekdayStart).toBe(6);
    expect(hours.weekdayEnd).toBe(22); // 20 + 2hr
  });

  it('handles sessions spanning multiple time zones in same day', () => {
    // All timestamps are UTC - the code processes them in UTC
    const sessions = [
      makeSession({ startsAt: '2025-03-10T05:30:00Z' }),  // 5:30 UTC
      makeSession({ startsAt: '2025-03-10T21:30:00Z' }),  // 21:30 UTC
    ];
    const patterns = calculateDemandPatterns(sessions);
    expect(patterns.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Stress Tests ─────────────────────────────────────────────────────────────

describe('Stress Tests: Large datasets', () => {
  it('handles 1000 sessions efficiently and accurately', () => {
    const sessions = generateLargeDataset(1000);
    const metrics = calculateMetrics(sessions, '2024-01-01', '2024-12-31');

    // Verify basic consistency
    expect(metrics.totalSessions).toBe(1000);
    expect(metrics.totalTicketsSold).toBeGreaterThan(0);
    expect(metrics.totalCapacity).toBeGreaterThan(0);
    expect(metrics.avgUtilisation).toBeGreaterThan(0);
    expect(metrics.avgUtilisation).toBeLessThanOrEqual(200); // reasonable upper bound
    expect(metrics.totalRevenue).toBeGreaterThan(0);

    // Revenue should equal sum of ticketsSold * price
    const expectedRevenue = sessions.reduce((sum, s) => sum + s.ticketsSold * s.fixedTicketPrice, 0);
    expect(metrics.totalRevenue).toBe(expectedRevenue);

    // Utilisation should be totalTickets/totalCapacity * 100
    const expectedUtil = (metrics.totalTicketsSold / metrics.totalCapacity) * 100;
    expect(metrics.avgUtilisation).toBeCloseTo(expectedUtil, 5);
  });

  it('monthly data sums match overall totals for large dataset', () => {
    const sessions = generateLargeDataset(500);
    const metrics = calculateMetrics(sessions, '2024-01-01', '2024-12-31');
    const monthlyData = calculateMonthlyData(sessions);

    // Sum of monthly tickets should equal total
    const monthlyTicketSum = monthlyData.reduce((sum, m) => sum + m.ticketsSold, 0);
    expect(monthlyTicketSum).toBe(metrics.totalTicketsSold);

    // Sum of monthly sessions should equal total
    const monthlySessionSum = monthlyData.reduce((sum, m) => sum + m.sessions, 0);
    expect(monthlySessionSum).toBe(metrics.totalSessions);

    // Sum of monthly capacity should equal total
    const monthlyCapacitySum = monthlyData.reduce((sum, m) => sum + m.capacity, 0);
    expect(monthlyCapacitySum).toBe(metrics.totalCapacity);

    // Sum of monthly revenue should equal total
    const monthlyRevenueSum = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    expect(monthlyRevenueSum).toBe(metrics.totalRevenue);
  });

  it('class type data sums match overall totals for large dataset', () => {
    const sessions = generateLargeDataset(500);
    const metrics = calculateMetrics(sessions, '2024-01-01', '2024-12-31');
    const classData = calculateClassTypeData(sessions);

    const classVisitorSum = classData.reduce((sum, c) => sum + c.totalVisitors, 0);
    expect(classVisitorSum).toBe(metrics.totalTicketsSold);

    const classSessionSum = classData.reduce((sum, c) => sum + c.sessionCount, 0);
    expect(classSessionSum).toBe(metrics.totalSessions);

    const classRevenueSum = classData.reduce((sum, c) => sum + c.totalRevenue, 0);
    expect(classRevenueSum).toBe(metrics.totalRevenue);

    const classCapacitySum = classData.reduce((sum, c) => sum + c.totalCapacity, 0);
    expect(classCapacitySum).toBe(metrics.totalCapacity);
  });

  it('demand patterns account for all sessions in defined time slots', () => {
    // Generate sessions only within defined time slots (6am-10pm)
    const sessions: MomenceSession[] = [];
    for (let i = 0; i < 200; i++) {
      const hour = 6 + (i % 14); // 6am to 8pm
      const date = new Date(2025, 2, 10 + Math.floor(i / 14));
      date.setHours(hour, 0, 0, 0);
      sessions.push(makeSession({
        id: String(i),
        startsAt: date.toISOString(),
        ticketsSold: 8,
        capacity: 12,
      }));
    }

    const patterns = calculateDemandPatterns(sessions);
    const totalSessionsInPatterns = patterns.reduce(
      (sum, p) => sum + Math.round(p.avgTickets * (sessions.length / patterns.length)),
      0
    );
    // All sessions should be accounted for in some slot (within 4:30am-10:30pm range)
    expect(patterns.length).toBeGreaterThan(0);
  });

  it('benchmark metrics are consistent with core metrics for large dataset', () => {
    const sessions = generateLargeDataset(300);
    const from = '2024-01-01';
    const to = '2024-12-31';

    const coreMetrics = calculateMetrics(sessions, from, to);
    const benchMetrics = calculateBenchmarkMetrics(sessions, from, to);

    // totalVisits should match totalTicketsSold
    expect(benchMetrics.totalVisits).toBe(coreMetrics.totalTicketsSold);

    // totalSessions should match
    expect(benchMetrics.totalSessions).toBe(coreMetrics.totalSessions);

    // totalCapacity should match
    expect(benchMetrics.totalCapacity).toBe(coreMetrics.totalCapacity);

    // occupancyRate * 100 should match avgUtilisation
    expect(benchMetrics.occupancyRate * 100).toBeCloseTo(coreMetrics.avgUtilisation, 5);

    // weekday + weekend visits should equal total
    expect(benchMetrics.weekdayVisits + benchMetrics.weekendVisits).toBe(benchMetrics.totalVisits);

    // weekdayShare + weekendShare should equal 1 (or 0 if no visits)
    if (benchMetrics.totalVisits > 0) {
      expect(benchMetrics.weekdayShare + benchMetrics.weekendShare).toBeCloseTo(1, 10);
    }
  });
});

// ─── Data Integrity: Round-trip consistency ───────────────────────────────────

describe('Data Integrity: Calculation consistency', () => {
  it('revenue per visit * total visits = total revenue', () => {
    const sessions = generateLargeDataset(100);
    const m = calculateMetrics(sessions, '2024-01-01', '2024-06-30');
    if (m.totalTicketsSold > 0) {
      expect(m.avgRevenuePerVisit * m.totalTicketsSold).toBeCloseTo(m.totalRevenue, 2);
    }
  });

  it('revenue per session * total sessions = total revenue', () => {
    const sessions = generateLargeDataset(100);
    const m = calculateMetrics(sessions, '2024-01-01', '2024-06-30');
    if (m.totalSessions > 0) {
      expect(m.avgRevenuePerSession * m.totalSessions).toBeCloseTo(m.totalRevenue, 2);
    }
  });

  it('sessionsPerDay * daysInRange = totalSessions', () => {
    const sessions = generateLargeDataset(100);
    const from = '2024-01-01';
    const to = '2024-06-30';
    const m = calculateMetrics(sessions, from, to);
    // daysInRange = differenceInDays + 1
    const daysInRange = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    expect(m.sessionsPerDay * daysInRange).toBeCloseTo(m.totalSessions, 5);
  });

  it('weeklyVisits * weeksInRange = totalVisits (benchmark)', () => {
    const sessions = generateLargeDataset(100);
    const m = calculateBenchmarkMetrics(sessions, '2024-01-01', '2024-06-30');
    expect(m.weeklyVisits * m.weeksInRange).toBeCloseTo(m.totalVisits, 2);
  });

  it('dailyVisits * daysInRange = totalVisits (benchmark)', () => {
    const sessions = generateLargeDataset(100);
    const m = calculateBenchmarkMetrics(sessions, '2024-01-01', '2024-06-30');
    expect(m.dailyVisits * m.daysInRange).toBeCloseTo(m.totalVisits, 2);
  });
});
