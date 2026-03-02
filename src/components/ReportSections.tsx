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
import { buildCapacityString } from '@/lib/venueInsights';

// ── Private helpers ──────────────────────────────────────────────────────────

/** Bucket sessions into ISO weeks for the timeseries chart. */
function buildWeeklyTimeseries(sessions: MomenceSession[]): { label: string; visitors: number }[] {
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
      return { label: format(monday, 'd MMM'), visitors };
    });
}

/** Bucket sessions into hours for single-day view. */
function buildHourlyTimeseries(sessions: MomenceSession[]): { label: string; visitors: number }[] {
  const buckets = new Map<number, number>();
  sessions.forEach(s => {
    const h = parseISO(s.startsAt).getHours();
    buckets.set(h, (buckets.get(h) ?? 0) + s.ticketsSold);
  });
  if (buckets.size === 0) return [];
  const min = Math.min(...buckets.keys());
  const max = Math.max(...buckets.keys());
  return Array.from({ length: max - min + 1 }, (_, i) => {
    const h = min + i;
    const label = format(new Date(2000, 0, 1, h), 'ha').toLowerCase();
    return { label, visitors: buckets.get(h) ?? 0 };
  });
}

// ── Shared primitives ────────────────────────────────────────────────────────

function CardHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-14">
      <p className="text-base font-medium">{title}</p>
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
  background: 'var(--color-foreground)',
  borderRadius: 'var(--radius-6)',
  fontSize: 14,
  lineHeight: 1.2,
  color: 'var(--color-white)',
  padding: '12px 16px 8px 16px',
};

// ── 1. Snapshot + Visitors per week ──────────────────────────────────────────

