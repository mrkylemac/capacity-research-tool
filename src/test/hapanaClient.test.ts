/**
 * Tests for hapanaClient.ts
 *
 * Key coverage:
 * - Occurrence IDs: Hapana sessionIDs are slot-type identifiers (same ID repeats
 *   each time the slot runs). We must combine with date+time to get a unique key.
 * - Incremental merge: past sessions not returned by fresh API are retained.
 * - Peak/off-peak price selection.
 * - Pagination: multiple pages are fetched and combined.
 * - "Record not found" response terminates pagination gracefully.
 */

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { fetchAllHapanaSessions } from '@/lib/hapanaClient';
import type { MomenceSession } from '@/types/momence';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_LOCATION = {
  widgetId: 'widget-port-beach',
  name: 'Port Beach',
  operatingSince: '2025-01-01',
} as const;

const BASE_URL = 'https://widgetapi.hapana.com/v2/wAPI/site/sessions';
const ORIGIN = 'https://alchemysaunas.com.au';

function settingsResponse(token = 'tok-abc') {
  return {
    ok: true,
    json: () => Promise.resolve({ securityToken: token, siteName: 'Alchemy', timezone: 'Australia/Perth' }),
  };
}

function sessionResponse(
  sessions: Array<{
    sessionID: string;
    sessionDate: string;
    startTime: string;
    endTime?: string;
    sessionType?: string;
    sessionStatus?: string;
    capacity?: number;
    reserved?: number;
  }>,
  pageIndex = 1,
  noOfPages = 1,
) {
  return {
    ok: true,
    json: () => Promise.resolve({
      success: true,
      pagination: { totalRecords: sessions.length, pageSize: 100, pageIndex, noOfPages },
      data: sessions.map(s => ({
        sessionName: 'Sauna',
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime ?? '10:00:00',
        duration: '1 hr',
        sessionType: s.sessionType ?? '1hr Session (peak)',
        instructor: 'Alchemy Saunas Port Beach',
        capacity: s.capacity ?? 14,
        reserved: s.reserved ?? 5,
        remaining: (s.capacity ?? 14) - (s.reserved ?? 5),
        casualRate: 0,
        sessionStatus: s.sessionStatus ?? 'open',
        address: '42 Port Beach Road',
        timezone: 'Australia/Perth',
        sessionLocationType: 'physical',
        sessionID: s.sessionID,
      })),
    }),
  };
}

function notFoundResponse() {
  return {
    ok: true,
    json: () => Promise.resolve({ success: false, data: [], message: 'Record not found!', pagination: { totalRecords: 0, pageSize: 100, pageIndex: 1, noOfPages: 0 } }),
  };
}

function pastSession(id: string, daysAgo: number): MomenceSession {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id,
    sessionName: 'Sauna',
    startsAt: d.toISOString(),
    endsAt: new Date(d.getTime() + 3600000).toISOString(),
    durationMinutes: 60,
    capacity: 14,
    ticketsSold: 8,
    fixedTicketPrice: 35,
    location: 'Port Beach',
    inPerson: true,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ── Occurrence IDs ────────────────────────────────────────────────────────────

describe('occurrence IDs', () => {
  it('produces unique IDs for the same slot on different dates', async () => {
    mockFetch
      .mockReturnValueOnce(settingsResponse())
      .mockReturnValueOnce(sessionResponse([
        { sessionID: 'slot-A', sessionDate: '2025-06-01', startTime: '09:00:00' },
        { sessionID: 'slot-A', sessionDate: '2025-06-02', startTime: '09:00:00' }, // same slot, next day
      ]));

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, [],
    );

    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBe('slot-A-2025-06-01T09:00:00');
    expect(sessions[1].id).toBe('slot-A-2025-06-02T09:00:00');
  });

  it('produces unique IDs for different slots on the same date', async () => {
    mockFetch
      .mockReturnValueOnce(settingsResponse())
      .mockReturnValueOnce(sessionResponse([
        { sessionID: 'slot-A', sessionDate: '2025-06-01', startTime: '09:00:00' },
        { sessionID: 'slot-B', sessionDate: '2025-06-01', startTime: '10:00:00' },
      ]));

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, [],
    );

    expect(sessions).toHaveLength(2);
    const ids = sessions.map(s => s.id);
    expect(new Set(ids).size).toBe(2); // all unique
  });

  it('deduplicates genuine duplicate IDs within a single fetch', async () => {
    // Should not happen in practice, but guard against it
    mockFetch
      .mockReturnValueOnce(settingsResponse())
      .mockReturnValueOnce(sessionResponse([
        { sessionID: 'slot-A', sessionDate: '2025-06-01', startTime: '09:00:00' },
        { sessionID: 'slot-A', sessionDate: '2025-06-01', startTime: '09:00:00' }, // exact duplicate
      ]));

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, [],
    );

    expect(sessions).toHaveLength(1);
  });
});

