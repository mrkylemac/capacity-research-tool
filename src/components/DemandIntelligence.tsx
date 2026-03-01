"use client";

import { useMemo, useState } from 'react';
import { parseISO, getHours, getMinutes, getDay } from 'date-fns';
import type { MomenceSession } from '@/types/momence';
import type { BenchmarkMetrics, OperatingHours } from '@/lib/benchmarkMetrics';
import { generateTimeSlots } from '@/lib/metricsCalculator';
import { ChevronDown } from 'lucide-react';

interface DemandIntelligenceProps {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
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
  const slotMap = new Map<string, { tickets: number[]; capacities: number[] }>();
  timeSlots.forEach(s => slotMap.set(s.label, { tickets: [], capacities: [] }));

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
          data.tickets.push(s.ticketsSold);
          data.capacities.push(s.capacity);
          break;
        }
      }
    });

  const results: SlotSummary[] = [];
  slotMap.forEach((data, slot) => {
    if (data.tickets.length === 0) return;
    const avgTickets = data.tickets.reduce((a, b) => a + b, 0) / data.tickets.length;
    const avgCap = data.capacities.reduce((a, b) => a + b, 0) / data.capacities.length;
    results.push({
      slot,
      utilisation: avgCap > 0 ? (avgTickets / avgCap) * 100 : 0,
      sessionCount: data.tickets.length,
      avgVisitors: Math.round(avgTickets * 10) / 10,
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
      visitors: data.visitors,
      sessions: data.sessions,
      isWeekend: d === 0 || d === 6,
      pctOfPeak: maxVisitors > 0 ? (data.visitors / maxVisitors) * 100 : 0,
    };
  });
}

/**
 * Peak slot list — bars are on an absolute 0-100% capacity scale.
 * A thin reference line marks the venue's overall average occupancy,
 * so each slot can be read as "above" or "below" the overall average.
 */
