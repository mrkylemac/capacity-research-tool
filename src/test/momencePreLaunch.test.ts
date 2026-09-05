import { markPreLaunchSessions } from '@/lib/momenceClient';
import { calculateBenchmarkMetrics } from '@/lib/benchmarkMetrics';
import type { MomenceSession } from '@/types/momence';

/**
 * Momence keeps serving the timetable a venue loaded before it went live, and
 * every one of those sessions comes back with ticketsSold: 0. Counted as real,
 * they deflate any rate that divides by time. Sól Saunas ran 2,190 such
 * sessions between 10 Aug and 28 Oct 2025 and opened in November.
 */

function session(overrides: Partial<MomenceSession> = {}): MomenceSession {
  return {
    id: String(Math.random()),
    sessionName: 'Sauna & Ice Bath Session',
    startsAt: '2025-08-10T20:00:00.000Z',
    endsAt: '2025-08-10T21:00:00.000Z',
    durationMinutes: 60,
    capacity: 15,
    ticketsSold: 0,
    fixedTicketPrice: 30,
    location: 'Sól Saunas Prahran',
    inPerson: true,
    ...overrides,
  };
}

/** One session a day from `from`, `days` of them, all at the same location. */
function daily(from: string, days: number, sold: number, location = 'Sól Saunas Prahran') {
  const start = new Date(from).getTime();
  return Array.from({ length: days }, (_, i) => {
    const at = new Date(start + i * 86_400_000).toISOString();
    return session({ id: `${location}-${at}`, startsAt: at, ticketsSold: sold, location });
  });
}

const NOW = new Date('2026-09-05T00:00:00.000Z').getTime();

describe('markPreLaunchSessions', () => {
  it('flags every session before the location first records a booking', () => {
    const sessions = [
      ...daily('2025-08-10T20:00:00.000Z', 60, 0),
      ...daily('2025-11-02T20:00:00.000Z', 30, 9),
    ];

    const marked = markPreLaunchSessions(sessions, NOW);

    expect(marked.filter(s => s.utilisationKnown === false)).toHaveLength(60);
    expect(marked.slice(0, 60).every(s => s.utilisationKnown === false)).toBe(true);
    expect(marked.slice(60).every(s => s.utilisationKnown === undefined)).toBe(true);
  });

  it('leaves a genuinely empty session alone once bookings have started', () => {
    const sessions = [
      ...daily('2025-11-02T20:00:00.000Z', 1, 9),
      session({ id: 'quiet', startsAt: '2025-11-03T20:00:00.000Z', ticketsSold: 0 }),
    ];

    const marked = markPreLaunchSessions(sessions, NOW);

    expect(marked.find(s => s.id === 'quiet')!.utilisationKnown).toBeUndefined();
  });

  it('leaves a location that has never recorded a booking untouched', () => {
    const sessions = daily('2025-08-10T20:00:00.000Z', 40, 0);

    const marked = markPreLaunchSessions(sessions, NOW);

    expect(marked.some(s => s.utilisationKnown === false)).toBe(false);
    expect(marked).toEqual(sessions);
  });

  it('treats locations separately, so a second site opening later is covered', () => {
    const sessions = [
      ...daily('2025-08-10T20:00:00.000Z', 10, 0, 'Prahran'),
      ...daily('2025-08-20T20:00:00.000Z', 10, 8, 'Prahran'),
      ...daily('2026-02-01T20:00:00.000Z', 10, 0, 'Collingwood'),
      ...daily('2026-02-11T20:00:00.000Z', 10, 8, 'Collingwood'),
    ];

    const marked = markPreLaunchSessions(sessions, NOW);
    const flagged = marked.filter(s => s.utilisationKnown === false);

    expect(flagged).toHaveLength(20);
    expect(flagged.filter(s => s.location === 'Prahran')).toHaveLength(10);
    expect(flagged.filter(s => s.location === 'Collingwood')).toHaveLength(10);
    // Prahran's own opening date does not silence Collingwood's later history.
    expect(marked.filter(s => s.location === 'Collingwood' && s.startsAt >= '2026-02-11')
      .every(s => s.utilisationKnown === undefined)).toBe(true);
  });

  it('ignores a booking that has not run yet, so a new venue keeps its real zeros', () => {
    const sessions = [
      ...daily('2026-08-01T20:00:00.000Z', 20, 0),
      session({ id: 'future', startsAt: '2026-09-20T20:00:00.000Z', ticketsSold: 4 }),
    ];

    const marked = markPreLaunchSessions(sessions, NOW);

    expect(marked.some(s => s.utilisationKnown === false)).toBe(false);
  });

  it('is idempotent and keeps a flag another platform already set', () => {
    const sessions = [
      session({ id: 'punchpass', startsAt: '2026-01-01T20:00:00.000Z', utilisationKnown: false }),
      ...daily('2026-01-02T20:00:00.000Z', 3, 7),
    ];

    const once = markPreLaunchSessions(sessions, NOW);
    const twice = markPreLaunchSessions(once, NOW);

    expect(once.find(s => s.id === 'punchpass')!.utilisationKnown).toBe(false);
    expect(twice).toEqual(once);
  });

  it('handles an unparseable date without throwing', () => {
    const sessions = [
      session({ id: 'broken', startsAt: 'not-a-date' }),
      ...daily('2026-01-02T20:00:00.000Z', 2, 7),
    ];

    expect(() => markPreLaunchSessions(sessions, NOW)).not.toThrow();
    expect(markPreLaunchSessions(sessions, NOW).find(s => s.id === 'broken')!.utilisationKnown)
      .toBeUndefined();
  });
});

describe('effect on the weekly rate', () => {
  // Mirrors the report: eligible = past, not cancelled, booking count known;
  // the window starts at the first eligible session and ends now.
  function weeklyVisits(sessions: MomenceSession[], now: number) {
    const eligible = sessions.filter(
      s => new Date(s.startsAt).getTime() <= now && !s.isCancelled && s.utilisationKnown !== false,
    );
    const from = eligible.reduce(
      (min, s) => (s.startsAt < min ? s.startsAt : min), eligible[0].startsAt,
    );
    return calculateBenchmarkMetrics(eligible, from, new Date(now).toISOString()).weeklyVisits;
  }

  it('stops the placeholder timetable from halving the rate', () => {
    // 8 weeks of placeholder sessions, then 4 weeks selling 70 a week.
    const now = new Date('2026-01-01T00:00:00.000Z').getTime();
    const sessions = [
      ...daily('2025-10-09T20:00:00.000Z', 56, 0),
      ...daily('2025-12-04T20:00:00.000Z', 28, 10),
    ];

    const before = weeklyVisits(sessions, now);
    const after = weeklyVisits(markPreLaunchSessions(sessions, now), now);

    expect(Math.round(before)).toBe(23);  // 280 visits spread over 12 weeks
    expect(Math.round(after)).toBe(70);   // 280 visits over the 4 weeks it traded
  });
});
