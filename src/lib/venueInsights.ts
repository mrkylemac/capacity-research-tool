import { format } from 'date-fns';
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
  // Use non-overlapping windows so growth is meaningful even with 2 months
  const n = Math.min(3, Math.floor(sorted.length / 2));
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
 * Returns a short explanatory string describing capacity vs demand for the period.
 * For single-day filters: "110 visitors vs 60 seats → 183.3% seat occupancy"
 * For multi-day filters:  "259 visitors/week vs 560 seats/week → 46.3% seat occupancy"
 *
 * The trailing % always uses totalVisits/totalCapacity so it matches the headline
 * occupancy figure shown in SnapshotSection and CapacitySection.
 */
export function buildCapacityString(metrics: BenchmarkMetrics): string {
  // Consistent aggregate occupancy — matches occupancyRate on BenchmarkMetrics
  const occ = metrics.totalCapacity > 0 ? (metrics.totalVisits / metrics.totalCapacity) * 100 : 0;

  if (metrics.daysInRange <= 1) {
    return (
      `${metrics.totalVisits.toLocaleString()} visitors today` +
      ` vs ${metrics.totalCapacity.toLocaleString()} seats today` +
      ` → ${occ.toFixed(1)}% seat occupancy today`
    );
  }

  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
  const seatCapPerWeek = metrics.modalCapacity * sessionsPerWeek;
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
  // Use aggregate occupancy — consistent with headline % and buildCapacityString
  const occupancyPct = metrics.occupancyRate * 100;

  const weekdayPct = Math.round(metrics.weekdayShare * 100);
  const weekendPct = 100 - weekdayPct;
  const growth = getVisitorGrowth(monthlyData);

  // Occupancy descriptor
  let occDesc = 'under-utilised';
  if (occupancyPct >= 70) occDesc = 'near capacity';
  else if (occupancyPct >= 50) occDesc = 'well-utilised';
  else if (occupancyPct >= 30) occDesc = 'moderately utilised';

  // Demand skew
  const skew =
    weekdayPct >= 62
      ? `weekday-skewed — ${weekdayPct}% of visits Mon–Fri`
      : weekendPct >= 62
      ? `weekend-skewed — ${weekendPct}% of visits Sat–Sun`
      : `evenly split, with ${weekdayPct}% weekday and ${weekendPct}% weekend visits`;

  // Growth sentence — only meaningful when enough full months exist for non-overlapping windows
  const fullMonthCount = fullMonths(monthlyData).length;
  let growthSentence = '';
  if (fullMonthCount >= 3) {
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
  const occStr = occupancyPct.toFixed(0);

  return (
    `${totalVisitors} visitors across ${sessTotal} sessions — ` +
    `${weeklyAvg}/week at ~${occStr}% seat occupancy, ${occDesc}. ` +
    `Demand is ${skew}.${growthSentence}`
  );
}

// ── New types ─────────────────────────────────────────────────────────────────

export interface PeriodSummary {
  startDate: string;        // ISO, from BenchmarkMetrics.computedFrom
  endDate: string;          // ISO, from BenchmarkMetrics.computedTo
  periodLabel: string;      // e.g. "3 months"
  weeksInPeriod: number;    // e.g. 13.0
  visitorsPerWeek: number;
  seatsPerWeek: number;     // totalCapacity / weeksInPeriod
  sessionsPerWeek: number;
  visitorsPerDay: number;
  occupancyPercent: number; // same as occupancyRate * 100
  subtitle: string;         // "30.9% seat occupancy on average over the last 13 weeks (2 Dec 2025 – 2 Mar 2026)"
}

export interface MonthlyTrajectoryPoint {
  monthLabel: string;     // "Jan '26"
  visitors: number;
  seats: number;          // sum of session capacities for that month
  occupancy: number;      // visitors / seats (0–1), or 0 if seats = 0
  isPartial: boolean;
  isLowData: boolean;
}

export interface CapacityUtilisationBar {
  totalCapacitySeats: number;
  usedCapacitySeats: number;
  occupancyPercent: number;
  label?: string;
  subtitle?: string;
  referenceMarkers?: { label: string; percent: number }[];
}

export type CapacityStatsGrid = Array<{
  label: string;
  value: string;
  hint?: string;
}>;

// ── New computation helpers ────────────────────────────────────────────────────

/** Human-readable period label from days in range. */
function buildPeriodLabel(daysInRange: number, weeksInRange: number): string {
  if (daysInRange < 8) {
    return `${daysInRange} day${daysInRange === 1 ? '' : 's'}`;
  }
  const weeks = Math.round(weeksInRange);
  if (weeksInRange < 5) {
    return `${weeks} week${weeks === 1 ? '' : 's'}`;
  }
  const months = daysInRange / 30.4375;
  if (months < 11) {
    const m = Math.round(months);
    return `${m} month${m === 1 ? '' : 's'}`;
  }
  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? '' : 's'}`;
}

/**
 * Derives all period-level averages from BenchmarkMetrics aggregate totals.
 * Uses the same totalVisits/totalCapacity formula as occupancyRate so every
 * number cross-checks with the headline % shown in SnapshotSection.
 */
export function computePeriodSummary(metrics: BenchmarkMetrics): PeriodSummary {
  const { totalVisits, totalCapacity, weeksInRange, daysInRange, totalSessions, computedFrom, computedTo } = metrics;

  const visitorsPerWeek = totalVisits / weeksInRange;
  const seatsPerWeek = totalCapacity / weeksInRange;
  const sessionsPerWeek = totalSessions / weeksInRange;
  const visitorsPerDay = totalVisits / daysInRange;
  const occupancyPercent = totalCapacity > 0 ? (totalVisits / totalCapacity) * 100 : 0;

  const periodLabel = buildPeriodLabel(daysInRange, weeksInRange);

  const fromDate = new Date(computedFrom);
  const toDate = new Date(computedTo);
  const dateLabel = `${format(fromDate, 'd MMM yyyy')} – ${format(toDate, 'd MMM yyyy')}`;
  const subtitle = `${occupancyPercent.toFixed(1)}% seat occupancy on average over the last ${periodLabel} (${dateLabel})`;

  return {
    startDate: computedFrom,
    endDate: computedTo,
    periodLabel,
    weeksInPeriod: weeksInRange,
    visitorsPerWeek,
    seatsPerWeek,
    sessionsPerWeek,
    visitorsPerDay,
    occupancyPercent,
    subtitle,
  };
}

/**
 * Maps MonthlyData[] to MonthlyTrajectoryPoint[], enriching each bar with
 * occupancy %, partial-month flags, and low-data flags.
 *
 * Partial detection uses both the heuristic (< 40% of median session count)
 * and a calendar-boundary check against dateRange.from / dateRange.to.
 */
export function computeMonthlyTrajectory(
  monthlyData: MonthlyData[],
  dateRange: { from: string; to: string },
  thresholds?: { minVisitors?: number },
): MonthlyTrajectoryPoint[] {
  const sorted = sortedMonthly(monthlyData);
  const fromDate = new Date(dateRange.from);
  const toDate = new Date(dateRange.to);

  return sorted.map((m) => {
    const monthDate = new Date(`${m.month} 1, ${m.year}`);
    const monthIdx = monthDate.getMonth();
    const monthYear = monthDate.getFullYear();

    // Calendar boundaries of this month
    const monthStart = new Date(monthYear, monthIdx, 1);
    const monthEnd = new Date(monthYear, monthIdx + 1, 0);

    // Partial by boundary: the filter cuts into the first or last calendar month
    const isPartialByBoundary =
      (fromDate > monthStart && fromDate <= monthEnd) ||
      (toDate >= monthStart && toDate < monthEnd);
    const isPartialByHeuristic = isPartialMonth(m, monthlyData);
    const isPartial = isPartialByBoundary || isPartialByHeuristic;

    const occupancy = m.capacity > 0 ? m.ticketsSold / m.capacity : 0;
    const isLowData = isPartial || m.ticketsSold < (thresholds?.minVisitors ?? 50);

    return {
      monthLabel: `${m.month.slice(0, 3)} '${String(m.year).slice(-2)}`,
      visitors: m.ticketsSold,
      seats: m.capacity,
      occupancy,
      isPartial,
      isLowData,
    };
  });
}

