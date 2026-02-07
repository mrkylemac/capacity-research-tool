import { describe, it, expect } from 'vitest';
import {
  calculateMetrics,
  calculateMonthlyData,
  calculateDemandPatterns,
  calculateVenueConfig,
  calculateClassTypeData,
} from '../lib/metricsCalculator';
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
    location: 'Aalto Adelaide',
    inPerson: true,
    ...overrides,
  };
}

function makeSessions(count: number, overrides: Partial<MomenceSession> = {}): MomenceSession[] {
  return Array.from({ length: count }, (_, i) =>
    makeSession({
      id: String(i),
      startsAt: `2025-03-${String(10 + i).padStart(2, '0')}T08:00:00Z`,
      endsAt: `2025-03-${String(10 + i).padStart(2, '0')}T09:00:00Z`,
      ...overrides,
    })
  );
}

// ─── calculateMetrics ─────────────────────────────────────────────────────────

describe('calculateMetrics', () => {
  it('returns zeroed metrics for empty sessions', () => {
    const m = calculateMetrics([], '2025-01-01', '2025-01-31');
    expect(m.totalSessions).toBe(0);
    expect(m.totalTicketsSold).toBe(0);
    expect(m.totalCapacity).toBe(0);
    expect(m.avgUtilisation).toBe(0);
    expect(m.totalRevenue).toBe(0);
    expect(m.avgRevenuePerVisit).toBe(0);
    expect(m.avgRevenuePerSession).toBe(0);
    expect(m.sessionsPerDay).toBe(0);
    expect(m.sessionsPerWeek).toBe(0);
    expect(m.operatingSince).toBe('-');
  });

  it('correctly aggregates basic totals', () => {
    const sessions = [
      makeSession({ ticketsSold: 10, capacity: 12, fixedTicketPrice: 35 }),
      makeSession({ ticketsSold: 6, capacity: 12, fixedTicketPrice: 40 }),
    ];
    const m = calculateMetrics(sessions, '2025-03-01', '2025-03-31');

    expect(m.totalSessions).toBe(2);
    expect(m.totalTicketsSold).toBe(16);
    expect(m.totalCapacity).toBe(24);
  });

  it('calculates utilisation as (ticketsSold / capacity) * 100', () => {
    const sessions = [
      makeSession({ ticketsSold: 9, capacity: 12 }),
      makeSession({ ticketsSold: 3, capacity: 12 }),
    ];
    const m = calculateMetrics(sessions, '2025-03-01', '2025-03-31');
    // (9+3) / (12+12) * 100 = 50%
    expect(m.avgUtilisation).toBeCloseTo(50, 5);
  });

  it('calculates revenue as sum of (ticketsSold * fixedTicketPrice) per session', () => {
    const sessions = [
      makeSession({ ticketsSold: 10, fixedTicketPrice: 35 }),
      makeSession({ ticketsSold: 5, fixedTicketPrice: 50 }),
    ];
    const m = calculateMetrics(sessions, '2025-03-01', '2025-03-31');
    expect(m.totalRevenue).toBe(10 * 35 + 5 * 50); // 350 + 250 = 600
  });

  it('calculates avgRevenuePerVisit correctly', () => {
    const sessions = [
      makeSession({ ticketsSold: 10, fixedTicketPrice: 30 }),
      makeSession({ ticketsSold: 10, fixedTicketPrice: 50 }),
    ];
    const m = calculateMetrics(sessions, '2025-03-01', '2025-03-31');
    // Revenue = 300 + 500 = 800, visits = 20 → 800/20 = 40
    expect(m.avgRevenuePerVisit).toBeCloseTo(40, 5);
  });

  it('calculates avgRevenuePerSession correctly', () => {
    const sessions = [
      makeSession({ ticketsSold: 10, fixedTicketPrice: 30 }),
      makeSession({ ticketsSold: 10, fixedTicketPrice: 50 }),
    ];
    const m = calculateMetrics(sessions, '2025-03-01', '2025-03-31');
    // Revenue = 800, sessions = 2 → 400
    expect(m.avgRevenuePerSession).toBeCloseTo(400, 5);
  });

  it('calculates sessionsPerDay based on date range span', () => {
    // 2 sessions over a 7-day range (Mar 1-7 inclusive)
    const sessions = [
      makeSession({ startsAt: '2025-03-02T08:00:00Z' }),
      makeSession({ startsAt: '2025-03-05T08:00:00Z' }),
    ];
    const m = calculateMetrics(sessions, '2025-03-01', '2025-03-07');
    // 7 days (inclusive), 2 sessions → 2/7 ≈ 0.2857
    expect(m.sessionsPerDay).toBeCloseTo(2 / 7, 4);
    expect(m.sessionsPerWeek).toBeCloseTo(2, 4);
  });

  it('handles zero-capacity sessions without division by zero', () => {
    const sessions = [makeSession({ capacity: 0, ticketsSold: 0 })];
    const m = calculateMetrics(sessions, '2025-03-01', '2025-03-31');
    expect(m.avgUtilisation).toBe(0);
  });

  it('handles zero-ticket sessions without division by zero', () => {
    const sessions = [makeSession({ ticketsSold: 0, fixedTicketPrice: 35 })];
    const m = calculateMetrics(sessions, '2025-03-01', '2025-03-31');
    expect(m.avgRevenuePerVisit).toBe(0);
    expect(m.totalRevenue).toBe(0);
  });

  it('operatingSince returns the earliest session month', () => {
    const sessions = [
      makeSession({ startsAt: '2025-06-15T08:00:00Z' }),
      makeSession({ startsAt: '2025-01-10T08:00:00Z' }),
      makeSession({ startsAt: '2025-03-20T08:00:00Z' }),
    ];
    const m = calculateMetrics(sessions, '2025-01-01', '2025-12-31');
    expect(m.operatingSince).toBe('January 2025');
  });

  it('handles single-day date range', () => {
    const sessions = [makeSession({ startsAt: '2025-03-15T10:00:00Z' })];
    const m = calculateMetrics(sessions, '2025-03-15', '2025-03-15');
    // 1 day range, 1 session → sessionsPerDay = 1
    expect(m.sessionsPerDay).toBe(1);
    expect(m.sessionsPerWeek).toBe(7);
  });
});

