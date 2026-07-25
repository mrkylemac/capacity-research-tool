/**
 * Tests for punchpassClient.ts
 *
 * Punchpass renders its schedule as server-side HTML with no total capacity or
 * booked count — only "N spots left" (remaining) per session. Key coverage:
 * - HTML parsing: day-grouped instances → course, session type, time, duration.
 * - Capacity inference: capacity per course = max remaining-spots advertised;
 *   ticketsSold = capacity - spotsLeft.
 * - "CLASS FULL" → 0 remaining (fully booked).
 * - Sessions with no availability label (already started) are skipped.
 * - Timezone conversion: local Sydney wall-clock → UTC ISO (AEST +10).
 * - Incremental merge: past cached sessions not in the fresh fetch are retained.
 */

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { fetchAllPunchpassSessions } from '@/lib/punchpassClient';
import type { PunchpassConfig } from '@/config/api';
import type { MomenceSession } from '@/types/momence';

const CFG: PunchpassConfig = {
  baseUrl: 'https://bmsauna.punchpass.com',
  orgId: '16281',
  name: 'Blue Mountains Sauna',
  location: 'Leura',
  timezone: 'Australia/Sydney',
  operatingSince: '2026-07-24',
  sessionPrice: 50,
  fetchWindowDays: 90,
};

/** Build a schedule instance block matching the real Punchpass markup. */
function instance(opts: {
  id: string;
  course: string;
  type: string;
  time: string;
  length: string;
  label?: string; // "5 SPOTS LEFT" | "CLASS FULL" | undefined (no availability)
}): string {
  const labelHtml = opts.label
    ? `<small><span class="gray label">${opts.label}</span></small>`
    : `<small></small>`;
  return (
    `<div class="schedule__instance instance" data-course-id="${opts.course}" ` +
    `data-location="${opts.type}" data-url="/org/16281/classes/${opts.id}">` +
    `<div class="schedule__instance__time">${opts.time}</div>` +
    `<span class="schedule__instance__link"><a href="/classes/${opts.id}">${opts.type}</a></span>` +
    `<span class="schedule__instance__length"><span class="inline-icon "><svg viewBox="0 0 24 24"><path d="M1 2"/></svg></span>${opts.length}</span>` +
    labelHtml +
    `</div>`
  );
}

/** Wrap instances under a single day header (month abbrev + day number). */
function dayGroup(month: string, day: number, instances: string[]): string {
  return (
    `<div class="schedule__dates__date__month">${month}</div>` +
    `<div class="schedule__dates__date__day">${day} <span>Fri</span></div>` +
    instances.join('')
  );
}

function htmlResponse(body: string) {
  return { ok: true, status: 200, statusText: 'OK', text: () => Promise.resolve(body) };
}

const YEAR = new Date().getFullYear();

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchAllPunchpassSessions', () => {
  it('parses instances, infers capacity per course, and computes ticketsSold', async () => {
    const page = dayGroup('Jul', 24, [
      // course 100: max remaining = 5 → capacity 5
      instance({ id: '1001', course: '100', type: 'Regular Session', time: '14:00', length: '2 hours', label: '5 SPOTS LEFT' }),
      instance({ id: '1002', course: '100', type: 'Regular Session', time: '16:00', length: '2 hours', label: '2 SPOTS LEFT' }),
      // course 200: max remaining = 8 → capacity 8; FULL → sold 8
      instance({ id: '2001', course: '200', type: 'Silent Session', time: '18:00', length: '90 minutes', label: '8 SPOTS LEFT' }),
      instance({ id: '2002', course: '200', type: 'Silent Session', time: '20:00', length: '90 minutes', label: 'CLASS FULL' }),
      // no label (already started) → skipped
      instance({ id: '3001', course: '300', type: 'Regular Session', time: '09:00', length: '2 hours' }),
    ]);
    // First page has real data; second page is empty → terminates paging.
    mockFetch.mockResolvedValueOnce(htmlResponse(page)).mockResolvedValue(htmlResponse('<html></html>'));

    const sessions = await fetchAllPunchpassSessions(CFG, 90, []);

    // 4 labelled instances kept; the unlabelled one skipped
    expect(sessions).toHaveLength(4);

    const byId = Object.fromEntries(sessions.map(s => [s.id, s]));

    expect(byId['1001'].capacity).toBe(5);
    expect(byId['1001'].ticketsSold).toBe(0);
    expect(byId['1001'].durationMinutes).toBe(120);
    expect(byId['1001'].sessionName).toBe('Regular Session');
    expect(byId['1001'].location).toBe('Leura');
    expect(byId['1001'].fixedTicketPrice).toBe(50);

    expect(byId['1002'].capacity).toBe(5);
    expect(byId['1002'].ticketsSold).toBe(3);

    expect(byId['2001'].capacity).toBe(8);
    expect(byId['2001'].ticketsSold).toBe(0);
    expect(byId['2001'].durationMinutes).toBe(90);

    // CLASS FULL → 0 remaining → fully booked
    expect(byId['2002'].capacity).toBe(8);
    expect(byId['2002'].ticketsSold).toBe(8);

    expect(byId['3001']).toBeUndefined();
  });

  it('converts Sydney wall-clock time to UTC (AEST +10 in July)', async () => {
    const page = dayGroup('Jul', 24, [
      instance({ id: '1001', course: '100', type: 'Regular Session', time: '14:00', length: '2 hours', label: '5 SPOTS LEFT' }),
    ]);
    mockFetch.mockResolvedValueOnce(htmlResponse(page)).mockResolvedValue(htmlResponse(''));

    const [s] = await fetchAllPunchpassSessions(CFG, 90, []);
    // 14:00 in Sydney (AEST, +10) == 04:00 UTC
    expect(s.startsAt).toBe(`${YEAR}-07-24T04:00:00.000Z`);
    // endsAt = start + 120 min
    expect(s.endsAt).toBe(`${YEAR}-07-24T06:00:00.000Z`);
  });

  it('retains cached past sessions not present in the fresh fetch', async () => {
    const page = dayGroup('Jul', 24, [
      instance({ id: '1001', course: '100', type: 'Regular Session', time: '14:00', length: '2 hours', label: '5 SPOTS LEFT' }),
    ]);
    mockFetch.mockResolvedValueOnce(htmlResponse(page)).mockResolvedValue(htmlResponse(''));

    const past: MomenceSession = {
      id: 'old-1',
      sessionName: 'Regular Session',
      startsAt: '2020-01-01T00:00:00.000Z',
      endsAt: '2020-01-01T02:00:00.000Z',
      durationMinutes: 120,
      capacity: 7,
      ticketsSold: 4,
      fixedTicketPrice: 50,
      location: 'Old Name',
      inPerson: true,
    };

    const sessions = await fetchAllPunchpassSessions(CFG, 90, [past]);
    const retained = sessions.find(s => s.id === 'old-1');
    expect(retained).toBeDefined();
    // Location normalised to the configured value
    expect(retained!.location).toBe('Leura');
    // Fresh session still present
    expect(sessions.some(s => s.id === '1001')).toBe(true);
  });

  it('throws on a non-OK response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable', text: () => Promise.resolve('') });
    await expect(fetchAllPunchpassSessions(CFG, 90, [])).rejects.toThrow(/503/);
  });
});