function PeakSlotList({
  slots,
  title,
  avgOccupancyPct,
}: {
  slots: SlotSummary[];
  title: string;
  avgOccupancyPct: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const top5 = slots.slice(0, 5);
  const rest = slots.slice(5);

  if (top5.length === 0) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">{title}</p>
        <p className="text-sm text-muted-foreground">No sessions found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header: section label + avg reference callout */}
      <div className="flex items-baseline justify-between mb-5">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">
          venue avg{' '}
          <span className="font-semibold text-foreground tabular-nums">
            {avgOccupancyPct.toFixed(0)}%
          </span>
        </p>
      </div>

      <div className="space-y-5">
        {top5.map(s => {
          const aboveAvg = s.utilisation >= avgOccupancyPct;
          return (
            <div key={s.slot}>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <span className="text-md">{s.slot}</span>
                <span className={`text-md tabular-nums font-semibold shrink-0 ${
                  aboveAvg ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {s.utilisation.toFixed(0)}%
                </span>
              </div>

              {/*
                Bar on an absolute 0-100% scale.
                Fill width = slot utilisation.
                Color: stronger when above venue avg, muted when below.
                Thin tick at the venue avg position gives visual reference
                without needing a separate legend row.
              */}
              <div className="relative h-1.5">
                {/* Track */}
                <div className="absolute inset-0 bg-muted rounded-full" />
                {/* Fill */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(s.utilisation, 100)}%`,
                    backgroundColor: aboveAvg
                      ? 'hsl(0 0% 28%)'
                      : 'hsl(0 0% 28% / 0.3)',
                  }}
                />
                {/* Average reference tick — extends above/below track for visibility */}
                {avgOccupancyPct > 0 && avgOccupancyPct <= 100 && (
                  <div
                    className="absolute top-[-3px] bottom-[-3px] w-[1.5px] rounded-full"
                    style={{
                      left: `calc(${avgOccupancyPct}% - 0.75px)`,
                      backgroundColor: 'hsl(var(--foreground) / 0.2)',
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <span>{expanded ? 'Show fewer' : `+${rest.length} more slots`}</span>
          </button>

          {expanded && (
            <div className="space-y-4 mt-4">
              {rest.map(s => (
                <div key={s.slot}>
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <span className="text-sm text-muted-foreground">{s.slot}</span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {s.utilisation.toFixed(0)}%
                    </span>
                  </div>
                  <div className="relative h-2">
                    <div className="absolute inset-0 bg-muted rounded-full" />
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${Math.min(s.utilisation, 100)}%`,
                        backgroundColor: 'hsl(0 0% 28% / 0.2)',
                      }}
                    />
                    {avgOccupancyPct > 0 && avgOccupancyPct <= 100 && (
                      <div
                        className="absolute top-[-2px] bottom-[-2px] w-px rounded-full"
                        style={{
                          left: `calc(${avgOccupancyPct}% - 0.5px)`,
                          backgroundColor: 'hsl(var(--foreground) / 0.15)',
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Renders flat (no Card wrapper) — embed inside a parent CardContent. */
export function DemandIntelligence({ sessions, metrics }: DemandIntelligenceProps) {
  const dayData = useMemo(() => buildDayOfWeekData(sessions), [sessions]);

  const { weekdaySlots, weekendSlots } = useMemo(() => ({
    weekdaySlots: buildSlotSummaries(sessions, metrics.operatingHours, false),
    weekendSlots: buildSlotSummaries(sessions, metrics.operatingHours, true),
  }), [sessions, metrics.operatingHours]);

  const weekdayTotal = metrics.weekdayVisits;
  const weekendTotal = metrics.weekendVisits;
  const totalVisits = weekdayTotal + weekendTotal;
  const weekdayPct = totalVisits > 0 ? (weekdayTotal / totalVisits) * 100 : 0;
  const weekendPct = 100 - weekdayPct;

  // Overall venue occupancy — used as the reference line in peak slot bars
  const avgOccupancyPct = metrics.occupancyRate * 100;

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-6">

      {/* ── Day-of-week horizontal bar list ── */}
      <div>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Visitors by day</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total across period</p>
          </div>
          <div className="flex gap-5 text-right shrink-0">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Weekdays</p>
              <p className="text-lg font-semibold tabular-nums leading-none tracking-[-0.02em]">{weekdayPct.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground mt-1">{weekdayTotal.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">Weekends</p>
              <p className="text-lg font-semibold tabular-nums leading-none tracking-[-0.02em]">{weekendPct.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground mt-1">{weekendTotal.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Always-visible horizontal bar list */}
        <div className="space-y-2.5">
          {dayData.map(d => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-8 shrink-0">{d.name}</span>
              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${d.pctOfPeak}%`,
                    backgroundColor: d.visitors === 0
                      ? 'transparent'
                      : d.isWeekend
                      ? 'hsl(0 0% 60%)'
                      : 'hsl(0 0% 28%)',
                  }}
                />
              </div>
              <span className="text-sm tabular-nums text-muted-foreground w-14 text-right shrink-0">
                {d.visitors > 0 ? d.visitors.toLocaleString() : '—'}
              </span>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground mt-3 flex gap-3">
          <span>
            <span className="inline-block w-2.5 h-1.5 rounded-full align-middle mr-1" style={{ backgroundColor: 'hsl(0 0% 28%)' }} />
            Weekday
          </span>
          <span>
            <span className="inline-block w-2.5 h-1.5 rounded-full align-middle mr-1" style={{ backgroundColor: 'hsl(0 0% 60%)' }} />
            Weekend
          </span>
        </p>
      </div>

      {/* ── Peak time slots — two column grid ── */}
      <div className="pt-4 border-t border-border grid grid-cols-2 gap-8">
        <PeakSlotList
          slots={weekdaySlots}
          title="Weekday peak"
          avgOccupancyPct={avgOccupancyPct}
        />
        <PeakSlotList
          slots={weekendSlots}
          title="Weekend peak"
          avgOccupancyPct={avgOccupancyPct}
        />
      </div>

    </div>
  );
}
