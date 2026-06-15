import { parseISO, format, getDay } from 'date-fns';
import type { MomenceSession } from '@/types/momence';
import type { OperatingHours } from '@/lib/benchmarkMetrics';
import { generateTimeSlots } from '@/lib/metricsCalculator';
import { getHours, getMinutes } from 'date-fns';

// ── Types ──

export interface SlotSummary {
  slot: string;
  utilisation: number;
  sessionCount: number;
  avgVisitors: number;
}

export interface AggregatedSlot {
  time: string;
  duration: string;
  count: number;
  occupancyPct: number;
  avgBooked: number;
  capacity: number;
}

export interface DetailTarget {
  name: string;
  dayIndex: number;
  visitors: number;
  dateCount: number;
}

export interface MonthGroup {
  monthKey: string;
  monthLabel: string;
  dateGroups: { date: string; sessions: MomenceSession[] }[];
  avgOccupancyPct: number;
  totalVisitors: number;
  sessionCount: number;
}

export interface DayOfWeekEntry {
  name: string;
  dayIndex: number;
  visitors: number;
  sessions: number;
  isWeekend: boolean;
  pctOfPeak: number;
}

// ── Constants ──

export const AGGREGATE_THRESHOLD = 2;

// ── Helpers ──

export function formatSessionTime(iso: string): string {
  return format(parseISO(iso), 'h:mmaaa');
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  return mins === 60 ? '1 hr' : `${mins / 60} hrs`;
}

// ── Data builders ──

export function buildDayOfWeekData(sessions: MomenceSession[]): DayOfWeekEntry[] {
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const totals = new Map<number, { visitors: number; sessions: number }>();
  DAY_ORDER.forEach(d => totals.set(d, { visitors: 0, sessions: 0 }));

  sessions.forEach(s => {
    const day = getDay(parseISO(s.startsAt));
    const entry = totals.get(day)!;
    entry.visitors += s.ticketsSold;
    entry.sessions += 1;
  });

  const maxVisitors = Math.max(...DAY_ORDER.map(d => totals.get(d)!.visitors));

  return DAY_ORDER.map((d, i) => {
    const data = totals.get(d)!;
    return {
      name: DAY_NAMES[i],
      dayIndex: d,
      visitors: data.visitors,
      sessions: data.sessions,
      isWeekend: d === 0 || d === 6,
      pctOfPeak: maxVisitors > 0 ? (data.visitors / maxVisitors) * 100 : 0,
    };
  });
}

export function buildSessionsForDay(sessions: MomenceSession[], dayIndex: number) {
  const byDate = new Map<string, MomenceSession[]>();
  sessions
    .filter(s => getDay(parseISO(s.startsAt)) === dayIndex)
    .forEach(s => {
      const date = format(parseISO(s.startsAt), 'yyyy-MM-dd');
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(s);
    });
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySessions]) => ({
      date,
      sessions: [...daySessions].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    }));
}

export function buildAggregatedSlots(sessions: MomenceSession[], dayIndex: number): AggregatedSlot[] {
  const bySlot = new Map<string, {
    totalBooked: number; totalCapacity: number; count: number;
    duration: number; capacity: number[];
    minutesSinceMidnight: number;
  }>();

  sessions
    .filter(s => getDay(parseISO(s.startsAt)) === dayIndex)
    .forEach(s => {
      const parsed = parseISO(s.startsAt);
      const key = format(parsed, 'h:mmaaa');
      const mins = getHours(parsed) * 60 + getMinutes(parsed);
      if (!bySlot.has(key)) {
        bySlot.set(key, { totalBooked: 0, totalCapacity: 0, count: 0, duration: s.durationMinutes, capacity: [], minutesSinceMidnight: mins });
      }
      const slot = bySlot.get(key)!;
      slot.totalBooked += s.ticketsSold;
      slot.totalCapacity += s.capacity;
      slot.count += 1;
      slot.capacity.push(s.capacity);
    });

  return Array.from(bySlot.entries())
    .sort(([, a], [, b]) => a.minutesSinceMidnight - b.minutesSinceMidnight)
    .map(([time, data]) => {
      const capCounts = new Map<number, number>();
      data.capacity.forEach(c => capCounts.set(c, (capCounts.get(c) ?? 0) + 1));
      let modalCap = data.capacity[0] ?? 0;
      let maxCount = 0;
      capCounts.forEach((cnt, cap) => { if (cnt > maxCount) { maxCount = cnt; modalCap = cap; } });

      return {
        time,
        duration: formatDuration(data.duration),
        count: data.count,
        occupancyPct: data.totalCapacity > 0 ? (data.totalBooked / data.totalCapacity) * 100 : 0,
        avgBooked: data.count > 0 ? data.totalBooked / data.count : 0,
        capacity: modalCap,
      };
    });
}

