"use client";

import { useMemo } from 'react';
import { parseISO } from 'date-fns';
import {
  BarChart, Bar, CartesianGrid, XAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, YAxis,
} from 'recharts';
import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import type { MomenceSession, MonthlyData } from '@/types/momence';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { DemandIntelligence } from '@/components/DemandIntelligence';
import { GrowthStory } from '@/components/GrowthStory';
import { UtilisationTrend } from '@/components/UtilisationTrend';
import {
  buildSummary,
  buildCapacityString,
} from '@/lib/venueInsights';

// ── Private helpers ──────────────────────────────────────────────────────────

/** Bucket sessions into ISO weeks for the timeseries chart. */
function buildWeeklyTimeseries(sessions: MomenceSession[]): { week: string; visitors: number }[] {
  const buckets = new Map<string, number>();
  sessions.forEach(s => {
    const d = parseISO(s.startsAt);
    const key = `${getISOWeekYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`;
    buckets.set(key, (buckets.get(key) ?? 0) + s.ticketsSold);
  });
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, visitors]) => {
      const [year, week] = key.split('-W');
      const d = new Date(Number(year), 0, 1 + (Number(week) - 1) * 7);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      return { week: format(monday, 'd MMM'), visitors };
    });
}

// ── Shared primitives ────────────────────────────────────────────────────────

function CardHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-14">
      <p className="v-card-title">{title}</p>
      {right}
    </div>
  );
}

function MetricTile({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1.5 leading-none">{label}</p>
      <p className="text-xl font-semibold tabular-nums leading-none tracking-[-0.02em]">{value}</p>
    </div>
  );
}

const tooltipStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.75rem',
  fontSize: 12,
  color: 'hsl(var(--popover-foreground))',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
};

// ── 1. Snapshot + Visitors per week ──────────────────────────────────────────

