import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MomenceSession } from '@/types/momence';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format decimal hours (e.g. 18.083) as readable time (e.g. "6:05pm"). Use for all HOI/operating-hours display. */
export function formatDecimalHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60) % 60;
  const period = h >= 12 ? 'pm' : 'am';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
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
  };
  clamped: {
    ticketsExceededCapacity: number;
  };
}

/**
 * Sanitize sessions from any platform. Drops cancelled/invalid records, clamps values.
 * Call this once after all pages are fetched and date-filtered.
 */
export function sanitizeSessions(sessions: MomenceSession[]): { sessions: MomenceSession[]; report: DataQualityReport } {
  const report: DataQualityReport = {
    inputCount: sessions.length,
    outputCount: 0,
    dropped: { cancelled: 0, invalidDate: 0, zeroCapacity: 0 },
    clamped: { ticketsExceededCapacity: 0 },
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

/** Log a data quality report to console. Only logs detail lines when something was dropped/clamped. */
export function logDataQuality(label: string, report: DataQualityReport): void {
  const { dropped, clamped } = report;
  const issues = dropped.cancelled + dropped.invalidDate + dropped.zeroCapacity + clamped.ticketsExceededCapacity;
  if (issues === 0) {
    console.log(`[${label}] ${report.outputCount} sessions — no data quality issues`);
    return;
  }
  console.warn(
    `[${label}] ${report.inputCount} → ${report.outputCount} sessions` +
    (dropped.cancelled ? ` | ${dropped.cancelled} dropped (cancelled)` : '') +
    (dropped.invalidDate ? ` | ${dropped.invalidDate} dropped (invalid date)` : '') +
    (dropped.zeroCapacity ? ` | ${dropped.zeroCapacity} dropped (zero capacity)` : '') +
    (clamped.ticketsExceededCapacity ? ` | ${clamped.ticketsExceededCapacity} clamped (tickets > capacity)` : '')
  );
}
