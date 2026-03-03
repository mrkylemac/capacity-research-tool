"use client";

import { useMemo } from 'react';
import { getDay, parseISO } from 'date-fns';
import {
  BarChart, Bar, Cell, CartesianGrid, XAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { MomenceSession, MonthlyData } from '@/types/momence';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { chartTooltipContentStyle, chartTooltipLabelStyle } from '@/lib/chartTooltip';
import { Card, CardContent } from '@/components/ui/card';

// ── Session analysis helpers ────────────────────────────────────────────────

function detectModalDuration(sessions: MomenceSession[]): number {
  if (sessions.length === 0) return 0;
  const freq = new Map<number, number>();
  sessions.forEach(s => {
    if (s.durationMinutes > 0) freq.set(s.durationMinutes, (freq.get(s.durationMinutes) ?? 0) + 1);
  });
  let mode = 60, maxFreq = 0;
  freq.forEach((count, d) => { if (count > maxFreq) { maxFreq = count; mode = d; } });
  return mode;
}

function detectRollingInterval(sessions: MomenceSession[]): number {
  const byDay = new Map<string, number[]>();
  sessions.forEach(s => {
    const date = s.startsAt.slice(0, 10);
    const d = new Date(s.startsAt);
    const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
    const existing = byDay.get(date) ?? [];
    existing.push(mins);
    byDay.set(date, existing);
  });
  const gaps: number[] = [];
  byDay.forEach(times => {
    const sorted = [...times].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap > 0 && gap <= 120) gaps.push(gap);
    }
  });
  if (gaps.length === 0) return 0;
  const freq = new Map<number, number>();
  gaps.forEach(g => freq.set(g, (freq.get(g) ?? 0) + 1));
  let mode = 0, maxFreq = 0;
  freq.forEach((count, gap) => { if (count > maxFreq) { maxFreq = count; mode = gap; } });
  return mode;
}

function buildDayProfile(sessions: MomenceSession[]) {
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayUniqueDates = new Map<number, Set<string>>();
  const daySessionCounts = new Map<number, number>();
  DAY_ORDER.forEach(d => {
    dayUniqueDates.set(d, new Set());
    daySessionCounts.set(d, 0);
  });
  sessions.forEach(s => {
    const day = getDay(parseISO(s.startsAt));
    const date = s.startsAt.slice(0, 10);
    dayUniqueDates.get(day)?.add(date);
    daySessionCounts.set(day, (daySessionCounts.get(day) ?? 0) + 1);
  });
  return DAY_ORDER.map((d, i) => {
    const uniqueDays = dayUniqueDates.get(d)!.size;
    const totalSessions = daySessionCounts.get(d)!;
    const avgSessions = uniqueDays > 0 ? totalSessions / uniqueDays : 0;
    return {
      name: DAY_NAMES[i],
      avgSessions: Math.round(avgSessions * 10) / 10,
      uniqueDays,
      isWeekend: d === 0 || d === 6,
      isOpen: uniqueDays > 0,
    };
  });
}

// ── Shared primitives ────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function BigStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-[2rem] sm:text-[2.75rem] font-semibold tabular-nums tracking-tight leading-none text-foreground">
        {value}
      </p>
      <p className="text-sm text-muted-foreground mt-1.5">{label}</p>
    </div>
  );
}