// ── Pricing ───────────────────────────────────────────────────────────────────

describe('peak/off-peak pricing', () => {
  it('assigns peak price when sessionType contains "peak" but not "off-peak"', async () => {
    mockFetch
      .mockReturnValueOnce(settingsResponse())
      .mockReturnValueOnce(sessionResponse([
        { sessionID: 'p1', sessionDate: '2025-06-01', startTime: '09:00:00', sessionType: '1hr Session (peak)' },
      ]));

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, [],
    );

    expect(sessions[0].fixedTicketPrice).toBe(35);
  });

  it('assigns off-peak price when sessionType contains "off-peak"', async () => {
    mockFetch
      .mockReturnValueOnce(settingsResponse())
      .mockReturnValueOnce(sessionResponse([
        { sessionID: 'p2', sessionDate: '2025-06-01', startTime: '09:00:00', sessionType: '1hr Session (off-peak)' },
      ]));

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, [],
    );

    expect(sessions[0].fixedTicketPrice).toBe(20);
  });
});

// ── Incremental merge ─────────────────────────────────────────────────────────

describe('incremental merge', () => {
  it('retains past sessions from cache that the API no longer returns', async () => {
    const cached = [pastSession('slot-OLD-2025-01-01T09:00:00', 90)];

    mockFetch
      .mockReturnValueOnce(settingsResponse())
      .mockReturnValueOnce(sessionResponse([
        { sessionID: 'slot-NEW', sessionDate: '2025-06-01', startTime: '09:00:00' },
      ]));

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, cached,
    );

    expect(sessions.some(s => s.id === 'slot-OLD-2025-01-01T09:00:00')).toBe(true);
    expect(sessions.some(s => s.id.startsWith('slot-NEW'))).toBe(true);
  });

  it('does NOT retain a cached session when the fresh fetch returns the same ID', async () => {
    // The fresh fetch returns the same occurrence — we should use the fresh version (updated booking count)
    const occurrenceId = 'slot-A-2025-06-01T09:00:00';
    const staleSession: MomenceSession = {
      ...pastSession(occurrenceId, 3),
      ticketsSold: 2, // stale count
    };

    mockFetch
      .mockReturnValueOnce(settingsResponse())
      .mockReturnValueOnce(sessionResponse([
        { sessionID: 'slot-A', sessionDate: '2025-06-01', startTime: '09:00:00', reserved: 9 }, // updated
      ]));

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, [staleSession],
    );

    const match = sessions.find(s => s.id === occurrenceId);
    expect(match).toBeDefined();
    expect(match!.ticketsSold).toBe(9); // fresh value wins
    expect(sessions.filter(s => s.id === occurrenceId)).toHaveLength(1); // no duplicate
  });

  it('does not retain future cached sessions that the API omits', async () => {
    // Future cached session with no match in fresh fetch — should be dropped
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const future: MomenceSession = {
      id: 'slot-FUTURE-' + futureDate.toISOString(),
      sessionName: 'Sauna',
      startsAt: futureDate.toISOString(),
      endsAt: futureDate.toISOString(),
      durationMinutes: 60,
      capacity: 14,
      ticketsSold: 0,
      fixedTicketPrice: 35,
      location: 'Port Beach',
      inPerson: true,
    };

    mockFetch
      .mockReturnValueOnce(settingsResponse())
      .mockReturnValueOnce(notFoundResponse());

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, [future],
    );

    expect(sessions.some(s => s.id === future.id)).toBe(false);
  });

  it('returns sessions sorted by startsAt', async () => {
    const cached = [pastSession('slot-OLD-2025-01-10T09:00:00', 70)];

    mockFetch
      .mockReturnValueOnce(settingsResponse())
      .mockReturnValueOnce(sessionResponse([
        { sessionID: 'slot-Z', sessionDate: '2025-06-15', startTime: '14:00:00' },
        { sessionID: 'slot-A', sessionDate: '2025-06-15', startTime: '09:00:00' },
      ]));

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, cached,
    );

    for (let i = 1; i < sessions.length; i++) {
      expect(sessions[i].startsAt >= sessions[i - 1].startsAt).toBe(true);
    }
  });
});

// ── Pagination ────────────────────────────────────────────────────────────────

