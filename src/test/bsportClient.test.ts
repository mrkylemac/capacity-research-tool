/**
 * Tests for bsportClient.ts
 *
 * Key coverage:
 * - Field mapping: effectif → capacity, validated_booking_count → ticketsSold,
 *   static config price, establishment ID → location name.
 * - name_override takes precedence over activity_name when set.
 * - manager_only offers are excluded.
 * - Pagination: multiple pages are fetched via next_page and combined.
 * - Duplicate offer IDs across pages are deduplicated.
 * - Results are sorted by start time.
 */

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { fetchAllBsportSessions } from '@/lib/bsportClient';
import type { BsportOffer } from '@/lib/bsportClient';
import type { BsportConfig } from '@/config/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_CONFIG: BsportConfig = {
  baseUrl: 'https://api.production.bsport.io/book/v1',
  companyId: 3385,
  name: 'KEEN Wellbeing',
  timezone: 'Europe/Zurich',
  operatingSince: '2024-11-23',
  sessionPriceChf: 27,
  activityIds: [165366, 195797],
  establishments: { 11743: 'KEEN Zurich', 17048: 'Sauna Utoquai' },
};

function makeOffer(overrides: Partial<BsportOffer> = {}): BsportOffer {
  return {
    id: 1001,
    company: 3385,
    activity: 842959,
    activity_name: 'SOLO JOURNEY',
    meta_activity: 165366,
    establishment: 11743,
    date_start: '2026-07-12T18:00:00+02:00',
    duration_minute: 75,
    effectif: 15,
    validated_booking_count: 9,
    name_override: '',
    manager_only: false,
    full: false,
    timezone_name: 'Europe/Zurich',
    ...overrides,
  };
}

function offerResponse(offers: BsportOffer[], page = 1, nextPage: number | null = null, count?: number) {
  return {
    ok: true,
    json: () => Promise.resolve({
      count: count ?? offers.length,
      page,
      next_page: nextPage,
      results: offers,
    }),
  };
}

const FROM = new Date('2024-11-23');
const TO = new Date('2026-07-21');

beforeEach(() => {
  mockFetch.mockReset();
});

// ── Field mapping ─────────────────────────────────────────────────────────────

describe('field mapping', () => {
  it('maps a bsport offer to a MomenceSession', async () => {
    mockFetch.mockReturnValueOnce(offerResponse([makeOffer()]));

    const sessions = await fetchAllBsportSessions(TEST_CONFIG, FROM, TO);

    expect(sessions).toHaveLength(1);
    const s = sessions[0];
    expect(s.id).toBe('1001');
    expect(s.sessionName).toBe('SOLO JOURNEY');
    expect(s.startsAt).toBe('2026-07-12T16:00:00.000Z'); // 18:00 +02:00 → UTC
    expect(s.endsAt).toBe('2026-07-12T17:15:00.000Z');   // start + 75 min
    expect(s.durationMinutes).toBe(75);
    expect(s.capacity).toBe(15);
    expect(s.ticketsSold).toBe(9);
    expect(s.fixedTicketPrice).toBe(27);
    expect(s.location).toBe('KEEN Zurich');
    expect(s.inPerson).toBe(true);
  });

  it('prefers name_override over activity_name when set', async () => {
    mockFetch.mockReturnValueOnce(offerResponse([
      makeOffer({ id: 1, name_override: 'Special Edition Journey' }),
      makeOffer({ id: 2, name_override: '' }),
    ]));

    const sessions = await fetchAllBsportSessions(TEST_CONFIG, FROM, TO);

    expect(sessions.map(s => s.sessionName)).toEqual(
      expect.arrayContaining(['Special Edition Journey', 'SOLO JOURNEY']),
    );
  });

  it('falls back to a generic label for unknown establishments', async () => {
    mockFetch.mockReturnValueOnce(offerResponse([makeOffer({ establishment: 99999 })]));

    const sessions = await fetchAllBsportSessions(TEST_CONFIG, FROM, TO);

    expect(sessions[0].location).toBe('Establishment 99999');
  });

  it('maps secondary establishments to their configured names', async () => {
    mockFetch.mockReturnValueOnce(offerResponse([makeOffer({ establishment: 17048 })]));

    const sessions = await fetchAllBsportSessions(TEST_CONFIG, FROM, TO);

    expect(sessions[0].location).toBe('Sauna Utoquai');
  });
});

// ── Filtering ─────────────────────────────────────────────────────────────────

describe('filtering', () => {
  it('excludes manager_only offers', async () => {
    mockFetch.mockReturnValueOnce(offerResponse([
      makeOffer({ id: 1 }),
      makeOffer({ id: 2, manager_only: true }),
      makeOffer({ id: 3 }),
    ]));

    const sessions = await fetchAllBsportSessions(TEST_CONFIG, FROM, TO);

    expect(sessions.map(s => s.id).sort()).toEqual(['1', '3']);
  });

  it('deduplicates offers repeated across pages', async () => {
    mockFetch
      .mockReturnValueOnce(offerResponse([makeOffer({ id: 1 }), makeOffer({ id: 2 })], 1, 2, 3))
      .mockReturnValueOnce(offerResponse([makeOffer({ id: 2 }), makeOffer({ id: 3 })], 2, null, 3));

    const sessions = await fetchAllBsportSessions(TEST_CONFIG, FROM, TO);

    expect(sessions.map(s => s.id).sort()).toEqual(['1', '2', '3']);
  });
});

// ── Pagination ────────────────────────────────────────────────────────────────

describe('pagination', () => {
  it('follows next_page until exhausted', async () => {
    mockFetch
      .mockReturnValueOnce(offerResponse([makeOffer({ id: 1 })], 1, 2, 3))
      .mockReturnValueOnce(offerResponse([makeOffer({ id: 2 })], 2, 3, 3))
      .mockReturnValueOnce(offerResponse([makeOffer({ id: 3 })], 3, null, 3));

    const sessions = await fetchAllBsportSessions(TEST_CONFIG, FROM, TO);

    expect(sessions).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('requests the configured company, activity filter and date range', async () => {
    mockFetch.mockReturnValueOnce(offerResponse([]));

    await fetchAllBsportSessions(TEST_CONFIG, FROM, TO);

    const url = new URL(mockFetch.mock.calls[0][0] as string);
    expect(url.searchParams.get('company')).toBe('3385');
    expect(url.searchParams.get('activity__in')).toBe('165366,195797');
    expect(url.searchParams.get('min_date')).toBe('2024-11-23');
    expect(url.searchParams.get('max_date')).toBe('2026-07-21');
    expect(url.searchParams.get('only_future_strict')).toBe('false');
  });

  it('throws on a non-OK response', async () => {
    mockFetch.mockReturnValueOnce({ ok: false, status: 500, statusText: 'Server Error' });

    await expect(fetchAllBsportSessions(TEST_CONFIG, FROM, TO)).rejects.toThrow('bsport API: 500');
  });
});

// ── Ordering ──────────────────────────────────────────────────────────────────

describe('ordering', () => {
  it('sorts sessions by start time ascending', async () => {
    mockFetch.mockReturnValueOnce(offerResponse([
      makeOffer({ id: 2, date_start: '2026-07-13T10:00:00+02:00' }),
      makeOffer({ id: 1, date_start: '2026-07-12T08:00:00+02:00' }),
      makeOffer({ id: 3, date_start: '2026-07-14T09:00:00+02:00' }),
    ]));

    const sessions = await fetchAllBsportSessions(TEST_CONFIG, FROM, TO);

    expect(sessions.map(s => s.id)).toEqual(['1', '2', '3']);
  });
});
