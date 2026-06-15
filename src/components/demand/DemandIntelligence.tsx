"use client";

import { useMemo, useState } from 'react';
import { parseISO, getDay } from 'date-fns';
import type { MomenceSession } from '@/types/momence';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { DetailTarget, SlotSummary } from './utils';
import {
  buildDayOfWeekData,
  buildAggregatedSlots,
  buildSessionsForDay,
  buildSlotSummaries,
  computeOccupancyPct,
} from './utils';
import { HeatmapStrip } from './HeatmapStrip';
import { DayDetailPanel } from './DayDetailPanel';

interface DemandIntelligenceProps {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
  selectedDate?: string;
}

function PeakSlotList({
  slots,
  title,
  avgOccupancyPct,
}: {
  slots: SlotSummary[];
  title: string;
  avgOccupancyPct: number;
}) {
  if (slots.length === 0) {
    return (
      <div>
        <p className="text-base font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">No sessions in this period</p>
      </div>
    );
  }

  const hasOverbooked = slots.some(s => s.utilisation > 100);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6 flex-col">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">
          Avg{' '}
          <span className="font-semibold text-foreground tabular-nums">
            {avgOccupancyPct.toFixed(0)}%
          </span>
          {' '}
        </p>
        <span className="text-xs opacity-40">(session occupancy, this period)</span>
      </div>

      <div className="space-y-1.5">
        {slots.map(s => {
          const aboveAvg = s.utilisation >= avgOccupancyPct;
          return (
            <div key={s.slot} className="relative h-8 rounded-lg overflow-hidden flex items-center px-3">
              <div className="absolute inset-0 bg" />
              <div
                className="absolute inset-y-0 left-0 transition-[width,background-color] duration-300 rounded-lg"
                style={{
                  width: `${Math.min(s.utilisation, 100)}%`,
                  backgroundColor: aboveAvg ? 'color-mix(in srgb, var(--chart-fill) 18%, transparent)' : 'color-mix(in srgb, var(--chart-fill) 8%, transparent)',
                }}
              />
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

export function DemandIntelligence({ sessions, metrics, selectedDate }: DemandIntelligenceProps) {
  const dayData = useMemo(() => buildDayOfWeekData(sessions), [sessions]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);

  const { weekdaySlots, weekendSlots } = useMemo(() => ({
    weekdaySlots: buildSlotSummaries(sessions, metrics.operatingHours, false),
    weekendSlots: buildSlotSummaries(sessions, metrics.operatingHours, true),
  }), [sessions, metrics.operatingHours]);

  const weekdayTotal = metrics.weekdayVisits;
  const weekendTotal = metrics.weekendVisits;
  const totalVisits = weekdayTotal + weekendTotal;
  const weekdayPct = totalVisits > 0 ? (weekdayTotal / totalVisits) * 100 : 0;
  const weekendPct = 100 - weekdayPct;

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
            <p className="text-sm font-medium">Visitors by day</p>
            <p className="text-sm text-muted-foreground">
              {isSingleDay ? 'Selected date' : 'Total across period'}
            </p>
          </div>
          <div className="flex gap-5 text-right shrink-0 items-end">
            <div>
              <p className="text-sm font-medium">Weekday</p>
              <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-pointer">
                  <p className="text-lg font-semibold tabular-nums leading-none tracking-[-0.02em]">{weekdayPct.toFixed(0)}%</p>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Total visitors: {weekdayTotal.toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <p className="text-sm font-medium">Weekends</p>
              <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="cursor-pointer">
                  <p className="text-lg font-semibold tabular-nums leading-none tracking-[-0.02em]">{weekendPct.toFixed(0)}%</p>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Total visitors: {weekendTotal.toLocaleString()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Clickable horizontal bar list with heatmap strip */}
        <div className="space-y-1">
          {dayData.map(d => {
            const isExpanded = expandedDay === d.name;

            // Compute heatmap data lazily only when expanded
            const aggregatedSlots = isExpanded
              ? buildAggregatedSlots(sessions, d.dayIndex)
              : [];
            const dateCount = isExpanded
              ? buildSessionsForDay(sessions, d.dayIndex).length
              : 0;

            return (
              <div key={d.name}>
                <button
                  type="button"
                  onClick={() => setExpandedDay(isExpanded ? null : d.name)}
                  className="relative h-8 rounded-lg overflow-hidden flex items-center px-3 w-full text-left hover:opacity-80 active:scale-[0.98] transition-[opacity,transform]"
                >
                  <div className="absolute inset-0 bg" />
                  <div
                    className="absolute inset-y-0 left-0 transition-[width,background-color] duration-500 rounded-lg"
                    style={{
                      width: `${d.pctOfPeak}%`,
                      backgroundColor: d.visitors === 0
                        ? 'transparent'
                        : d.isWeekend
                        ? 'color-mix(in srgb, var(--muted-foreground) 35%, transparent)'
                        : 'color-mix(in srgb, var(--chart-fill) 18%, transparent)',
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

                {/* Layer 2: Heatmap strip */}
                {isExpanded && (
                  <div className="mt-1 mb-1 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <HeatmapStrip
                      slots={aggregatedSlots}
                      dateCount={dateCount}
                      dayName={d.name}
                      isSingleDay={isSingleDay}
                      onOpenDetail={() => setDetailTarget({
                        name: d.name,
                        dayIndex: d.dayIndex,
                        visitors: d.visitors,
                        dateCount,
                      })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Peak time slots — two column grid ── */}
      <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
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

      {/* Layer 3: Detail panel (Sheet on desktop, Drawer on mobile) */}
      <DayDetailPanel
        target={detailTarget}
        onClose={() => setDetailTarget(null)}
        sessions={sessions}
        isSingleDay={isSingleDay}
      />
    </div>
  );
}