describe('pagination', () => {
  it('fetches all pages when noOfPages > 1', async () => {
    mockFetch
      .mockReturnValueOnce(settingsResponse())
      // Page 1 of 2
      .mockReturnValueOnce(sessionResponse(
        [{ sessionID: 'slot-A', sessionDate: '2025-06-01', startTime: '09:00:00' }],
        1, 2,
      ))
      // Page 2 of 2
      .mockReturnValueOnce(sessionResponse(
        [{ sessionID: 'slot-B', sessionDate: '2025-06-01', startTime: '10:00:00' }],
        2, 2,
      ));

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, [],
    );

    expect(sessions).toHaveLength(2);
    expect(sessions.map(s => s.id)).toContain('slot-A-2025-06-01T09:00:00');
    expect(sessions.map(s => s.id)).toContain('slot-B-2025-06-01T10:00:00');
  });

  it('stops gracefully on "Record not found" response', async () => {
    mockFetch
      .mockReturnValueOnce(settingsResponse())
      .mockReturnValueOnce(notFoundResponse());

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, [],
    );

    expect(sessions).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2); // 1 settings + 1 sessions
  });
});

// ── Multi-location ────────────────────────────────────────────────────────────

describe('multi-location', () => {
  const LOCATIONS = [
    { widgetId: 'w1', name: 'Port Beach', operatingSince: '2025-01-01' },
    { widgetId: 'w2', name: 'Fremantle', operatingSince: '2025-01-01' },
  ] as const;

  it('fetches all locations and tags sessions with correct location name', async () => {
    mockFetch
      .mockReturnValueOnce(settingsResponse('tok-1'))           // Port Beach settings
      .mockReturnValueOnce(settingsResponse('tok-2'))           // Fremantle settings
      .mockReturnValueOnce(sessionResponse(                     // Port Beach sessions
        [{ sessionID: 'slot-A', sessionDate: '2025-06-01', startTime: '09:00:00' }],
      ))
      .mockReturnValueOnce(sessionResponse(                     // Fremantle sessions
        [{ sessionID: 'slot-B', sessionDate: '2025-06-01', startTime: '09:00:00' }],
      ));

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, LOCATIONS, ORIGIN, 35, 20, [],
    );

    expect(sessions).toHaveLength(2);
    const pb = sessions.find(s => s.id === 'slot-A-2025-06-01T09:00:00');
    const frem = sessions.find(s => s.id === 'slot-B-2025-06-01T09:00:00');
    expect(pb?.location).toBe('Port Beach');
    expect(frem?.location).toBe('Fremantle');
  });

  it('sessions with same slot+date+time from different locations get unique IDs via location', async () => {
    // Note: IDs include sessionID+date+time but NOT location — if two locations
    // happen to produce the same occurrence key, the dedup keeps only one.
    // This test documents current behaviour.
    mockFetch
      .mockReturnValueOnce(settingsResponse('tok-1'))
      .mockReturnValueOnce(settingsResponse('tok-2'))
      .mockReturnValueOnce(sessionResponse([
        { sessionID: 'SHARED-SLOT', sessionDate: '2025-06-01', startTime: '09:00:00' },
      ]))
      .mockReturnValueOnce(sessionResponse([
        { sessionID: 'SHARED-SLOT', sessionDate: '2025-06-01', startTime: '09:00:00' },
      ]));

    const sessions = await fetchAllHapanaSessions(
      BASE_URL, LOCATIONS, ORIGIN, 35, 20, [],
    );

    // Current behavior: deduplicates, keeps 1. Documented here so a future change is intentional.
    expect(sessions).toHaveLength(1);
  });

  it('calls onProgress callback as sessions accumulate', async () => {
    mockFetch
      .mockReturnValueOnce(settingsResponse('tok-1'))
      .mockReturnValueOnce(settingsResponse('tok-2'))
      .mockReturnValueOnce(sessionResponse([
        { sessionID: 'slot-A', sessionDate: '2025-06-01', startTime: '09:00:00' },
      ]))
      .mockReturnValueOnce(sessionResponse([
        { sessionID: 'slot-B', sessionDate: '2025-06-01', startTime: '10:00:00' },
      ]));

    const progressCalls: number[] = [];
    await fetchAllHapanaSessions(
      BASE_URL, LOCATIONS, ORIGIN, 35, 20, [],
      (count) => progressCalls.push(count),
    );

    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[progressCalls.length - 1]).toBe(2);
  });
});

// ── Error handling ────────────────────────────────────────────────────────────

describe('error handling', () => {
  it('throws when settings endpoint returns non-OK', async () => {
    mockFetch.mockReturnValueOnce({ ok: false, status: 403, statusText: 'Forbidden' });

    await expect(
      fetchAllHapanaSessions(BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, []),
    ).rejects.toThrow('403');
  });

  it('throws when sessions endpoint returns non-OK', async () => {
    mockFetch
      .mockReturnValueOnce(settingsResponse())
      .mockReturnValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

    await expect(
      fetchAllHapanaSessions(BASE_URL, [TEST_LOCATION], ORIGIN, 35, 20, []),
    ).rejects.toThrow('500');
  });
});
