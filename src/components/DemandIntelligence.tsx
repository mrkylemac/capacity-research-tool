"use client";

import { useMemo, useState } from 'react';
import { parseISO, format, getHours, getMinutes, getDay } from 'date-fns';
import type { MomenceSession } from '@/types/momence';
import type { BenchmarkMetrics, OperatingHours } from '@/lib/benchmarkMetrics';
import { generateTimeSlots } from '@/lib/metricsCalculator';
import { ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@radix-ui/react-tooltip';

interface DemandIntelligenceProps {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
  /** ISO date string for the selected day when viewing a single-day period */
  selectedDate?: string;
}

interface SlotSummary {
  slot: string;
  utilisation: number;
  sessionCount: number;
  avgVisitors: number;
}

function buildSlotSummaries(
  sessions: MomenceSession[],
  hours: OperatingHours,
  weekend: boolean,
): SlotSummary[] {
  const timeSlots = generateTimeSlots(hours);
  // Track totals so block occupancy = total_booked / total_capacity (weighted, not averaged)
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
      // Weighted: total booked / total capacity in this block — matches how seat occupancy is computed everywhere else
      utilisation: data.totalCapacity > 0 ? (data.totalTickets / data.totalCapacity) * 100 : 0,
      sessionCount: data.count,
      avgVisitors: data.count > 0 ? Math.round((data.totalTickets / data.count) * 10) / 10 : 0,
    });
  });

  return results.sort((a, b) => b.utilisation - a.utilisation);
}

