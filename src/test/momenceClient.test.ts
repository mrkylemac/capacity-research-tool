import { MomenceClient } from '@/lib/momenceClient';

// ── Mock fetch ────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// fetchHostInfo
// ═══════════════════════════════════════════════════════════════════════════════

describe('MomenceClient.fetchHostInfo', () => {
  const client = new MomenceClient('https://api.example.com');

  it('returns host info when API responds with host data', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({
      host: {
        id: 42,
        name: 'Test Sauna',
        currency: 'aud',
        countryCode: 'AU',
        timeZone: 'Australia/Melbourne',
        industry: { name: 'Wellness' },
        profileImage: 'https://img.example.com/photo.jpg',
      },
    }));

    const info = await client.fetchHostInfo('abc123');
    expect(info).toEqual({
      id: 42,
      name: 'Test Sauna',
      currency: 'aud',
      countryCode: 'AU',
      timeZone: 'Australia/Melbourne',
      industry: 'Wellness',
      profileImage: 'https://img.example.com/photo.jpg',
    });
    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/abc123/host-schedule');
  });

  it('returns null when API returns non-OK status', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({}, 404));

    const info = await client.fetchHostInfo('missing');
    expect(info).toBeNull();
  });

  it('returns null when host key is missing from response', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ data: {} }));

    const info = await client.fetchHostInfo('empty');
    expect(info).toBeNull();
  });

  it('returns null when fetch throws (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const info = await client.fetchHostInfo('fail');
    expect(info).toBeNull();
  });

  it('uses sensible defaults for missing fields', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({
      host: { id: 1 },
    }));

    const info = await client.fetchHostInfo('minimal');
    expect(info!.name).toBe('Unknown Venue');
    expect(info!.currency).toBe('aud');
    expect(info!.countryCode).toBe('AU');
    expect(info!.timeZone).toBe('Australia/Melbourne');
    expect(info!.industry).toBe('Wellness');
    expect(info!.profileImage).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// fetchSessions
// ═══════════════════════════════════════════════════════════════════════════════

describe('MomenceClient.fetchSessions', () => {
  const client = new MomenceClient('https://api.example.com');

  it('transforms payload-style response', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({
      payload: [
        {
          id: 's1',
          name: 'Morning Sauna',
          startDate: '2026-01-15T09:00:00Z',
          endDate: '2026-01-15T10:00:00Z',
          duration: 60,
          spotsTotal: 20,
          ticketsSold: 12,
          fixedTicketPrice: 45,
          locationName: 'Melbourne',
          inPerson: true,
        },
      ],
      total: 1,
      page: 0,
      pageSize: 50,
      totalPages: 1,
    }));

    const result = await client.fetchSessions({
      hostId: 'host1',
      startsAtFrom: '2026-01-01',
      startsAtTo: '2026-01-31',
      page: 1,
    });

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].sessionName).toBe('Morning Sauna');
    expect(result.sessions[0].capacity).toBe(20);
    expect(result.sessions[0].ticketsSold).toBe(12);
    expect(result.page).toBe(1); // 0-indexed API → 1-indexed
    expect(result.totalCount).toBe(1);
  });

  it('transforms data-style response', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({
      data: [
        { id: 's1', name: 'Evening', spotsTotal: 15, ticketsSold: 8, startDate: '2026-01-15T18:00:00Z', endDate: '2026-01-15T19:00:00Z' },
      ],
      total: 1,
    }));

    const result = await client.fetchSessions({
      hostId: 'host1',
      startsAtFrom: '2026-01-01',
      startsAtTo: '2026-01-31',
    });

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].sessionName).toBe('Evening');
  });

  it('handles array-style response', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse([
      { id: 's1', name: 'Solo', spotsTotal: 5, ticketsSold: 2, startDate: '2026-01-15T09:00:00Z', endDate: '2026-01-15T10:00:00Z' },
    ]));

    const result = await client.fetchSessions({
      hostId: 'host1',
      startsAtFrom: '2026-01-01',
      startsAtTo: '2026-01-31',
    });

    expect(result.sessions).toHaveLength(1);
    expect(result.totalPages).toBe(1);
  });

  it('returns empty result for unrecognized response shape', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ unexpected: true }));

    const result = await client.fetchSessions({
      hostId: 'host1',
      startsAtFrom: '2026-01-01',
      startsAtTo: '2026-01-31',
    });

    expect(result.sessions).toHaveLength(0);
    expect(result.totalCount).toBe(0);
  });

  it('throws on API error', async () => {
    mockFetch.mockReturnValueOnce(Promise.resolve({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({}),
    }));

    await expect(client.fetchSessions({
      hostId: 'host1',
      startsAtFrom: '2026-01-01',
      startsAtTo: '2026-01-31',
    })).rejects.toThrow('API Error: 500');
  });

  it('handles cancelled sessions (isCancelled preserved)', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({
      payload: [
        { id: 's1', name: 'Cancelled', isCancelled: true, spotsTotal: 20, ticketsSold: 0, startDate: '2026-01-15T09:00:00Z', endDate: '2026-01-15T10:00:00Z' },
      ],
      total: 1,
    }));

    const result = await client.fetchSessions({
      hostId: 'host1',
      startsAtFrom: '2026-01-01',
      startsAtTo: '2026-01-31',
    });

    expect(result.sessions[0].isCancelled).toBe(true);
  });

  it('defaults startsAt/endsAt to empty string when missing from API', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({
      payload: [{ id: 's1', name: 'No dates', spotsTotal: 10, ticketsSold: 5 }],
      total: 1,
    }));

    const result = await client.fetchSessions({
      hostId: 'host1',
      startsAtFrom: '2026-01-01',
      startsAtTo: '2026-01-31',
    });

    expect(result.sessions[0].startsAt).toBe('');
    expect(result.sessions[0].endsAt).toBe('');
  });

  it('sets correct query parameters', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ payload: [], total: 0, totalPages: 0 }));

    await client.fetchSessions({
      hostId: 'host1',
      startsAtFrom: '2026-01-01',
      startsAtTo: '2026-03-31',
      page: 2,
      pageSize: 25,
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('host1/host-schedule/sessions');
    expect(calledUrl).toContain('fromDate=2026-01-01');
    expect(calledUrl).toContain('toDate=2026-03-31');
    expect(calledUrl).toContain('page=1');    // page 2 → 0-indexed = 1
    expect(calledUrl).toContain('pageSize=25');
  });
});
