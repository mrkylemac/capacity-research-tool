/**
 * Tests for Xtra Clubs client — specifically the decimal-time conversion
 * and session mapping logic. Uses mocked fetch to avoid live API calls.
 */

// We need to mock fetch before importing the module
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock the utils module to avoid side effects in sanitizeSessions
vi.mock('@/lib/utils', () => ({
  sanitizeSessions: vi.fn((sessions: unknown[]) => ({
    sessions,
    report: {
      inputCount: (sessions as unknown[]).length,
      outputCount: (sessions as unknown[]).length,
      dropped: { cancelled: 0, invalidDate: 0, zeroCapacity: 0, outsideOperatingHours: 0 },
      clamped: { ticketsExceededCapacity: 0, capacityNormalized: 0 },
    },
  })),
  logDataQuality: vi.fn(),
}));

import { fetchXtraClubsSessions } from '@/lib/xtraClient';

beforeEach(() => {
  mockFetch.mockReset();
});

function xtraResponse(schedules: unknown[]) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, schedules }),
  });
}

describe('fetchXtraClubsSessions', () => {
  const locations = [
    { siteId: 'site1', name: 'Main Sauna', operatingSince: '2025-01-01' },
  ] as const;

  it('converts decimal times to correct ISO timestamps', async () => {
    mockFetch.mockReturnValue(xtraResponse([
      { _id: 'a1', date: '2026-03-06', time: 6, capacity: 10, numReservations: 3, hidden: false, peak: false },
      { _id: 'a2', date: '2026-03-06', time: 6.5, capacity: 10, numReservations: 5, hidden: false, peak: false },
      { _id: 'a3', date: '2026-03-06', time: 18.75, capacity: 10, numReservations: 2, hidden: false, peak: false },
    ]));

    const sessions = await fetchXtraClubsSessions(
      'https://api.example.com',
      locations,
      '2026-03-06',
      '2026-03-06',
      'Test Venue',
      'Australia/Melbourne',
    );

    expect(sessions).toHaveLength(3);

    // 6.0 → 6:00 AM
    const s1 = sessions.find(s => s.id === 'a1')!;
    expect(new Date(s1.startsAt).getHours()).toBe(6);
    expect(new Date(s1.startsAt).getMinutes()).toBe(0);
    expect(s1.ticketsSold).toBe(3);

    // 6.5 → 6:30 AM
    const s2 = sessions.find(s => s.id === 'a2')!;
    expect(new Date(s2.startsAt).getHours()).toBe(6);
    expect(new Date(s2.startsAt).getMinutes()).toBe(30);

    // 18.75 → 6:45 PM
    const s3 = sessions.find(s => s.id === 'a3')!;
    expect(new Date(s3.startsAt).getHours()).toBe(18);
    expect(new Date(s3.startsAt).getMinutes()).toBe(45);
  });

  it('sets 30-minute duration for all sessions', async () => {
    mockFetch.mockReturnValue(xtraResponse([
      { _id: 'a1', date: '2026-03-06', time: 9, capacity: 10, numReservations: 1, hidden: false, peak: false },
    ]));

    const sessions = await fetchXtraClubsSessions(
      'https://api.example.com',
      locations,
      '2026-03-06',
      '2026-03-06',
      'Test',
      'Australia/Melbourne',
    );

    expect(sessions[0].durationMinutes).toBe(30);
    const start = new Date(sessions[0].startsAt).getTime();
    const end = new Date(sessions[0].endsAt).getTime();
    expect(end - start).toBe(30 * 60_000);
  });

  it('filters out hidden sessions', async () => {
    mockFetch.mockReturnValue(xtraResponse([
      { _id: 'visible', date: '2026-03-06', time: 9, capacity: 10, numReservations: 1, hidden: false, peak: false },
      { _id: 'hidden', date: '2026-03-06', time: 10, capacity: 10, numReservations: 0, hidden: true, peak: false },
    ]));

    const sessions = await fetchXtraClubsSessions(
      'https://api.example.com',
      locations,
      '2026-03-06',
      '2026-03-06',
      'Test',
      'Australia/Melbourne',
    );

    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('visible');
  });

  it('uses special session title when present', async () => {
    mockFetch.mockReturnValue(xtraResponse([
      {
        _id: 'special',
        date: '2026-03-06',
        time: 9,
        capacity: 10,
        numReservations: 1,
        hidden: false,
        peak: false,
        specialSession: { identifier: 'sp1', title: 'Cold Plunge', description: 'Icy!' },
      },
    ]));

    const sessions = await fetchXtraClubsSessions(
      'https://api.example.com',
      locations,
      '2026-03-06',
      '2026-03-06',
      'Test',
      'Australia/Melbourne',
    );

    expect(sessions[0].sessionName).toBe('Cold Plunge');
  });

  it('defaults to "Sauna Session" when no special session', async () => {
    mockFetch.mockReturnValue(xtraResponse([
      { _id: 'normal', date: '2026-03-06', time: 9, capacity: 10, numReservations: 1, hidden: false, peak: false },
    ]));

    const sessions = await fetchXtraClubsSessions(
      'https://api.example.com',
      locations,
      '2026-03-06',
      '2026-03-06',
      'Test',
      'Australia/Melbourne',
    );

    expect(sessions[0].sessionName).toBe('Sauna Session');
  });

  it('clamps negative reservations to 0', async () => {
    mockFetch.mockReturnValue(xtraResponse([
      { _id: 'neg', date: '2026-03-06', time: 9, capacity: 10, numReservations: -1, hidden: false, peak: false },
    ]));

    const sessions = await fetchXtraClubsSessions(
      'https://api.example.com',
      locations,
      '2026-03-06',
      '2026-03-06',
      'Test',
      'Australia/Melbourne',
    );

    expect(sessions[0].ticketsSold).toBe(0);
  });

  it('fetches multiple days for date range', async () => {
    mockFetch.mockReturnValue(xtraResponse([
      { _id: 'session', date: '2026-03-06', time: 9, capacity: 10, numReservations: 1, hidden: false, peak: false },
    ]));

    await fetchXtraClubsSessions(
      'https://api.example.com',
      locations,
      '2026-03-06',
      '2026-03-08',
      'Test',
      'Australia/Melbourne',
    );

    // Should fetch 3 days: Mar 6, 7, 8
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('respects location operatingSince date', async () => {
    mockFetch.mockReturnValue(xtraResponse([]));

    const futureLocations = [
      { siteId: 'site1', name: 'New Sauna', operatingSince: '2026-03-08' },
    ] as const;

    await fetchXtraClubsSessions(
      'https://api.example.com',
      futureLocations,
      '2026-03-06',
      '2026-03-09',
      'Test',
      'Australia/Melbourne',
    );

    // Only Mar 8 and Mar 9 — skips Mar 6 and 7 (before operatingSince)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws on API error', async () => {
    mockFetch.mockReturnValue(Promise.resolve({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }));

    await expect(
      fetchXtraClubsSessions(
        'https://api.example.com',
        locations,
        '2026-03-06',
        '2026-03-06',
        'Test',
        'Australia/Melbourne',
      ),
    ).rejects.toThrow('Xtra Clubs API: 500');
  });
});
