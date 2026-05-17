import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MomenceSession } from '@/types/momence';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format decimal hours (e.g. 18.083) as readable time (e.g. "6:05pm"). Use for all HOI/operating-hours display. */
export function formatDecimalHour(hour: number): string {
  let h = Math.floor(hour);
  let m = Math.round((hour - h) * 60);
  if (m === 60) { m = 0; h += 1; }
  const period = h >= 12 ? 'pm' : 'am';
  const hour12 = h === 0 || h === 24 ? 12 : h > 12 ? h - 12 : h;
  const minStr = m > 0 ? `:${m.toString().padStart(2, '0')}` : '';
  return `${hour12}${minStr}${period}`;
}

// ─── Data quality guardrails ────────────────────────────────────────────────

export interface DataQualityReport {
  inputCount: number;
  outputCount: number;
  dropped: {
    cancelled: number;
    invalidDate: number;
    zeroCapacity: number;
    outsideOperatingHours: number;
  };
  clamped: {
    ticketsExceededCapacity: number;
    capacityNormalized: number;
  };
}

export interface OperatingHoursBounds {
  earliestStart: number; // Decimal hour (e.g., 6.0 for 6am)
  latestEnd: number;     // Decimal hour (e.g., 21.0 for 9pm)
}

/**
 * Sanitize sessions from any platform. Drops cancelled/invalid records, clamps values.
 * Call this once after all pages are fetched and date-filtered.
 *
 * @param sessions - Array of sessions to sanitize
 * @param operatingHoursBounds - Optional bounds to filter sessions outside operating hours
 */
export function sanitizeSessions(
  sessions: MomenceSession[],
  operatingHoursBounds?: OperatingHoursBounds
): { sessions: MomenceSession[]; report: DataQualityReport } {
  const report: DataQualityReport = {
    inputCount: sessions.length,
    outputCount: 0,
    dropped: { cancelled: 0, invalidDate: 0, zeroCapacity: 0, outsideOperatingHours: 0 },
    clamped: { ticketsExceededCapacity: 0, capacityNormalized: 0 },
  };

  const clean = sessions.reduce<MomenceSession[]>((acc, s) => {
    // Drop cancelled sessions (Momence sets isCancelled; other platforms leave undefined)
    if (s.isCancelled) {
      report.dropped.cancelled++;
      return acc;
    }
    // Drop sessions with invalid/missing startsAt
    if (!s.startsAt || isNaN(new Date(s.startsAt).getTime())) {
      report.dropped.invalidDate++;
      return acc;
    }
    // Drop sessions with zero capacity (misconfigured / placeholder)
    if (s.capacity <= 0) {
      report.dropped.zeroCapacity++;
      return acc;
    }

    // Drop sessions outside operating hours (if bounds provided)
    if (operatingHoursBounds) {
      const startDate = new Date(s.startsAt);
      const startHour = startDate.getUTCHours() + startDate.getUTCMinutes() / 60;
      if (startHour < operatingHoursBounds.earliestStart || startHour > operatingHoursBounds.latestEnd) {
        report.dropped.outsideOperatingHours++;
        return acc;
      }
    }

    // Clamp ticketsSold to capacity (waitlist overflow / data quirk)
    if (s.ticketsSold > s.capacity) {
      report.clamped.ticketsExceededCapacity++;
      s = { ...s, ticketsSold: s.capacity };
    }
    acc.push(s);
    return acc;
  }, []);

  report.outputCount = clean.length;
  return { sessions: clean, report };
}

/**
 * Normalize capacity values to the modal (most common) capacity.
 * Detects outlier capacities and optionally clamps them to the mode.
 *
 * @param sessions - Array of sessions to normalize
 * @param deviationThreshold - Maximum allowed deviation from mode (0-1, default 0.5 = 50%)
 * @param applyNormalization - Whether to actually modify capacity values (default true)
 * @returns Normalized sessions and counts of normalized sessions
 */
export function normalizeCapacity(
  sessions: MomenceSession[],
  deviationThreshold = 0.5,
  applyNormalization = true
): { sessions: MomenceSession[]; normalizedCount: number; modalCapacity: number } {
  if (sessions.length === 0) {
    return { sessions, normalizedCount: 0, modalCapacity: 0 };
  }

  // Find modal capacity (most common value)
  const capacityCounts = new Map<number, number>();
  sessions.forEach(s => {
    capacityCounts.set(s.capacity, (capacityCounts.get(s.capacity) || 0) + 1);
  });

  let modalCapacity = 0;
  let maxCount = 0;
  capacityCounts.forEach((count, capacity) => {
    if (count > maxCount) {
      maxCount = count;
      modalCapacity = capacity;
    }
  });

  // Guard against division by zero when all sessions have capacity 0
  if (modalCapacity === 0) {
    return { sessions: [...sessions], normalizedCount: 0, modalCapacity: 0 };
  }

  // Normalize sessions that deviate significantly from modal capacity
  let normalizedCount = 0;
  const normalized = sessions.map(s => {
    const deviation = Math.abs(s.capacity - modalCapacity) / modalCapacity;
    if (deviation > deviationThreshold) {
      normalizedCount++;
      if (applyNormalization) {
        return { ...s, capacity: modalCapacity };
      }
    }
    return s;
  });

  return { sessions: normalized, normalizedCount, modalCapacity };
}

/** Log a data quality report to console. Only logs detail lines when something was dropped/clamped. */
export function logDataQuality(label: string, report: DataQualityReport): void {
  const { dropped, clamped } = report;
  const issues =
    dropped.cancelled +
    dropped.invalidDate +
    dropped.zeroCapacity +
    dropped.outsideOperatingHours +
    clamped.ticketsExceededCapacity +
    clamped.capacityNormalized;

  if (issues === 0) {
    console.log(`[${label}] ${report.outputCount} sessions — no data quality issues`);
    return;
  }
  console.warn(
    `[${label}] ${report.inputCount} → ${report.outputCount} sessions` +
    (dropped.cancelled ? ` | ${dropped.cancelled} dropped (cancelled)` : '') +
    (dropped.invalidDate ? ` | ${dropped.invalidDate} dropped (invalid date)` : '') +
    (dropped.zeroCapacity ? ` | ${dropped.zeroCapacity} dropped (zero capacity)` : '') +
    (dropped.outsideOperatingHours ? ` | ${dropped.outsideOperatingHours} dropped (outside hours)` : '') +
    (clamped.ticketsExceededCapacity ? ` | ${clamped.ticketsExceededCapacity} clamped (tickets > capacity)` : '') +
    (clamped.capacityNormalized ? ` | ${clamped.capacityNormalized} normalized (capacity variance)` : '')
  );
}