// ─── calculateMonthlyData ─────────────────────────────────────────────────────

describe('calculateMonthlyData', () => {
  it('returns empty array for no sessions', () => {
    expect(calculateMonthlyData([])).toEqual([]);
  });

  it('groups sessions by month correctly', () => {
    const sessions = [
      makeSession({ startsAt: '2025-01-05T08:00:00Z', ticketsSold: 10 }),
      makeSession({ startsAt: '2025-01-15T08:00:00Z', ticketsSold: 8 }),
      makeSession({ startsAt: '2025-02-10T08:00:00Z', ticketsSold: 6 }),
    ];
    const data = calculateMonthlyData(sessions);

    expect(data).toHaveLength(2);
    expect(data[0].month).toBe('January');
    expect(data[0].sessions).toBe(2);
    expect(data[0].ticketsSold).toBe(18);
    expect(data[1].month).toBe('February');
    expect(data[1].sessions).toBe(1);
    expect(data[1].ticketsSold).toBe(6);
  });

  it('sorts months chronologically', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T08:00:00Z' }),
      makeSession({ startsAt: '2025-01-05T08:00:00Z' }),
      makeSession({ startsAt: '2025-02-15T08:00:00Z' }),
    ];
    const data = calculateMonthlyData(sessions);
    expect(data.map(d => d.month)).toEqual(['January', 'February', 'March']);
  });

  it('handles cross-year data and sorts by year then month', () => {
    const sessions = [
      makeSession({ startsAt: '2024-12-10T08:00:00Z' }),
      makeSession({ startsAt: '2025-01-05T08:00:00Z' }),
      makeSession({ startsAt: '2025-02-15T08:00:00Z' }),
    ];
    const data = calculateMonthlyData(sessions);
    expect(data[0].year).toBe(2024);
    expect(data[0].month).toBe('December');
    expect(data[1].year).toBe(2025);
    expect(data[1].month).toBe('January');
  });

  it('calculates monthly utilisation correctly', () => {
    const sessions = [
      makeSession({ startsAt: '2025-01-05T08:00:00Z', ticketsSold: 6, capacity: 12 }),
      makeSession({ startsAt: '2025-01-15T08:00:00Z', ticketsSold: 12, capacity: 12 }),
    ];
    const data = calculateMonthlyData(sessions);
    // (6 + 12) / (12 + 12) * 100 = 75%
    expect(data[0].utilisation).toBeCloseTo(75, 5);
  });

  it('calculates monthly revenue correctly', () => {
    const sessions = [
      makeSession({ startsAt: '2025-01-05T08:00:00Z', ticketsSold: 10, fixedTicketPrice: 35 }),
      makeSession({ startsAt: '2025-01-15T08:00:00Z', ticketsSold: 5, fixedTicketPrice: 50 }),
    ];
    const data = calculateMonthlyData(sessions);
    expect(data[0].revenue).toBe(10 * 35 + 5 * 50);
  });
});