function buildDayOfWeekData(sessions: MomenceSession[]) {
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

/** Return sessions for a given day-of-week, grouped by calendar date. */
function buildSessionsForDay(sessions: MomenceSession[], dayIndex: number) {
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

interface AggregatedSlot {
  /** Display label, e.g. "9:00am" */
  time: string;
  /** Most common duration string, e.g. "1 hr" */
  duration: string;
  /** Number of individual sessions in this slot across all dates */
  count: number;
  /** Weighted occupancy: total booked / total capacity */
  occupancyPct: number;
  /** Avg booked per occurrence */
  avgBooked: number;
  /** Most common capacity value */
  capacity: number;
}

/**
 * Aggregate sessions for a day-of-week into per-time-slot summaries.
 * Used when the range is too wide to show individual dates usefully.
 */
function buildAggregatedSlots(sessions: MomenceSession[], dayIndex: number): AggregatedSlot[] {
  const bySlot = new Map<string, { totalBooked: number; totalCapacity: number; count: number; duration: number; capacity: number[] }>();

  sessions
    .filter(s => getDay(parseISO(s.startsAt)) === dayIndex)
    .forEach(s => {
      const key = format(parseISO(s.startsAt), 'h:mmaaa');
      if (!bySlot.has(key)) {
        bySlot.set(key, { totalBooked: 0, totalCapacity: 0, count: 0, duration: s.durationMinutes, capacity: [] });
      }
      const slot = bySlot.get(key)!;
      slot.totalBooked += s.ticketsSold;
      slot.totalCapacity += s.capacity;
      slot.count += 1;
      slot.capacity.push(s.capacity);
    });

  return Array.from(bySlot.entries())
    .sort(([a], [b]) => {
      // Sort by actual time value, not string
      const toMins = (label: string) => {
        const d = new Date(`2000-01-01 ${label}`);
        return isNaN(d.getTime()) ? 0 : d.getHours() * 60 + d.getMinutes();
      };
      return toMins(a) - toMins(b);
    })
    .map(([time, data]) => {
      // Modal capacity for this slot
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

/** Threshold: show aggregated view when a day has more than this many date instances. */
const AGGREGATE_THRESHOLD = 2;

function formatSessionTime(iso: string): string {
  return format(parseISO(iso), 'h:mmaaa');
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  return mins === 60 ? '1 hr' : `${mins / 60} hrs`;
}

/**
 * Peak slot list — bars are on an absolute 0-100% capacity scale.
 * Block occupancy = total booked in block / total capacity in block (weighted, not averaged).
 * A thin reference line marks the overall period avg so each block can be read as above/below.
 * avgOccupancyPct is the period-level occupancy to use as the reference line.
 */
function PeakSlotList({
  slots,
  title,
  avgOccupancyPct,
}: {
  slots: SlotSummary[];
  title: string;
  /** Overall period occupancy (%) used as the reference baseline */
  avgOccupancyPct: number;
}) {
  if (slots.length === 0) {
    return (
      <div>
        <p className="text-sm font-medium mb-2">{title}</p>
        <p className="text-sm text-muted-foreground">No sessions in this period</p>
      </div>
    );
  }

  // Weighted avg across all slots in this panel: total booked / total capacity
  const totalBooked = slots.reduce((s, sl) => s + sl.avgVisitors * sl.sessionCount, 0);
  const hasOverbooked = slots.some(s => s.utilisation > 100);

  return (
    <div>
      {/* Header: section label + weighted avg for this day-type */}
      <div className="flex items-baseline justify-between mb-6 flex-col">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">
          Avg{' '}
          <span className="font-semibold text-foreground tabular-nums">
            {avgOccupancyPct.toFixed(0)}%
          </span>
          {' '}
          <span className="text-xs">(session occupancy, this period)</span>
        </p>
      </div>

      <div className="space-y-1.5">
        {slots.map(s => {
          const aboveAvg = s.utilisation >= avgOccupancyPct;
          return (
            <div key={s.slot} className="relative h-8 rounded-lg overflow-hidden flex items-center px-3">
              {/* Track */}
              <div className="absolute inset-0 bg" />
              {/* Fill — capped at 100% visually; label shows true value */}
              <div
                className="absolute inset-y-0 left-0 transition-all duration-300 rounded-lg"
                style={{
                  width: `${Math.min(s.utilisation, 100)}%`,
                  backgroundColor: aboveAvg ? 'rgba(71,71,71,0.18)' : 'rgba(71,71,71,0.08)',
                }}
              />
              {/* Average reference tick */}
              {avgOccupancyPct > 0 && avgOccupancyPct <= 100 && (
                <div
                  className="absolute inset-y-1.5 w-[1.5px] rounded-full"
                  style={{
                    left: `calc(${avgOccupancyPct}% - 0.75px)`,
                    backgroundColor: 'color-mix(in srgb, var(--foreground) 25%, transparent)',
                  }}
                />
              )}
              <span className="relative z-10 text-sm">{s.slot}</span>
              <span className={`relative z-10 ml-auto text-sm tabular-nums font-medium shrink-0 ${
                aboveAvg ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {s.utilisation.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      {hasOverbooked && (
        <p className="text-xs text-muted-foreground mt-2">
          Values above 100% indicate sessions booked beyond configured capacity.
        </p>
      )}
    </div>
  );
}

/** Compute weighted occupancy % for a subset of sessions (booked / capacity). */
function computeOccupancyPct(subset: MomenceSession[]): number {
  const totalCap = subset.reduce((s, x) => s + x.capacity, 0);
  const totalBooked = subset.reduce((s, x) => s + x.ticketsSold, 0);
  return totalCap > 0 ? (totalBooked / totalCap) * 100 : 0;
}

/** Renders flat (no Card wrapper) — embed inside a parent CardContent. */
export function DemandIntelligence({ sessions, metrics, selectedDate }: DemandIntelligenceProps) {
  const dayData = useMemo(() => buildDayOfWeekData(sessions), [sessions]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const { weekdaySlots, weekendSlots } = useMemo(() => ({
    weekdaySlots: buildSlotSummaries(sessions, metrics.operatingHours, false),
    weekendSlots: buildSlotSummaries(sessions, metrics.operatingHours, true),
  }), [sessions, metrics.operatingHours]);

  const weekdayTotal = metrics.weekdayVisits;
  const weekendTotal = metrics.weekendVisits;
  const totalVisits = weekdayTotal + weekendTotal;
  const weekdayPct = totalVisits > 0 ? (weekdayTotal / totalVisits) * 100 : 0;
  const weekendPct = 100 - weekdayPct;

  // Separate occupancy averages for each panel — so the reference line is relevant to each day-type.
  const weekdaySessions = useMemo(
    () => sessions.filter(s => { const d = getDay(parseISO(s.startsAt)); return d >= 1 && d <= 5; }),
    [sessions],
  );
  const weekendSessions = useMemo(
    () => sessions.filter(s => { const d = getDay(parseISO(s.startsAt)); return d === 0 || d === 6; }),
    [sessions],
  );
  const weekdayAvgOccupancyPct = useMemo(() => computeOccupancyPct(weekdaySessions), [weekdaySessions]);
  const weekendAvgOccupancyPct = useMemo(() => computeOccupancyPct(weekendSessions), [weekendSessions]);

  const isSingleDay = metrics.daysInRange <= 1;

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-6">

      {/* ── Day-of-week horizontal bar list ── */}
      <div>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-sm font-medium mb-1">Visitors by day</p>
            <p className="text-sm text-muted-foreground">
              {isSingleDay ? 'Selected date' : 'Total across period'}
            </p>
          </div>
          <div className="flex gap-5 text-right shrink-0 items-end">
            <div>
              <p className="text-sm font-medium mb-1">Weekday</p>
              <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-pointer">
                  <p className="text-lg font-semibold tabular-nums leading-none tracking-[-0.02em]">{weekdayPct.toFixed(0)}%</p>
                </TooltipTrigger>
                <TooltipContent className="bg-black text-white rounded-lg p-2 text-xs">
                    <p>Total visitors: {weekdayTotal.toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Weekends</p>
              <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-pointer">
                  <p className="text-lg font-semibold tabular-nums leading-none tracking-[-0.02em]">{weekendPct.toFixed(0)}%</p>
                </TooltipTrigger>
                <TooltipContent className="bg-black text-white rounded-lg p-2 text-xs">
                    <p>Total visitors: {weekendTotal.toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Clickable horizontal bar list with accordion session detail */}
        <div className="space-y-1">
          {dayData.map(d => {
            const isExpanded = expandedDay === d.name;

            // Decide view mode when expanded
            const sessionGroups = isExpanded ? buildSessionsForDay(sessions, d.dayIndex) : [];
            const useAggregated = sessionGroups.length > AGGREGATE_THRESHOLD;
            const aggregatedSlots = isExpanded && useAggregated
              ? buildAggregatedSlots(sessions, d.dayIndex)
              : [];

            return (
              <div key={d.name}>
                <button
                  type="button"
                  onClick={() => setExpandedDay(isExpanded ? null : d.name)}
                  className="relative h-8 rounded-lg overflow-hidden flex items-center px-3 w-full text-left hover:opacity-80 transition-opacity"
                >
                  {/* Track */}
                  <div className="absolute inset-0 bg" />
                  {/* Fill */}
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-500 rounded-lg"
                    style={{
                      width: `${d.pctOfPeak}%`,
                      backgroundColor: d.visitors === 0
                        ? 'transparent'
                        : d.isWeekend
                        ? 'rgba(153,153,153,0.35)'
                        : 'rgba(71,71,71,0.18)',
                    }}
                  />
                  <span className="relative z-10 text-sm">{d.name}</span>
                  <span className="relative z-10 ml-auto text-sm tabular-nums text-foreground">
                    {d.visitors > 0 ? d.visitors.toLocaleString() : '—'}
                  </span>
                  <ChevronDown
                    className={`relative z-10 ml-2 h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Accordion content */}
                {isExpanded && (
                  <div className="mt-1 mb-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                    {sessionGroups.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sessions for this day in the selected period</p>
                    ) : useAggregated ? (
                      /* ── Aggregated view: avg occupancy per time slot across all dates ── */
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground mb-2">
                          Avg across {sessionGroups.length} {d.name}s
                        </p>
                        <div className="space-y-1">
                          {aggregatedSlots.map(slot => (
                            <div key={slot.time} className="flex items-center justify-between text-sm">
                              <span className="text-foreground">
                                {slot.time}
                                <span className="text-muted-foreground ml-1">({slot.duration})</span>
                              </span>
                              <span className="tabular-nums font-medium">
                                {slot.avgBooked.toFixed(1)}
                                <span className="text-muted-foreground font-normal">/{slot.capacity} avg</span>
                                <span className="text-muted-foreground font-normal ml-1.5 text-[11px]">
                                  {slot.occupancyPct.toFixed(0)}%
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* ── Per-date view: individual session rows ── */
                      <div className="space-y-3">
                        {sessionGroups.map(({ date, sessions: daySessions }) => (
                          <div key={date}>
                            {sessionGroups.length > 1 && (
                              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                                {format(parseISO(date), 'd MMM yyyy')}
                              </p>
                            )}
                            <div className="space-y-1">
                              {daySessions.map(s => (
                                <div key={s.id} className="flex items-center justify-between text-sm">
                                  <span className="text-foreground">
                                    {formatSessionTime(s.startsAt)}
                                    <span className="text-muted-foreground ml-1">({formatDuration(s.durationMinutes)})</span>
                                  </span>
                                  <span className="tabular-nums font-medium">
                                    {s.ticketsSold}<span className="text-muted-foreground font-normal">/{s.capacity} spots</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Peak time slots — two column grid ── */}
      <div className="pt-4 border-t border-border grid grid-cols-2 gap-8">
        <PeakSlotList
          slots={weekdaySlots}
          title="Weekday Peak"
          avgOccupancyPct={weekdayAvgOccupancyPct}
        />
        <PeakSlotList
          slots={weekendSlots}
          title="Weekend Peak"
          avgOccupancyPct={weekendAvgOccupancyPct}
        />
      </div>

    </div>
  );
}
