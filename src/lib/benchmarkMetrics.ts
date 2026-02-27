import { parseISO, differenceInDays } from 'date-fns';
import type { MomenceSession } from '@/types/momence';
import { formatDecimalHour } from '@/lib/utils';

/**
 * Convert an ISO timestamp to a decimal hour in the venue's local timezone.
 * Falls back to UTC if no timezone is provided or the Intl API fails.
 */
function getLocalDecimalHour(isoString: string, timezone?: string): number {
  const date = new Date(isoString);
  if (!timezone) {
    return date.getUTCHours() + date.getUTCMinutes() / 60;
  }
  try {
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(date);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10) % 24;
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
    return hour + minute / 60;
  } catch {
    return date.getUTCHours() + date.getUTCMinutes() / 60;
  }
}

/**
 * Return the day-of-week (0=Sunday … 6=Saturday) in the venue's local timezone.
 */
function getLocalDayOfWeek(isoString: string, timezone?: string): number {
  const date = new Date(isoString);
  if (!timezone) return date.getUTCDay();
  try {
    const dayName = new Intl.DateTimeFormat('en-AU', {
      timeZone: timezone,
      weekday: 'long',
    }).format(date);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const idx = days.indexOf(dayName);
    return idx >= 0 ? idx : date.getUTCDay();
  } catch {
    return date.getUTCDay();
  }
}

export interface OperatingHours {
  weekdayStart: number;  // e.g., 6 for 6am
  weekdayEnd: number;    // e.g., 21 for 9pm
  weekendStart: number;
  weekendEnd: number;
}

export interface BenchmarkMetrics {
  // Volume
  totalVisits: number;
  weeklyVisits: number;
  dailyVisits: number;

  // Capacity & Utilisation
  totalSessions: number;
  totalCapacity: number;
  occupancyRate: number;
  avgVisitorsPerSession: number;
  avgCapacityPerSession: number;
  /** Most common (modal) bookable seats per session — more reliable than the average for display */
  modalCapacity: number;

  // Operating structure (inferred)
  operatingHours: OperatingHours;
  weeklyOpenHours: number;
  visitsPerOpenHour: number;

  // Demand distribution
  weekdayVisits: number;
  weekendVisits: number;
  weekdayShare: number;
  weekendShare: number;

  // Time range
  daysInRange: number;
  weeksInRange: number;

  // Pricing (if available)
  avgPrice: number;
  impliedArpv: number;
}

export interface SlowFolkComparisonMetric {
  metric: string;
  value: number;
  target: number;
  unit: string;
  status: 'above' | 'below' | 'on-target';
  delta: number;
  deltaPercent: number;
}

/**
 * Calculate percentile value from sorted array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * p)));
  return sorted[index];
}

/**
 * Round to nearest half hour for clean display
 */
function roundToHalfHour(hour: number, roundUp: boolean): number {
  const rounded = roundUp ? Math.ceil(hour * 2) / 2 : Math.floor(hour * 2) / 2;
  return rounded;
}

/**
 * Infer operating hours from session data using percentile-based bounds
 * to eliminate outliers (e.g., test sessions, timezone glitches).
 * Uses 5th/95th percentile instead of absolute min/max.
 */
export function inferOperatingHours(sessions: MomenceSession[], timezone?: string): OperatingHours {
  const weekdayStartTimes: number[] = [];
  const weekdayEndTimes: number[] = [];
  const weekendStartTimes: number[] = [];
  const weekendEndTimes: number[] = [];

  sessions.forEach(session => {
    const startHour = getLocalDecimalHour(session.startsAt, timezone);
    // Use session duration to calculate actual end time
    const endHour = startHour + (session.durationMinutes || 60) / 60;
    const dayOfWeek = getLocalDayOfWeek(session.startsAt, timezone);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      weekendStartTimes.push(startHour);
      weekendEndTimes.push(endHour);
    } else {
      weekdayStartTimes.push(startHour);
      weekdayEndTimes.push(endHour);
    }
  });

  // Use percentile-based bounds (5th/95th) to drop outliers, then round to half-hour
  const safePercentileMin = (arr: number[], defaultHour = 6) => {
    if (arr.length === 0) return defaultHour;
    const p5 = percentile(arr, 0.05);
    return roundToHalfHour(p5, false); // Round down for start times
  };

  const safePercentileMax = (arr: number[], defaultHour = 21) => {
    if (arr.length === 0) return defaultHour;
    const p95 = percentile(arr, 0.95);
    return roundToHalfHour(p95, true); // Round up for end times
  };

  return {
    weekdayStart: safePercentileMin(weekdayStartTimes, 6),
    weekdayEnd: safePercentileMax(weekdayEndTimes, 21),
    weekendStart: safePercentileMin(weekendStartTimes, 6),
    weekendEnd: safePercentileMax(weekendEndTimes, 21),
  };
}

/**
 * Calculate weekly open hours from operating hours
 */
function calculateWeeklyOpenHours(hours: OperatingHours): number {
  const weekdayHours = (hours.weekdayEnd - hours.weekdayStart) * 5;
  const weekendHours = (hours.weekendEnd - hours.weekendStart) * 2;
  return weekdayHours + weekendHours;
}

/**
 * Calculate benchmark metrics from sessions
 */
