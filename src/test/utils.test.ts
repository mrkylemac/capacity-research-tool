import { formatDecimalHour, sanitizeSessions, normalizeCapacity, logDataQuality } from '@/lib/utils';
import type { MomenceSession } from '@/types/momence';

// ── Helper ────────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<MomenceSession> = {}): MomenceSession {
  return {
    id: '1',
    sessionName: 'Sauna',
    startsAt: '2026-01-15T09:00:00Z',
    endsAt: '2026-01-15T10:00:00Z',
    durationMinutes: 60,
    capacity: 20,
    ticketsSold: 10,
    fixedTicketPrice: 45,
    location: 'Melbourne',
    inPerson: true,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// formatDecimalHour
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatDecimalHour', () => {
  it('formats whole morning hours', () => {
    expect(formatDecimalHour(6)).toBe('6am');
    expect(formatDecimalHour(9)).toBe('9am');
    expect(formatDecimalHour(11)).toBe('11am');
  });

  it('formats whole afternoon/evening hours', () => {
    expect(formatDecimalHour(13)).toBe('1pm');
    expect(formatDecimalHour(18)).toBe('6pm');
    expect(formatDecimalHour(21)).toBe('9pm');
  });

  it('formats noon and midnight', () => {
    expect(formatDecimalHour(0)).toBe('12am');
    expect(formatDecimalHour(12)).toBe('12pm');
  });

  it('formats fractional hours with minutes', () => {
    expect(formatDecimalHour(6.5)).toBe('6:30am');
    expect(formatDecimalHour(18.5)).toBe('6:30pm');
    expect(formatDecimalHour(9.25)).toBe('9:15am');
    expect(formatDecimalHour(14.75)).toBe('2:45pm');
  });

  it('formats non-standard fractional minutes', () => {
    // 18.083 ≈ 6:05pm
    expect(formatDecimalHour(18.083)).toBe('6:05pm');
  });

  it('handles edge near 24', () => {
    expect(formatDecimalHour(23)).toBe('11pm');
    expect(formatDecimalHour(23.5)).toBe('11:30pm');
  });

  it('handles minute-wrap at 60 (rounding boundary)', () => {
    // 11.999 → Math.round(0.999 * 60) = 60 → should roll to 12pm, not 12am
    expect(formatDecimalHour(11.999)).toBe('12pm');
    // 6.999 → should roll to 7am
    expect(formatDecimalHour(6.999)).toBe('7am');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// sanitizeSessions
// ═══════════════════════════════════════════════════════════════════════════════

describe('sanitizeSessions', () => {
  it('passes through valid sessions unchanged', () => {
    const sessions = [makeSession({ id: 'a' }), makeSession({ id: 'b' })];
    const { sessions: clean, report } = sanitizeSessions(sessions);
    expect(clean).toHaveLength(2);
    expect(report.inputCount).toBe(2);
    expect(report.outputCount).toBe(2);
  });

  it('drops cancelled sessions', () => {
    const sessions = [
      makeSession({ id: 'ok' }),
      makeSession({ id: 'cancelled', isCancelled: true }),
    ];
    const { sessions: clean, report } = sanitizeSessions(sessions);
    expect(clean).toHaveLength(1);
    expect(clean[0].id).toBe('ok');
    expect(report.dropped.cancelled).toBe(1);
  });

  it('drops sessions with invalid dates', () => {
    const sessions = [
      makeSession({ id: 'ok' }),
      makeSession({ id: 'bad-date', startsAt: 'not-a-date' }),
      makeSession({ id: 'empty-date', startsAt: '' }),
    ];
    const { sessions: clean, report } = sanitizeSessions(sessions);
    expect(clean).toHaveLength(1);
    expect(report.dropped.invalidDate).toBe(2);
  });

  it('drops sessions with zero or negative capacity', () => {
    const sessions = [
      makeSession({ id: 'ok' }),
      makeSession({ id: 'zero-cap', capacity: 0 }),
      makeSession({ id: 'neg-cap', capacity: -1 }),
    ];
    const { sessions: clean, report } = sanitizeSessions(sessions);
    expect(clean).toHaveLength(1);
    expect(report.dropped.zeroCapacity).toBe(2);
  });

  it('clamps ticketsSold to capacity when exceeding', () => {
    const sessions = [makeSession({ capacity: 10, ticketsSold: 15 })];
    const { sessions: clean, report } = sanitizeSessions(sessions);
    expect(clean[0].ticketsSold).toBe(10);
    expect(report.clamped.ticketsExceededCapacity).toBe(1);
  });

  it('does not clamp ticketsSold when within capacity', () => {
    const sessions = [makeSession({ capacity: 20, ticketsSold: 15 })];
    const { sessions: clean, report } = sanitizeSessions(sessions);
    expect(clean[0].ticketsSold).toBe(15);
    expect(report.clamped.ticketsExceededCapacity).toBe(0);
  });

  it('drops sessions outside operating hours bounds', () => {
    const bounds = { earliestStart: 6, latestEnd: 21 };
    const sessions = [
      makeSession({ id: 'ok', startsAt: '2026-01-15T09:00:00Z' }),       // 9am UTC
      makeSession({ id: 'early', startsAt: '2026-01-15T03:00:00Z' }),     // 3am UTC
      makeSession({ id: 'late', startsAt: '2026-01-15T23:00:00Z' }),      // 11pm UTC
    ];
    const { sessions: clean, report } = sanitizeSessions(sessions, bounds);
    expect(clean).toHaveLength(1);
    expect(clean[0].id).toBe('ok');
    expect(report.dropped.outsideOperatingHours).toBe(2);
  });

  it('does not filter by operating hours when bounds not provided', () => {
    const sessions = [
      makeSession({ startsAt: '2026-01-15T03:00:00Z' }),
      makeSession({ startsAt: '2026-01-15T23:00:00Z' }),
    ];
    const { sessions: clean } = sanitizeSessions(sessions);
    expect(clean).toHaveLength(2);
  });

  it('handles empty array', () => {
    const { sessions: clean, report } = sanitizeSessions([]);
    expect(clean).toHaveLength(0);
    expect(report.inputCount).toBe(0);
    expect(report.outputCount).toBe(0);
  });

  it('handles multiple issues on one session (first match wins)', () => {
    // Cancelled + zero capacity — cancelled check comes first
    const sessions = [makeSession({ isCancelled: true, capacity: 0 })];
    const { report } = sanitizeSessions(sessions);
    expect(report.dropped.cancelled).toBe(1);
    expect(report.dropped.zeroCapacity).toBe(0);
  });

  it('does not mutate original sessions when clamping', () => {
    const original = makeSession({ capacity: 10, ticketsSold: 15 });
    sanitizeSessions([original]);
    expect(original.ticketsSold).toBe(15); // unchanged
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// normalizeCapacity
// ═══════════════════════════════════════════════════════════════════════════════

describe('normalizeCapacity', () => {
  it('returns empty result for empty array', () => {
    const result = normalizeCapacity([]);
    expect(result.sessions).toHaveLength(0);
    expect(result.normalizedCount).toBe(0);
    expect(result.modalCapacity).toBe(0);
  });

  it('finds the modal capacity correctly', () => {
    const sessions = [
      makeSession({ capacity: 20 }),
      makeSession({ capacity: 20 }),
      makeSession({ capacity: 20 }),
      makeSession({ capacity: 10 }),
      makeSession({ capacity: 30 }),
    ];
    const result = normalizeCapacity(sessions);
    expect(result.modalCapacity).toBe(20);
  });

  it('normalizes outlier capacities to the mode', () => {
    const sessions = [
      makeSession({ capacity: 20 }),
      makeSession({ capacity: 20 }),
      makeSession({ capacity: 20 }),
      makeSession({ capacity: 100 }), // deviation = 4.0 > 0.5
    ];
    const result = normalizeCapacity(sessions);
    expect(result.normalizedCount).toBe(1);
    expect(result.sessions[3].capacity).toBe(20);
  });

  it('respects deviation threshold', () => {
    const sessions = [
      makeSession({ capacity: 20 }),
      makeSession({ capacity: 20 }),
      makeSession({ capacity: 25 }), // deviation = 0.25
    ];
    // default threshold 0.5 — 25% deviation should NOT be normalized
    const result = normalizeCapacity(sessions, 0.5);
    expect(result.normalizedCount).toBe(0);

    // with stricter threshold — SHOULD be normalized
    const strict = normalizeCapacity(sessions, 0.2);
    expect(strict.normalizedCount).toBe(1);
    expect(strict.sessions[2].capacity).toBe(20);
  });

  it('does not modify values when applyNormalization is false', () => {
    const sessions = [
      makeSession({ capacity: 20 }),
      makeSession({ capacity: 20 }),
      makeSession({ capacity: 100 }),
    ];
    const result = normalizeCapacity(sessions, 0.5, false);
    expect(result.normalizedCount).toBe(1);
    expect(result.sessions[2].capacity).toBe(100); // unchanged
  });

  it('does not mutate original sessions', () => {
    const original = makeSession({ capacity: 100 });
    const sessions = [makeSession({ capacity: 20 }), makeSession({ capacity: 20 }), original];
    normalizeCapacity(sessions);
    expect(original.capacity).toBe(100);
  });

  it('handles all-zero capacities without division by zero', () => {
    const sessions = [
      makeSession({ capacity: 0 }),
      makeSession({ capacity: 0 }),
    ];
    const result = normalizeCapacity(sessions);
    expect(result.modalCapacity).toBe(0);
    expect(result.normalizedCount).toBe(0);
    expect(result.sessions).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// logDataQuality
// ═══════════════════════════════════════════════════════════════════════════════

describe('logDataQuality', () => {
  it('logs clean message when no issues', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logDataQuality('Test', {
      inputCount: 10,
      outputCount: 10,
      dropped: { cancelled: 0, invalidDate: 0, zeroCapacity: 0, outsideOperatingHours: 0 },
      clamped: { ticketsExceededCapacity: 0, capacityNormalized: 0 },
    });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('no data quality issues'));
    spy.mockRestore();
  });

  it('warns when there are issues', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logDataQuality('Test', {
      inputCount: 10,
      outputCount: 8,
      dropped: { cancelled: 2, invalidDate: 0, zeroCapacity: 0, outsideOperatingHours: 0 },
      clamped: { ticketsExceededCapacity: 0, capacityNormalized: 0 },
    });
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('dropped (cancelled)'));
    spy.mockRestore();
  });
});