function StatRow({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-sm font-medium tabular-nums text-foreground">{item.value}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface SummaryCardsProps {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
  monthlyData: MonthlyData[];
}

export function SummaryCards({ sessions, metrics, monthlyData }: SummaryCardsProps) {
  const durationMins = useMemo(() => detectModalDuration(sessions), [sessions]);
  const rollingInterval = useMemo(() => detectRollingInterval(sessions), [sessions]);
  const dayProfile = useMemo(() => buildDayProfile(sessions), [sessions]);

  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
  const occupancyPct = metrics.occupancyRate * 100;
  const weekdayPct = Math.round(metrics.weekdayShare * 100);
  const weekendPct = 100 - weekdayPct;

  const maxConcurrent = rollingInterval > 0 ? Math.ceil(durationMins / rollingInterval) : 1;
  const maxConcurrentVisitors = maxConcurrent * metrics.modalCapacity;
  const activeDays = dayProfile.filter(d => d.isOpen).length;
  const closedDays = dayProfile.filter(d => !d.isOpen).map(d => d.name);

  const visitorChartData = useMemo(() =>
    monthlyData.map(m => ({
      name: `${m.month.slice(0, 3)} '${String(m.year).slice(-2)}`,
      visitors: m.ticketsSold,
      unfilled: Math.max(0, m.capacity - m.ticketsSold),
    })),
  [monthlyData]);

  return (
    <div className="space-y-3">

      {/* ── Visitors ── */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <CardLabel>Visitors</CardLabel>

          <BigStat
            value={metrics.totalVisits.toLocaleString()}
            label="total visitors"
          />

          <StatRow items={[
            { value: Math.round(metrics.weeklyVisits).toLocaleString(), label: 'per week' },
            { value: Math.round(metrics.dailyVisits).toString(), label: 'per day' },
            { value: `${weekdayPct}% / ${weekendPct}%`, label: 'weekday / weekend' },
          ]} />

          {visitorChartData.length > 1 && (
            <div className="pt-1 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Monthly visitors</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={visitorChartData} margin={{ top: 2, right: 2, bottom: 0, left: 0 }} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={chartTooltipContentStyle}
                    formatter={(value: number, name: string) => {
                      if (name === 'visitors') return [value.toLocaleString(), 'Visitors'];
                      if (name === 'unfilled') return [value.toLocaleString(), 'Unfilled'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="visitors" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="unfilled" stackId="a" fill="color-mix(in srgb, var(--muted-foreground) 15%, transparent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sessions ── */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <CardLabel>Sessions</CardLabel>

          <BigStat
            value={metrics.totalSessions.toLocaleString()}
            label="total sessions recorded"
          />

          <StatRow items={[
            { value: sessionsPerWeek.toFixed(1), label: 'per week' },
            ...(durationMins > 0 ? [{ value: `${durationMins} min`, label: 'session length' }] : []),
            { value: metrics.modalCapacity.toString(), label: 'seats per session' },
            { value: `${activeDays} days`, label: 'operating days / wk' },
          ]} />

          {/* Day-of-week chart */}
          <div className="pt-1 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">
              Avg sessions per operating day
              {closedDays.length > 0 && ` · ${closedDays.join(', ')} excluded`}
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={dayProfile} margin={{ top: 2, right: 2, bottom: 0, left: 0 }} barCategoryGap="25%">
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltipContentStyle}
                  labelStyle={chartTooltipLabelStyle}
                  formatter={(value: number, name: string) => {
                    if (name === 'avgSessions') return [`${value.toFixed(1)} avg sessions`, ''];
                    return [value, name];
                  }}
                />
                <Bar dataKey="avgSessions" radius={[4, 4, 0, 0]}>
                  {dayProfile.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        !entry.isOpen
                          ? 'var(--border)'
                          : entry.isWeekend
                          ? 'color-mix(in srgb, var(--primary) 55%, transparent)'
                          : 'var(--primary)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground mt-2.5 flex gap-3">
              <span>
                <span className="inline-block w-2.5 h-2 rounded-sm bg-primary align-middle mr-1" />
                Weekday
              </span>
              <span>
                <span className="inline-block w-2.5 h-2 rounded-sm bg-primary/55 align-middle mr-1" />
                Weekend
              </span>
            </p>
          </div>

          {/* Rolling interval note */}
          {rollingInterval > 0 && (
            <p className="text-sm text-muted-foreground pt-1 border-t border-border leading-relaxed">
              Rolling {rollingInterval}-minute waves allow up to{' '}
              <span className="font-medium text-foreground">{maxConcurrent} sessions</span> to overlap,
              placing up to{' '}
              <span className="font-medium text-foreground">{maxConcurrentVisitors} visitors</span>{' '}
              in the venue at once.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Occupancy ── */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <CardLabel>Occupancy</CardLabel>

          <BigStat
            value={`${occupancyPct.toFixed(1)}%`}
            label="average fill rate"
          />

          {/* Fill-rate bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.min(100, occupancyPct)}%` }}
            />
          </div>

          <StatRow items={[
            { value: metrics.avgVisitorsPerSession.toFixed(1), label: 'avg per session' },
            { value: metrics.totalCapacity.toLocaleString(), label: 'seats available' },
            { value: metrics.totalVisits.toLocaleString(), label: 'seats filled' },
          ]} />
        </CardContent>
      </Card>

    </div>
  );
}