export function buildMonthlyGroupedSessions(sessions: MomenceSession[], dayIndex: number): MonthGroup[] {
  const dateGroups = buildSessionsForDay(sessions, dayIndex);

  const monthMap = new Map<string, {
    dateGroups: { date: string; sessions: MomenceSession[] }[];
    totalBooked: number;
    totalCap: number;
    sessionCount: number;
  }>();

  dateGroups.forEach(group => {
    const monthKey = group.date.substring(0, 7);
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, { dateGroups: [], totalBooked: 0, totalCap: 0, sessionCount: 0 });
    }
    const month = monthMap.get(monthKey)!;
    month.dateGroups.push(group);
    group.sessions.forEach(s => {
      month.totalBooked += s.ticketsSold;
      month.totalCap += s.capacity;
      month.sessionCount += 1;
    });
  });

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, data]) => ({
      monthKey,
      monthLabel: format(parseISO(`${monthKey}-01`), 'MMMM yyyy'),
      dateGroups: data.dateGroups,
      avgOccupancyPct: data.totalCap > 0 ? (data.totalBooked / data.totalCap) * 100 : 0,
      totalVisitors: data.totalBooked,
      sessionCount: data.sessionCount,
    }));
}

export function buildSlotSummaries(
  sessions: MomenceSession[],
  hours: OperatingHours,
  weekend: boolean,
): SlotSummary[] {
  const timeSlots = generateTimeSlots(hours);
  const slotMap = new Map<string, { totalTickets: number; totalCapacity: number; count: number }>();
  timeSlots.forEach(s => slotMap.set(s.label, { totalTickets: 0, totalCapacity: 0, count: 0 }));

  sessions
    .filter(s => {
      const day = getDay(parseISO(s.startsAt));
      return weekend ? day === 0 || day === 6 : day >= 1 && day <= 5;
    })
    .forEach(s => {
      const date = parseISO(s.startsAt);
      const h = getHours(date) + getMinutes(date) / 60;
      for (const slot of timeSlots) {
        if (h >= slot.start && h < slot.end) {
          const data = slotMap.get(slot.label)!;
          data.totalTickets += s.ticketsSold;
          data.totalCapacity += s.capacity;
          data.count += 1;
          break;
        }
      }
    });

  const results: SlotSummary[] = [];
  slotMap.forEach((data, slot) => {
    if (data.count === 0) return;
    results.push({
      slot,
      utilisation: data.totalCapacity > 0 ? (data.totalTickets / data.totalCapacity) * 100 : 0,
      sessionCount: data.count,
      avgVisitors: data.count > 0 ? Math.round((data.totalTickets / data.count) * 10) / 10 : 0,
    });
  });

  return results.sort((a, b) => b.utilisation - a.utilisation);
}

export function computeOccupancyPct(subset: MomenceSession[]): number {
  const totalCap = subset.reduce((s, x) => s + x.capacity, 0);
  const totalBooked = subset.reduce((s, x) => s + x.ticketsSold, 0);
  return totalCap > 0 ? (totalBooked / totalCap) * 100 : 0;
}