function SnapshotSection({
  sessions,
  metrics,
  monthlyData,
  period,
}: {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
  monthlyData: MonthlyData[];
  period: string;
}) {
  const isSingleDay = metrics.daysInRange <= 1;
  const isHourly = period === 'yesterday';
  const chartData = useMemo(
    () => isHourly ? buildHourlyTimeseries(sessions) : buildWeeklyTimeseries(sessions),
    [sessions, isHourly],
  );
  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;

  // Occupancy: totalVisits/totalCapacity — consistent across all period lengths.
  const occupancyPct = metrics.totalCapacity > 0
    ? (metrics.totalVisits / metrics.totalCapacity) * 100
    : 0;

  // Visitors per hour: total visitors divided by the number of plotted hour buckets.
  // The label is scoped to the plotted window so the math is always verifiable.
  const hourlyAvg = chartData.length > 0 ? Math.round(metrics.totalVisits / chartData.length) : 0;
  const hourlyLabel = chartData.length >= 2
    ? `Visitors per hour (${chartData[0].label}–${chartData[chartData.length - 1].label})`
    : 'Visitors per hour';

  const coreMetrics = isSingleDay
    ? [
        { value: metrics.totalVisits.toLocaleString(),   label: 'Visitors today' },
        { value: metrics.totalSessions.toLocaleString(), label: 'Sessions today' },
        { value: `${occupancyPct.toFixed(1)}%`,          label: 'Seat occupancy today' },
      ]
    : [
        { value: Math.round(metrics.weeklyVisits).toLocaleString(), label: 'Visitors / week' },
        { value: sessionsPerWeek.toFixed(1),                        label: 'Sessions / week' },
        { value: Math.round(metrics.dailyVisits).toLocaleString(),  label: 'Visitors / day' },
        { value: `${occupancyPct.toFixed(1)}%`,                     label: 'Seat occupancy' },
        { value: metrics.totalVisits.toLocaleString(),              label: 'Total visitors' },
      ];

  return (
    <Card className="print-section shadow-sm">
      <CardContent className="p-5">
        <CardHeader title="Snapshot" />

        {/* Visitors chart — hourly (single day) or weekly (multi-day) */}
        {chartData.length > 1 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                {isHourly ? hourlyLabel : 'Visitors per week'}
              </p>
              <p className="text-sm font-medium text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">
                  {isHourly
                    ? hourlyAvg.toLocaleString()
                    : Math.round(metrics.weeklyVisits).toLocaleString()}
                </span>{' '}
                avg
              </p>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              {isHourly ? (
                <BarChart data={chartData} margin={{ top: 4, right: 2, bottom: 0, left: 0 }} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--color-gray-4)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: 'var(--color-white)', marginBottom: 12  }}
                    formatter={(value: number) => [value.toLocaleString(), 'Visitors']}
                  />
                  <Bar dataKey="visitors" fill="var(--color-gray-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 4, right: 2, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="snapshotGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-gray-2)" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="var(--color-gray-2)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [value.toLocaleString(), 'Visitors']}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="var(--color-gray-2)"
                    strokeWidth={1.5}
                    fill="url(#snapshotGradient)"
                    dot={false}
                    activeDot={{ r: 3, fill: 'var(--color-gray-2)' }}
                  />
                </AreaChart>
              )}
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
  const isSingleDay = metrics.daysInRange <= 1;
  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
  const seatCapPerWeek = metrics.modalCapacity * sessionsPerWeek;
  // Use totalVisits/totalCapacity for a consistent, period-accurate occupancy figure
  const seatOccupancyPct = metrics.totalCapacity > 0
    ? (metrics.totalVisits / metrics.totalCapacity) * 100
    : 0;

  // Realised avg seats per session from the filtered session list — source of truth.
  const realisedAvgSeats = metrics.totalSessions > 0
    ? (metrics.totalCapacity / metrics.totalSessions)
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

  const structuralItems = isSingleDay
    ? [
        // Realised avg derived directly from the session list — not the configured default.
        { value: realisedAvgSeats.toFixed(1), label: 'Avg seats / session (today)' },
        { value: metrics.totalSessions.toLocaleString(), label: 'Sessions today' },
        { value: metrics.totalCapacity.toLocaleString(), label: 'Seats today' },
      ]
    : [
        { value: `${metrics.modalCapacity}`, label: 'Configured seats / session' },
        { value: sessionsPerWeek.toFixed(1), label: 'Sessions / week' },
        { value: Math.round(seatCapPerWeek).toLocaleString(), label: 'Seat cap / week' },
      ];

  return (
    <Card className="print-section shadow-sm">
      <CardContent className="p-5">
        <CardHeader
          title="Capacity"
          right={
            <div className="text-right">
              <p className="text-[22px] font-semibold tabular-nums leading-none tracking-[-0.03em]">
                {seatOccupancyPct.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isSingleDay ? 'today' : 'seat occupancy'}
              </p>
            </div>
          }
        />

        {/* Occupancy bar */}
        <div className="mb-4">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(seatOccupancyPct, 100)}%`, backgroundColor: '#474747' }}
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
              <div>
                <p className="text-sm text-muted-foreground">Monthly visitors vs capacity</p>
                {isSingleDay && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    Snapshot above is for the selected date only · chart below spans all cached months
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex gap-3">
                <span>
                  <span className="inline-block w-2.5 h-2 rounded-sm align-middle mr-1" style={{ backgroundColor: '#474747' }} />
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
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
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
                <Bar dataKey="visitors" stackId="a" fill="#474747" radius={[0, 0, 0, 0]} />
                <Bar
                  dataKey="unfilled"
                  stackId="a"
                  fill="color-mix(in srgb, var(--muted-foreground) 18%, transparent)"
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
  period,
}: {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
  period: string;
}) {
  return (
    <Card className="print-section shadow-sm">
      <CardContent className="p-5">
        <CardHeader title="Demand" />
        <DemandIntelligence
          sessions={sessions}
          metrics={metrics}
          selectedDate={period === 'yesterday' ? metrics.computedFrom : undefined}
        />
      </CardContent>
    </Card>
  );
}

// ── 4. Trajectory & occupancy (merged) ────────────────────────────────────────

function TrendsSection({ monthlyData }: { monthlyData: MonthlyData[] }) {
  // Build a human-readable range label from the monthly data (e.g. "Jan 2025 – Mar 2026")
  const rangeLabel = useMemo(() => {
    if (monthlyData.length === 0) return '';
    const sorted = [...monthlyData].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return new Date(`${a.month} 1`).getMonth() - new Date(`${b.month} 1`).getMonth();
    });
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (first === last) return `${first.month.slice(0, 3)} ${first.year}`;
    return `${first.month.slice(0, 3)} ${first.year} – ${last.month.slice(0, 3)} ${last.year}`;
  }, [monthlyData]);

  return (
    <Card className="print-section shadow-sm">
      <CardContent className="p-5">
        <CardHeader
          title="Trajectory & occupancy"
          right={
            rangeLabel
              ? <p className="text-xs text-muted-foreground">{rangeLabel}</p>
              : undefined
          }
        />
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
  period: string;
}

export function ReportSections({
  sessions,
  metrics,
  monthlyData,
  allMonthlyData,
  period,
}: ReportSectionsProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="section-animate" style={{ animationDelay: '0ms' }}>
        <SnapshotSection sessions={sessions} metrics={metrics} monthlyData={monthlyData} period={period} />
      </div>
      <div className="section-animate" style={{ animationDelay: '60ms' }}>
        <CapacitySection metrics={metrics} monthlyData={monthlyData} />
      </div>
      {sessions.length > 0 && (
        <div className="section-animate" style={{ animationDelay: '120ms' }}>
          <DemandSection sessions={sessions} metrics={metrics} period={period} />
        </div>
      )}
      {/* {allMonthlyData.length >= 2 && (
        <div className="section-animate" style={{ animationDelay: '180ms' }}>
          <TrendsSection monthlyData={allMonthlyData} />
        </div>
      )} */}
    </div>
  );
}
