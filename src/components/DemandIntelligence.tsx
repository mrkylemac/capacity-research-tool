"use client";

import { useMemo, useState } from 'react';
import { parseISO, getHours, getMinutes, getDay } from 'date-fns';
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import type { MomenceSession } from '@/types/momence';
import type { BenchmarkMetrics, OperatingHours } from '@/lib/benchmarkMetrics';
import { generateTimeSlots } from '@/lib/metricsCalculator';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
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

/** Build visitors + sessions totals per day-of-week (Mon–Sun order) */
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

function PeakSlotList({ slots, title }: { slots: SlotSummary[]; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const top5 = slots.slice(0, 5);
  const rest = slots.slice(5);
  const max = top5[0]?.utilisation ?? 0;

  if (top5.length === 0) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{title}</p>
        <p className="text-xs text-muted-foreground">No sessions found</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">{title}</p>
      <div className="space-y-3.5">
        {top5.map((s, i) => (
          <div key={s.slot} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground w-4 shrink-0 tabular-nums">{i + 1}</span>
                <span className="text-sm font-semibold">{s.slot}</span>
              </div>
              <div className="flex items-baseline gap-2 shrink-0">
                <span className="text-xs text-muted-foreground tabular-nums">
                  avg {s.avgVisitors} visitors
                </span>
                <span className={`text-sm font-semibold tabular-nums ${
                  s.utilisation >= 70 ? 'text-emerald-600' : 'text-foreground'
                }`}>
                  {s.utilisation.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden ml-6">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${max > 0 ? (s.utilisation / max) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <span>{expanded ? 'Show fewer slots' : `+${rest.length} more slots`}</span>
          </button>
          {expanded && (
            <div className="space-y-3.5 mt-3">
              {rest.map(s => (
                <div key={s.slot} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-muted-foreground ml-6">{s.slot}</span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {s.utilisation.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden ml-6">
                    <div
                      className="h-full bg-muted-foreground/30 rounded-full"
                      style={{ width: `${max > 0 ? (s.utilisation / max) * 100 : 0}%` }}
                    />
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

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Row 1: Day-of-week visitors chart */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <CardDescription className="text-xs font-semibold uppercase tracking-widest">
                Visitors by day of week
              </CardDescription>
              <p className="text-sm text-muted-foreground mt-0.5">
                Total across selected period
              </p>
            </div>
            {/* Weekday / weekend split summary */}
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-sm text-muted-foreground">Weekdays</p>
                <p className="text-lg font-semibold tabular-nums">{weekdayPct.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">{weekdayTotal.toLocaleString()} visitors</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weekends</p>
                <p className="text-lg font-semibold tabular-nums">{weekendPct.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">{weekendTotal.toLocaleString()} visitors</p>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={dayData}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              barCategoryGap="22%"
            >
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: 13,
                  color: 'hsl(var(--popover-foreground))',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'visitors') return [value.toLocaleString(), 'Visitors'];
                  return [value, name];
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}
              />
              <Bar dataKey="visitors" radius={[4, 4, 0, 0]}>
                {dayData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.visitors === 0
                        ? 'hsl(var(--border))'
                        : entry.isWeekend
                        ? 'hsl(var(--primary) / 0.55)'
                        : 'hsl(var(--primary))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <p className="text-sm text-muted-foreground mt-2 flex gap-3">
            <span>
              <span className="inline-block w-2.5 h-2 rounded-sm bg-primary align-middle mr-1" />
              Weekday
            </span>
            <span>
              <span className="inline-block w-2.5 h-2 rounded-sm bg-primary/55 align-middle mr-1" />
              Weekend
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Row 2: Peak slot analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <PeakSlotList slots={weekdaySlots} title="Weekday peak slots" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <PeakSlotList slots={weekendSlots} title="Weekend peak slots" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