export function calculateBenchmarkMetrics(
  sessions: MomenceSession[],
  fromDate: string,
  toDate: string,
  operatingHoursOverride?: OperatingHours,
  timezone?: string,
): BenchmarkMetrics {
  const from = parseISO(fromDate);
  const to = parseISO(toDate);
  const daysInRange = differenceInDays(to, from) + 1;
  // Use fractional weeks for accuracy instead of truncated integer
  // e.g. 10 days = 1.43 weeks, not 2 weeks (which would halve weeklyVisits)
  const weeksInRange = Math.max(1, daysInRange / 7);

  // Volume
  const totalVisits = sessions.reduce((sum, s) => sum + s.ticketsSold, 0);
  const weeklyVisits = totalVisits / weeksInRange;
  const dailyVisits = totalVisits / daysInRange;

  // Capacity
  const totalSessions = sessions.length;
  const totalCapacity = sessions.reduce((sum, s) => sum + s.capacity, 0);
  const occupancyRate = totalCapacity > 0 ? (totalVisits / totalCapacity) : 0;
  const avgVisitorsPerSession = totalSessions > 0 ? totalVisits / totalSessions : 0;
  const avgCapacityPerSession = totalSessions > 0 ? totalCapacity / totalSessions : 0;

  // Operating hours (use venue-local timezone so inferred times are meaningful)
  const operatingHours = operatingHoursOverride || inferOperatingHours(sessions, timezone);
  const weeklyOpenHours = calculateWeeklyOpenHours(operatingHours);
  const visitsPerOpenHour = weeklyOpenHours > 0 ? weeklyVisits / weeklyOpenHours : 0;

  // Weekday vs Weekend (timezone-aware)
  let weekdayVisits = 0;
  let weekendVisits = 0;

  sessions.forEach(session => {
    const dayOfWeek = getLocalDayOfWeek(session.startsAt, timezone);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      weekendVisits += session.ticketsSold;
    } else {
      weekdayVisits += session.ticketsSold;
    }
  });

  // Modal capacity — most common bookable seats per session
  const capacityCounts = new Map<number, number>();
  sessions.forEach(s => {
    capacityCounts.set(s.capacity, (capacityCounts.get(s.capacity) ?? 0) + 1);
  });
  let modalCapacity = 0, maxCapCount = 0;
  capacityCounts.forEach((count, cap) => {
    if (count > maxCapCount) { maxCapCount = count; modalCapacity = cap; }
  });

  const weekdayShare = totalVisits > 0 ? weekdayVisits / totalVisits : 0;
  const weekendShare = totalVisits > 0 ? weekendVisits / totalVisits : 0;

  // Pricing
  const pricesWithVolume = sessions
    .filter(s => s.fixedTicketPrice > 0 && s.ticketsSold > 0)
    .map(s => ({ price: s.fixedTicketPrice, volume: s.ticketsSold }));

  const totalPriceVolume = pricesWithVolume.reduce((sum, p) => sum + p.price * p.volume, 0);
  const totalVolume = pricesWithVolume.reduce((sum, p) => sum + p.volume, 0);
  const avgPrice = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + s.fixedTicketPrice, 0) / sessions.length
    : 0;
  const impliedArpv = totalVolume > 0 ? totalPriceVolume / totalVolume : avgPrice;

  return {
    totalVisits,
    weeklyVisits,
    dailyVisits,
    totalSessions,
    totalCapacity,
    occupancyRate,
    avgVisitorsPerSession,
    avgCapacityPerSession,
    modalCapacity,
    operatingHours,
    weeklyOpenHours,
    visitsPerOpenHour,
    weekdayVisits,
    weekendVisits,
    weekdayShare,
    weekendShare,
    daysInRange,
    weeksInRange,
    avgPrice,
    impliedArpv,
  };
}

function statusFromDeltaPercent(deltaPercent: number): 'above' | 'below' | 'on-target' {
  if (Math.abs(deltaPercent) <= 5) return 'on-target';
  return deltaPercent > 0 ? 'above' : 'below';
}

/**
 * Compare venue performance vs Slow Folk targets.
 * Values are kept in their natural units (e.g. occupancyRate is a ratio 0–1).
 */
export function compareToSlowFolk(metrics: BenchmarkMetrics): SlowFolkComparisonMetric[] {
  const targets = [
    { metric: 'Weekly Visits', value: metrics.weeklyVisits, target: 686, unit: 'visits/wk' },
    { metric: 'Occupancy Rate', value: metrics.occupancyRate, target: 0.6, unit: 'ratio' },
    { metric: 'Weekday Share', value: metrics.weekdayShare, target: 0.63, unit: 'ratio' },
    { metric: 'Visits Per Open Hour', value: metrics.visitsPerOpenHour, target: 686 / 60.5, unit: 'visits/hr' },
    { metric: 'ARPV', value: metrics.impliedArpv, target: 34.81, unit: 'currency' },
    { metric: 'Avg Visitors Per Session', value: metrics.avgVisitorsPerSession, target: 15 * 0.6, unit: 'visits/session' },
  ];

  return targets.map(t => {
    const delta = t.value - t.target;
    const deltaPercent = t.target !== 0 ? (delta / t.target) * 100 : 0;
    return {
      metric: t.metric,
      value: t.value,
      target: t.target,
      unit: t.unit,
      status: statusFromDeltaPercent(deltaPercent),
      delta,
      deltaPercent,
    };
  });
}

/**
 * Format operating hours for display. Uses formatDecimalHour so decimal hours (e.g. inferred 18.083…) render as "6:05pm".
 */
export function formatOperatingHours(hours: OperatingHours): string {
  const weekday = `${formatDecimalHour(hours.weekdayStart)}–${formatDecimalHour(hours.weekdayEnd)}`;
  const weekend = `${formatDecimalHour(hours.weekendStart)}–${formatDecimalHour(hours.weekendEnd)}`;

  if (weekday === weekend) {
    return weekday;
  }
  return `Weekdays ${weekday}, Weekends ${weekend}`;
}