// ─── calculateDemandPatterns ──────────────────────────────────────────────────

describe('calculateDemandPatterns', () => {
  it('returns empty array for no sessions', () => {
    expect(calculateDemandPatterns([])).toEqual([]);
  });

  it('assigns sessions to correct time slots', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T05:00:00Z', ticketsSold: 10, capacity: 12 }), // 4:30-6:30am slot
      makeSession({ startsAt: '2025-03-10T07:00:00Z', ticketsSold: 8, capacity: 12 }),  // 6:30-8:30am slot
    ];
    const data = calculateDemandPatterns(sessions);

    const earlySlot = data.find(d => d.slot === '4:30 – 6:30am');
    const morningSlot = data.find(d => d.slot === '6:30 – 8:30am');

    expect(earlySlot).toBeDefined();
    expect(earlySlot!.avgTickets).toBeCloseTo(10, 1);
    expect(morningSlot).toBeDefined();
    expect(morningSlot!.avgTickets).toBeCloseTo(8, 1);
  });

  it('averages multiple sessions in the same time slot', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T07:00:00Z', ticketsSold: 10, capacity: 12 }),
      makeSession({ startsAt: '2025-03-11T07:30:00Z', ticketsSold: 6, capacity: 12 }),
    ];
    const data = calculateDemandPatterns(sessions);
    const slot = data.find(d => d.slot === '6:30 – 8:30am');

    expect(slot).toBeDefined();
    expect(slot!.avgTickets).toBeCloseTo(8, 1); // (10+6)/2
    expect(slot!.capacity).toBe(12); // round((12+12)/2)
  });

  it('assigns correct utilisation bands', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T07:00:00Z', ticketsSold: 10, capacity: 12 }), // 83% → High
      makeSession({ startsAt: '2025-03-10T09:00:00Z', ticketsSold: 6, capacity: 12 }),  // 50% → Medium
      makeSession({ startsAt: '2025-03-10T15:00:00Z', ticketsSold: 2, capacity: 12 }),  // 17% → Low
    ];
    const data = calculateDemandPatterns(sessions);

    const morning = data.find(d => d.slot === '6:30 – 8:30am');
    const midMorning = data.find(d => d.slot === '8:30 – 10:30am');
    const afternoon = data.find(d => d.slot === '2:30 – 4:30pm');

    expect(morning!.utilisationBand).toBe('High');
    expect(midMorning!.utilisationBand).toBe('Medium');
    expect(afternoon!.utilisationBand).toBe('Low');
  });

  it('skips time slots with no sessions', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T07:00:00Z' }),
    ];
    const data = calculateDemandPatterns(sessions);
    expect(data).toHaveLength(1);
    expect(data[0].slot).toBe('6:30 – 8:30am');
  });

  it('handles sessions at slot boundaries', () => {
    // Exactly at 6:30 (6.5 hours) should go into 6:30-8:30 slot
    const sessions = [
      makeSession({ startsAt: '2025-03-10T06:30:00Z', ticketsSold: 10 }),
    ];
    const data = calculateDemandPatterns(sessions);
    const slot = data.find(d => d.slot === '6:30 – 8:30am');
    expect(slot).toBeDefined();
    expect(slot!.avgTickets).toBeCloseTo(10, 1);
  });

  it('excludes sessions outside all defined time slots', () => {
    // 3am is before the earliest slot (4:30am)
    const sessions = [
      makeSession({ startsAt: '2025-03-10T03:00:00Z' }),
    ];
    const data = calculateDemandPatterns(sessions);
    expect(data).toHaveLength(0);
  });
});

// ─── calculateVenueConfig ─────────────────────────────────────────────────────

