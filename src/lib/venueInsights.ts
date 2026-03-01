import type { MonthlyData } from '@/types/momence';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';

// ── Internal sort helper ───────────────────────────────────────────────────────

function sortedMonthly(data: MonthlyData[]): MonthlyData[] {
  return [...data].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return (
      new Date(`${a.month} 1, ${a.year}`).getMonth() -
      new Date(`${b.month} 1, ${b.year}`).getMonth()
    );
  });
}

// ── Partial-month detection ───────────────────────────────────────────────────

/**
 * Returns true when a month's session count is less than 40 % of the median
 * across active months. This catches single-day artefacts (e.g. March 1 as the
 * filter end date) that would distort peak/growth/occupancy calculations.
 */
export function isPartialMonth(m: MonthlyData, allMonths: MonthlyData[]): boolean {
  const active = allMonths.filter(x => x.sessions > 0);
  if (active.length < 2) return false;
  const sorted = active.map(x => x.sessions).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return m.sessions < median * 0.4;
}

/** Filter allMonths down to only full (non-partial) active months. */
function fullMonths(data: MonthlyData[]): MonthlyData[] {
  return data.filter(m => m.sessions > 0 && !isPartialMonth(m, data));
}

// ── Trajectory helpers ─────────────────────────────────────────────────────────

/**
 * The month with the highest visitor count, excluding partial months.
 * Returns null if data is empty.
 */
export function getStrongestMonth(
  data: MonthlyData[],
): { label: string; visitors: number } | null {
  const full = fullMonths(data);
  if (full.length === 0) return null;
  const peak = full.reduce((best, m) => (m.ticketsSold > best.ticketsSold ? m : best));
  return { label: `${peak.month} ${peak.year}`, visitors: peak.ticketsSold };
}

/**
 * Visitor growth: % change from the first 3-month average to the last 3-month average.
 * Partial months (e.g. a single-day month at filter boundaries) are excluded.
 * Returns 0 if the series is too short or the first average is zero.
 */
export function getVisitorGrowth(data: MonthlyData[]): number {
  const sorted = sortedMonthly(fullMonths(data));
  if (sorted.length < 2) return 0;
  const n = Math.min(3, sorted.length);
  const firstAvg = sorted.slice(0, n).reduce((s, m) => s + m.ticketsSold, 0) / n;
  const lastAvg = sorted.slice(-n).reduce((s, m) => s + m.ticketsSold, 0) / n;
  return firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;
}

/**
 * Number of months from the first full month to the first month at ≥ 80 % of peak visitors.
 * Partial months are excluded from both the series and the peak calculation.
 * Returns 0 if already at peak from the start.
 */
export function getTimeToPeak(data: MonthlyData[]): number {
  const full = fullMonths(data);
  const sorted = sortedMonthly(full);
  const peakVisitors = full.length > 0 ? Math.max(...full.map(m => m.ticketsSold)) : 0;
  const threshold = peakVisitors * 0.8;
  let count = 0;
  for (const m of sorted) {
    if (m.ticketsSold >= threshold) break;
    count++;
  }
  return count;
}

// ── Capacity helpers ───────────────────────────────────────────────────────────

/**
 * Returns a short explanatory string, e.g.
 * "259 visitors/week vs 560 seats/week → 46.3% seat occupancy"
 */
export function buildCapacityString(metrics: BenchmarkMetrics): string {
  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
  const seatCapPerWeek = metrics.modalCapacity * sessionsPerWeek;
  const occ = seatCapPerWeek > 0 ? (metrics.weeklyVisits / seatCapPerWeek) * 100 : 0;
  return (
    `${Math.round(metrics.weeklyVisits).toLocaleString()} visitors/week` +
    ` vs ${Math.round(seatCapPerWeek).toLocaleString()} seats/week` +
    ` → ${occ.toFixed(1)}% seat occupancy`
  );
}

// ── Natural-language operating model ──────────────────────────────────────────

/**
 * Returns e.g.
 * "60-minute sessions, rolling every 30 minutes with 2 concurrent sessions,
 *  allowing up to 24 guests on site at once."
 */