function SnapshotSection({
  sessions,
  metrics,
  monthlyData,
}: {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
  monthlyData: MonthlyData[];
}) {
  const summary = useMemo(() => buildSummary(metrics, monthlyData), [metrics, monthlyData]);
  const weeklyData = useMemo(() => buildWeeklyTimeseries(sessions), [sessions]);

  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
  const weekdayPct = Math.round(metrics.weekdayShare * 100);
  const weekendPct = 100 - weekdayPct;

  const seatCapPerWeek = metrics.modalCapacity * sessionsPerWeek;
  const weeklyOccupancy = seatCapPerWeek > 0
    ? (metrics.weeklyVisits / seatCapPerWeek) * 100
    : metrics.occupancyRate * 100;

  const coreMetrics = [
    { value: Math.round(metrics.weeklyVisits).toLocaleString(), label: 'Visitors / week' },
    { value: sessionsPerWeek.toFixed(1), label: 'Sessions / week' },
    { value: Math.round(metrics.dailyVisits).toLocaleString(), label: 'Visitors / day' },
    { value: `${weeklyOccupancy.toFixed(1)}%`, label: 'Seat occupancy' },
    { value: metrics.totalVisits.toLocaleString(), label: 'Total visitors' },
  ];

  return (
    <Card className="print-section report-card">
      <CardContent className="p-5">
        <CardHeader title="Snapshot" />

        <p className="text-md font-medium text-foreground mb-7 pr-20">{summary}</p>

        {/* Visitors per week chart */}
        {weeklyData.length > 1 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Visitors per week</p>
              <p className="text-sm font-medium text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{Math.round(metrics.weeklyVisits).toLocaleString()}</span> avg
              </p>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={weeklyData} margin={{ top: 4, right: 2, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="snapshotGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0 0% 28%)" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="hsl(0 0% 28%)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="week"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}
                  formatter={(value: number) => [value.toLocaleString(), 'Visitors']}
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stroke="hsl(0 0% 28%)"
                  strokeWidth={1.5}
                  fill="url(#snapshotGradient)"
                  dot={false}
                  activeDot={{ r: 3, fill: 'hsl(0 0% 28%)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Core metric tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
          {coreMetrics.map(item => (
            <MetricTile key={item.label} value={item.value} label={item.label} />
          ))}
        </div>

        {/* Weekday / weekend split */}
        {/* <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1.5 leading-none">Weekday</p>
            <p className="text-xl font-semibold tabular-nums leading-none tracking-[-0.02em]">{weekdayPct}%</p>
            <p className="text-sm text-muted-foreground mt-1.5">{metrics.weekdayVisits.toLocaleString()} visitors Mon–Fri</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1.5 leading-none">Weekend</p>
            <p className="text-xl font-semibold tabular-nums leading-none tracking-[-0.02em]">{weekendPct}%</p>
            <p className="text-sm text-muted-foreground mt-1.5">{metrics.weekendVisits.toLocaleString()} visitors Sat–Sun</p>
          </div>
        </div> */}
      </CardContent>
    </Card>
  );
}

// ── 2. Capacity vs Realised Demand ────────────────────────────────────────────

function CapacitySection({
  metrics,
  monthlyData,
}: {
  metrics: BenchmarkMetrics;
  monthlyData: MonthlyData[];
}) {
  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
  const seatCapPerWeek = metrics.modalCapacity * sessionsPerWeek;
  const seatOccupancyPct = seatCapPerWeek > 0
    ? (metrics.weeklyVisits / seatCapPerWeek) * 100
    : 0;

  const capacityString = useMemo(() => buildCapacityString(metrics), [metrics]);

  const visitorChartData = useMemo(
    () =>
      [...monthlyData]
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return (
            new Date(`${a.month} 1, ${a.year}`).getMonth() -
            new Date(`${b.month} 1, ${b.year}`).getMonth()
          );
        })
        .map(m => ({
          name: `${m.month.slice(0, 3)} '${String(m.year).slice(-2)}`,
          visitors: m.ticketsSold,
          unfilled: Math.max(0, m.capacity - m.ticketsSold),
        })),
    [monthlyData],
  );

  const structuralItems = [
    { value: `${metrics.modalCapacity}`, label: 'Seats / session' },
    { value: sessionsPerWeek.toFixed(1), label: 'Sessions / week' },
    { value: Math.round(seatCapPerWeek).toLocaleString(), label: 'Seat cap / week' },
  ];

  return (
    <Card className="print-section report-card">
      <CardContent className="p-5">
        <CardHeader
          title="Capacity vs realised demand"
          right={
            <p className="text-[22px] font-semibold tabular-nums leading-none tracking-[-0.03em]">
              {seatOccupancyPct.toFixed(1)}%
            </p>
          }
        />

        {/* Occupancy bar */}
        <div className="mb-4">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(seatOccupancyPct, 100)}%`, backgroundColor: 'hsl(0 0% 28%)' }}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">{capacityString}</p>
        </div>

        {/* Structural capacity metrics */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-4 pt-4 border-t border-border">
          {structuralItems.map(item => (
            <MetricTile key={item.label} value={item.value} label={item.label} />
          ))}
        </div>

        {/* Monthly visitors vs capacity */}
        {visitorChartData.length > 1 && (
          <div className="pt-4 mt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">By month</p>
              <p className="text-sm text-muted-foreground flex gap-3">
                <span>
                  <span className="inline-block w-2.5 h-2 rounded-sm align-middle mr-1" style={{ backgroundColor: 'hsl(0 0% 28%)' }} />
                  Filled
                </span>
                <span>
                  <span className="inline-block w-2.5 h-2 rounded-sm bg-muted-foreground/25 align-middle mr-1" />
                  Capacity
                </span>
              </p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={visitorChartData}
                margin={{ top: 2, right: 2, bottom: 0, left: 0 }}
                barCategoryGap="18%"
              >
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => {
                    if (name === 'visitors') return [value.toLocaleString(), 'Visitors'];
                    if (name === 'unfilled') return [value.toLocaleString(), 'Unfilled capacity'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="visitors" stackId="a" fill="hsl(0 0% 28%)" radius={[0, 0, 0, 0]} />
                <Bar
                  dataKey="unfilled"
                  stackId="a"
                  fill="hsl(var(--muted-foreground) / 0.18)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── 3. Demand Mix & Peak Times ────────────────────────────────────────────────

function DemandSection({
  sessions,
  metrics,
}: {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
}) {
  return (
    <Card className="print-section report-card">
      <CardContent className="p-5">
        <CardHeader title="Demand mix & peak times" />
        <DemandIntelligence sessions={sessions} metrics={metrics} />
      </CardContent>
    </Card>
  );
}

// ── 4. Trajectory & occupancy (merged) ────────────────────────────────────────

function TrendsSection({ monthlyData }: { monthlyData: MonthlyData[] }) {
  return (
    <Card className="print-section report-card">
      <CardContent className="p-5">
        <CardHeader title="Trajectory & occupancy" />
        <GrowthStory monthlyData={monthlyData} />
        <div className="mt-12 pt-5">
          <UtilisationTrend monthlyData={monthlyData} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ReportSectionsProps {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
  monthlyData: MonthlyData[];
  allMonthlyData: MonthlyData[];
}

export function ReportSections({
  sessions,
  metrics,
  monthlyData,
  allMonthlyData,
}: ReportSectionsProps) {
  return (
    <div className="space-y-3">
      <div className="section-animate" style={{ animationDelay: '0ms' }}>
        <SnapshotSection sessions={sessions} metrics={metrics} monthlyData={monthlyData} />
      </div>
      <div className="section-animate" style={{ animationDelay: '60ms' }}>
        <CapacitySection metrics={metrics} monthlyData={monthlyData} />
      </div>
      {sessions.length > 0 && (
        <div className="section-animate" style={{ animationDelay: '120ms' }}>
          <DemandSection sessions={sessions} metrics={metrics} />
        </div>
      )}
      {allMonthlyData.length >= 2 && (
        <div className="section-animate" style={{ animationDelay: '180ms' }}>
          <TrendsSection monthlyData={allMonthlyData} />
        </div>
      )}
    </div>
  );
}