describe('calculateVenueConfig', () => {
  it('returns defaults for empty sessions', () => {
    const config = calculateVenueConfig([], '2025-01-01', '2025-01-31');
    expect(config.venueName).toBe('-');
    expect(config.sessionsPerDay).toBe(0);
  });

  it('detects most common values', () => {
    const sessions = [
      makeSession({ sessionName: 'Sauna & Ice', capacity: 12, fixedTicketPrice: 35, durationMinutes: 60, location: 'Aalto' }),
      makeSession({ sessionName: 'Sauna & Ice', capacity: 12, fixedTicketPrice: 35, durationMinutes: 60, location: 'Aalto' }),
      makeSession({ sessionName: 'Infrared', capacity: 8, fixedTicketPrice: 45, durationMinutes: 90, location: 'Sol' }),
    ];
    const config = calculateVenueConfig(sessions, '2025-03-01', '2025-03-31');

    expect(config.sessionType).toBe('Sauna & Ice');
    expect(config.capacity).toBe(12);
    expect(config.price).toBe(35);
    expect(config.duration).toBe(60);
    expect(config.venueName).toBe('Aalto');
  });

  it('calculates sessionsPerDay as sessions / daysInRange', () => {
    const sessions = makeSessions(7); // 7 sessions
    const config = calculateVenueConfig(sessions, '2025-03-01', '2025-03-31');
    // 31 days, 7 sessions → 7/31 ≈ 0.2
    expect(config.sessionsPerDay).toBeCloseTo(0.2, 0);
  });

  it('calculates operating hours using session durations', () => {
    const sessions = [
      makeSession({ startsAt: '2025-03-10T06:30:00Z', durationMinutes: 60 }), // ends 7:30
      makeSession({ startsAt: '2025-03-10T20:00:00Z', durationMinutes: 90 }), // ends 21:30
    ];
    const config = calculateVenueConfig(sessions, '2025-03-01', '2025-03-31');
    // Should show 6:30am – 9:30pm (using session end times)
    expect(config.operatingHours).toContain('6:30');
    expect(config.operatingHours).toContain('9:30');
  });
});

// ─── calculateClassTypeData ───────────────────────────────────────────────────

describe('calculateClassTypeData', () => {
  it('returns empty array for no sessions', () => {
    expect(calculateClassTypeData([])).toEqual([]);
  });

  it('groups by session name and calculates correctly', () => {
    const sessions = [
      makeSession({ sessionName: 'Sauna & Ice', ticketsSold: 10, capacity: 12, fixedTicketPrice: 35 }),
      makeSession({ sessionName: 'Sauna & Ice', ticketsSold: 8, capacity: 12, fixedTicketPrice: 35 }),
      makeSession({ sessionName: 'Infrared', ticketsSold: 6, capacity: 8, fixedTicketPrice: 45 }),
    ];
    const data = calculateClassTypeData(sessions);

    expect(data).toHaveLength(2);

    // Sorted by totalVisitors descending
    const sauna = data[0];
    expect(sauna.className).toBe('Sauna & Ice');
    expect(sauna.sessionCount).toBe(2);
    expect(sauna.totalVisitors).toBe(18);
    expect(sauna.avgVisitorsPerSession).toBeCloseTo(9, 5);
    expect(sauna.totalCapacity).toBe(24);
    expect(sauna.avgUtilisation).toBeCloseTo(75, 5);
    expect(sauna.totalRevenue).toBe(18 * 35);

    const infrared = data[1];
    expect(infrared.className).toBe('Infrared');
    expect(infrared.sessionCount).toBe(1);
    expect(infrared.totalVisitors).toBe(6);
    expect(infrared.totalRevenue).toBe(6 * 45);
  });

  it('sorts by total visitors descending', () => {
    const sessions = [
      makeSession({ sessionName: 'A', ticketsSold: 5 }),
      makeSession({ sessionName: 'B', ticketsSold: 20 }),
      makeSession({ sessionName: 'C', ticketsSold: 10 }),
    ];
    const data = calculateClassTypeData(sessions);
    expect(data.map(d => d.className)).toEqual(['B', 'C', 'A']);
  });

  it('handles sessions with no name as "Unknown"', () => {
    const sessions = [makeSession({ sessionName: '' })];
    const data = calculateClassTypeData(sessions);
    expect(data[0].className).toBe('Unknown');
  });
});
