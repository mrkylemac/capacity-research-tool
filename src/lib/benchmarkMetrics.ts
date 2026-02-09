import { parseISO, getDay, getHours, getMinutes, differenceInDays } from 'date-fns';
import type { MomenceSession } from '@/types/momence';
import { SLOW_FOLK_TARGETS } from '@/config/slowfolk';

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

export interface BenchmarkComparison {
  metric: string;
  value: number;
  target: number;
  unit: string;
  status: 'above' | 'below' | 'on-target';
  delta: number;       // Absolute difference
  deltaPercent: number; // Percentage difference
}

/**
 * Infer operating hours from session data
 */
export function inferOperatingHours(sessions: MomenceSession[]): OperatingHours {
  const weekdayStartTimes: number[] = [];
  const weekdayEndTimes: number[] = [];
  const weekendStartTimes: number[] = [];
  const weekendEndTimes: number[] = [];

  sessions.forEach(session => {
    const startDate = parseISO(session.startsAt);
    const startHour = getHours(startDate) + getMinutes(startDate) / 60;
    // Use session duration to calculate actual end time
    const endHour = startHour + (session.durationMinutes || 60) / 60;
    const dayOfWeek = getDay(startDate);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      weekendStartTimes.push(startHour);
      weekendEndTimes.push(endHour);
    } else {
      weekdayStartTimes.push(startHour);
      weekdayEndTimes.push(endHour);
    }
  });

  const safeMin = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : 6;
  const safeMax = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 21;

  return {
    weekdayStart: safeMin(weekdayStartTimes),
    weekdayEnd: safeMax(weekdayEndTimes),
    weekendStart: safeMin(weekendStartTimes),
    weekendEnd: safeMax(weekendEndTimes),
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
  operatingHoursOverride?: OperatingHours
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

  // Operating hours
  const operatingHours = operatingHoursOverride || inferOperatingHours(sessions);
  const weeklyOpenHours = calculateWeeklyOpenHours(operatingHours);
  const visitsPerOpenHour = weeklyOpenHours > 0 ? weeklyVisits / weeklyOpenHours : 0;

  // Weekday vs Weekend
  let weekdayVisits = 0;
  let weekendVisits = 0;

  sessions.forEach(session => {
    const date = parseISO(session.startsAt);
    const dayOfWeek = getDay(date);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      weekendVisits += session.ticketsSold;
    } else {
      weekdayVisits += session.ticketsSold;
    }
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

/**
 * Compare benchmark metrics to Slow Folk targets
 */
export function compareToSlowFolk(metrics: BenchmarkMetrics): BenchmarkComparison[] {
  const comparisons: BenchmarkComparison[] = [];

  const addComparison = (
    metric: string,
    value: number,
    target: number,
    unit: string,
    higherIsBetter = true
  ) => {
    const delta = value - target;
    const deltaPercent = target !== 0 ? (delta / target) * 100 : 0;
    const tolerance = 0.05; // 5% tolerance for "on-target"

    let status: 'above' | 'below' | 'on-target';
    if (Math.abs(deltaPercent) <= tolerance * 100) {
      status = 'on-target';
    } else if (higherIsBetter) {
      status = delta > 0 ? 'above' : 'below';
    } else {
      status = delta < 0 ? 'above' : 'below';
    }

    comparisons.push({ metric, value, target, unit, status, delta, deltaPercent });
  };

  // Weekly visits vs target
  addComparison(
    'Weekly Visits',
    Math.round(metrics.weeklyVisits),
    SLOW_FOLK_TARGETS.weeklyVisits,
    'visits/week'
  );

  // Occupancy vs target
  addComparison(
    'Occupancy Rate',
    metrics.occupancyRate * 100,
    SLOW_FOLK_TARGETS.occupancy.target * 100,
    '%'
  );

  // Weekday/weekend split
  addComparison(
    'Weekday Share',
    metrics.weekdayShare * 100,
    SLOW_FOLK_TARGETS.weekdayShare * 100,
    '%'
  );

  // Visits per open hour (normalised efficiency)
  const targetVisitsPerHour = SLOW_FOLK_TARGETS.weeklyVisits / SLOW_FOLK_TARGETS.weeklyHours.total;
  addComparison(
    'Visits/Open Hour',
    metrics.visitsPerOpenHour,
    targetVisitsPerHour,
    'visits/hr'
  );

  // ARPV if we have pricing data
  if (metrics.impliedArpv > 0) {
    addComparison(
      'ARPV',
      metrics.impliedArpv,
      SLOW_FOLK_TARGETS.arpv,
      '$'
    );
  }

  // Visitors per session (fill rate)
  const targetFillRate = SLOW_FOLK_TARGETS.concurrentSeats * SLOW_FOLK_TARGETS.occupancy.target;
  addComparison(
    'Visitors/Session',
    metrics.avgVisitorsPerSession,
    targetFillRate,
    'visitors'
  );

  return comparisons;
}

/**
 * Format operating hours for display
 */
export function formatOperatingHours(hours: OperatingHours): string {
  const formatHour = (h: number) => {
    const period = h >= 12 ? 'pm' : 'am';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}${period}`;
  };

  const weekday = `${formatHour(hours.weekdayStart)}–${formatHour(hours.weekdayEnd)}`;
  const weekend = `${formatHour(hours.weekendStart)}–${formatHour(hours.weekendEnd)}`;

  if (weekday === weekend) {
    return weekday;
  }
  return `Weekdays ${weekday}, Weekends ${weekend}`;
}
