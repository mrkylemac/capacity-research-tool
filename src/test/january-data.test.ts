import { describe, it, expect } from 'vitest';
import { calculateMonthlyData, calculateMetrics } from '../lib/metricsCalculator';
import type { MomenceSession } from '../types/momence';

// Mock January 2025 sessions for testing
const mockJanuarySessions: MomenceSession[] = [
  {
    id: '1',
    sessionName: 'Sauna & Ice',
    startsAt: '2025-01-05T08:00:00Z',
    endsAt: '2025-01-05T09:00:00Z',
    durationMinutes: 60,
    capacity: 12,
    ticketsSold: 10,
    fixedTicketPrice: 35,
    location: 'Test Venue',
    inPerson: true,
  },
  {
    id: '2',
    sessionName: 'Sauna & Ice',
    startsAt: '2025-01-10T10:00:00Z',
    endsAt: '2025-01-10T11:00:00Z',
    durationMinutes: 60,
    capacity: 12,
    ticketsSold: 8,
    fixedTicketPrice: 35,
    location: 'Test Venue',
    inPerson: true,
  },
  {
    id: '3',
    sessionName: 'Sauna & Ice',
    startsAt: '2025-01-15T14:00:00Z',
    endsAt: '2025-01-15T15:00:00Z',
    durationMinutes: 60,
    capacity: 12,
    ticketsSold: 12, // Full capacity
    fixedTicketPrice: 35,
    location: 'Test Venue',
    inPerson: true,
  },
  {
    id: '4',
    sessionName: 'Sauna & Ice',
    startsAt: '2025-01-20T16:00:00Z',
    endsAt: '2025-01-20T17:00:00Z',
    durationMinutes: 60,
    capacity: 12,
    ticketsSold: 6,
    fixedTicketPrice: 35,
    location: 'Test Venue',
    inPerson: true,
  },
];

describe('January Data Calculations', () => {
  it('calculates correct monthly totals for January', () => {
    const monthlyData = calculateMonthlyData(mockJanuarySessions);
    
    expect(monthlyData).toHaveLength(1);
    
    const january = monthlyData[0];
    expect(january.month).toBe('January');
    expect(january.year).toBe(2025);
    expect(january.sessions).toBe(4);
    expect(january.ticketsSold).toBe(10 + 8 + 12 + 6); // 36
    expect(january.capacity).toBe(12 * 4); // 48
    expect(january.utilisation).toBeCloseTo((36 / 48) * 100, 1); // 75%
  });

  it('calculates correct overall metrics', () => {
    const metrics = calculateMetrics(
      mockJanuarySessions,
      '2025-01-01T00:00:00Z',
      '2025-01-31T23:59:59Z'
    );

    expect(metrics.totalSessions).toBe(4);
    expect(metrics.totalTicketsSold).toBe(36);
    expect(metrics.totalCapacity).toBe(48);
    expect(metrics.avgUtilisation).toBeCloseTo(75, 1);
  });

  it('filters sessions correctly by date range', () => {
    // Add a February session to test filtering
    const mixedSessions: MomenceSession[] = [
      ...mockJanuarySessions,
      {
        id: '5',
        sessionName: 'Sauna & Ice',
        startsAt: '2025-02-05T08:00:00Z',
        endsAt: '2025-02-05T09:00:00Z',
        durationMinutes: 60,
        capacity: 12,
        ticketsSold: 5,
        fixedTicketPrice: 35,
        location: 'Test Venue',
        inPerson: true,
      },
    ];

    const monthlyData = calculateMonthlyData(mixedSessions);
    
    expect(monthlyData).toHaveLength(2);
    
    const january = monthlyData.find(m => m.month === 'January');
    const february = monthlyData.find(m => m.month === 'February');
    
    expect(january?.sessions).toBe(4);
    expect(january?.ticketsSold).toBe(36);
    
    expect(february?.sessions).toBe(1);
    expect(february?.ticketsSold).toBe(5);
  });
});