export function buildSessionDesignDescription(
  durationMins: number,
  rollingIntervalMins: number,
  concurrentSessions: number,
  maxSimultaneousGuests: number,
): string {
  if (durationMins === 0) {
    return 'Session design could not be determined from the available data.';
  }
  let desc = `${durationMins}-minute sessions`;
  if (rollingIntervalMins > 0) {
    desc += `, rolling every ${rollingIntervalMins} minutes`;
    if (concurrentSessions > 1) {
      desc += ` with ${concurrentSessions} concurrent sessions`;
    }
    if (maxSimultaneousGuests > 0) {
      desc += `, allowing up to ${maxSimultaneousGuests.toLocaleString()} guests on site at once`;
    }
  }
  return desc + '.';
}

/**
 * Returns e.g.
 * "Open 7 days, 92 hours per week with weekdays 7am–9pm and weekends 8am–8pm."
 */
export function buildOpeningPatternDescription(
  activeDays: number,
  openHoursPerWeek: number,
  weekdayHoursStr: string,
  weekendHoursStr: string,
): string {
  const dayStr = activeDays === 7 ? 'Open 7 days' : `Open ${activeDays} days per week`;
  const hoursStr = `${openHoursPerWeek.toFixed(0)} hours per week`;
  if (weekdayHoursStr === weekendHoursStr) {
    return `${dayStr}, ${hoursStr}, ${weekdayHoursStr} daily.`;
  }
  return `${dayStr}, ${hoursStr} with weekdays ${weekdayHoursStr} and weekends ${weekendHoursStr}.`;
}

// ── Summary sentence ───────────────────────────────────────────────────────────

/**
 * Multi-sentence human-readable summary of venue performance for the selected period.
 * Adapts to the date range reflected in `metrics` and `monthlyData`.
 */
export function buildSummary(metrics: BenchmarkMetrics, monthlyData: MonthlyData[]): string {
  // Weekly-model occupancy
  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
  const seatCapPerWeek = metrics.modalCapacity * sessionsPerWeek;
  const weeklyOcc = seatCapPerWeek > 0
    ? (metrics.weeklyVisits / seatCapPerWeek) * 100
    : metrics.occupancyRate * 100;

  const weekdayPct = Math.round(metrics.weekdayShare * 100);
  const weekendPct = 100 - weekdayPct;
  const growth = getVisitorGrowth(monthlyData);

  // Occupancy descriptor
  let occDesc = 'under-utilised';
  if (weeklyOcc >= 70) occDesc = 'near capacity';
  else if (weeklyOcc >= 50) occDesc = 'well-utilised';
  else if (weeklyOcc >= 30) occDesc = 'moderately utilised';

  // Demand skew
  const skew =
    weekdayPct >= 62
      ? `weekday-skewed — ${weekdayPct}% of visits Mon–Fri`
      : weekendPct >= 62
      ? `weekend-skewed — ${weekendPct}% of visits Sat–Sun`
      : `evenly split, with ${weekdayPct}% weekday and ${weekendPct}% weekend visits`;

  // Growth sentence (only meaningful with 3+ months of data)
  let growthSentence = '';
  if (monthlyData.length >= 3) {
    if (growth >= 10) {
      growthSentence = ` Visitor volume is up ${growth.toFixed(0)}% across the period — strong growth trajectory.`;
    } else if (growth >= 5) {
      growthSentence = ` Volume is trending up ${growth.toFixed(0)}% over the period.`;
    } else if (growth <= -10) {
      growthSentence = ` Visitor volume is down ${Math.abs(growth).toFixed(0)}% — worth monitoring.`;
    } else if (growth <= -5) {
      growthSentence = ` Volume has softened ${Math.abs(growth).toFixed(0)}% over the period.`;
    } else {
      growthSentence = ' Volume is stable across the period.';
    }
  }

  const totalVisitors = metrics.totalVisits.toLocaleString();
  const sessTotal = metrics.totalSessions.toLocaleString();
  const weeklyAvg = Math.round(metrics.weeklyVisits).toLocaleString();
  const occStr = weeklyOcc.toFixed(0);

  return (
    `${totalVisitors} visitors across ${sessTotal} sessions — ` +
    `${weeklyAvg}/week at ~${occStr}% seat occupancy, ${occDesc}. ` +
    `Demand is ${skew}.${growthSentence}`
  );
}