/** Thin wrapper that reads directly from BenchmarkMetrics + PeriodSummary. */
export function computeCapacityUtilisationBar(
  metrics: BenchmarkMetrics,
  periodSummary: PeriodSummary,
): CapacityUtilisationBar {
  return {
    totalCapacitySeats: metrics.totalCapacity,
    usedCapacitySeats: metrics.totalVisits,
    occupancyPercent: periodSummary.occupancyPercent,
    label: `${periodSummary.occupancyPercent.toFixed(1)}% seat occupancy`,
    subtitle: `Over ${periodSummary.periodLabel} (${periodSummary.startDate} – ${periodSummary.endDate})`,
  };
}

/**
 * Returns the 5 structural stat tiles for the Capacity section grid.
 * seatsPerWeek uses totalCapacity / weeksInRange so it cross-checks identically
 * with the headline occupancy %.
 */
export function computeCapacityStatsGrid(
  metrics: BenchmarkMetrics,
  periodSummary: PeriodSummary,
): CapacityStatsGrid {
  return [
    { label: 'Visitors / week', value: Math.round(periodSummary.visitorsPerWeek).toLocaleString() },
    { label: 'Seats / week', value: Math.round(periodSummary.seatsPerWeek).toLocaleString() },
    { label: 'Visitors / day', value: Math.round(periodSummary.visitorsPerDay).toLocaleString() },
    { label: 'Sessions / week', value: periodSummary.sessionsPerWeek.toFixed(1) },
    { label: 'Seats / session', value: metrics.modalCapacity.toString() },
  ];
}
