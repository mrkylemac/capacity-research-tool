"use client";

import { useMemo, useState, useEffect } from 'react';
import { parseISO } from 'date-fns';
import {
  BarChart, Bar, Cell, CartesianGrid, XAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, YAxis,
} from 'recharts';
import { format, getISOWeek, getISOWeekYear } from 'date-fns';
import type { MomenceSession, MonthlyData } from '@/types/momence';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { DemandIntelligence } from '@/components/demand';
import { buildCapacityString, computeMonthlyTrajectory } from '@/lib/venueInsights';
import { chartTooltipContentStyle, chartTooltipLabelStyle, chartTooltipItemStyle } from '@/lib/chartTooltip';
import { OperatingModel } from '@/components/OperatingModel';

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

/** Bucket sessions into calendar days. */
function buildDailyTimeseries(sessions: MomenceSession[]): { label: string; visitors: number }[] {
  const buckets = new Map<string, number>();
  sessions.forEach(s => {
    const key = format(parseISO(s.startsAt), 'yyyy-MM-dd');
    buckets.set(key, (buckets.get(key) ?? 0) + s.ticketsSold);
  });
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, visitors]) => ({ label: format(parseISO(key), 'd MMM'), visitors }));
}

/** Bucket sessions into calendar months. */
function buildMonthlyTimeseries(sessions: MomenceSession[]): { label: string; visitors: number }[] {
  const buckets = new Map<string, number>();
  sessions.forEach(s => {
    const key = format(parseISO(s.startsAt), 'yyyy-MM');
    buckets.set(key, (buckets.get(key) ?? 0) + s.ticketsSold);
  });
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, visitors]) => ({ label: format(parseISO(`${key}-01`), 'MMM yy'), visitors }));
}

type Granularity = 'monthly' | 'weekly' | 'daily' | 'hourly';

function getGranularityConfig(period: string): { options: Granularity[]; default: Granularity } {
  if (period === 'yesterday' || period === 'today') return { options: [], default: 'hourly' };
  if (period === '1w') return { options: [], default: 'daily' };
  if (period === '1m' || period === 'last1m') return { options: ['weekly', 'daily'], default: 'weekly' };
  return { options: ['monthly', 'weekly', 'daily'], default: 'weekly' };
}

// ── Shared primitives ────────────────────────────────────────────────────────

function CardHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <p className="text-lg font-semibold">{title}</p>
      {right}
    </div>
  );
}

function MetricTile({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1.5 leading-none">{label}</p>
      <p className="text-xl font-medium tabular-nums leading-none tracking-[-0.02em]">{value}</p>
    </div>
  );
}

/**
 * Short caption surfaced beneath the headline metrics — communicates the
 * sample size (so a viewer knows "506/wk" is built on real density) and
 * flags when data is stale (last session > 12hrs ago) so the rate isn't
 * mistaken for a live read.
 */
function DataDensityCaption({ metrics }: { metrics: BenchmarkMetrics }) {
  const lastSession = parseISO(metrics.lastSessionAt);
  const hoursAgo = (Date.now() - lastSession.getTime()) / (1000 * 60 * 60);

  const sessionCount = metrics.totalSessions.toLocaleString();
  const dayCount = metrics.daysInRange;
  const dayLabel = dayCount === 1 ? 'day' : 'days';
  const base = `Based on ${sessionCount} session${metrics.totalSessions === 1 ? '' : 's'} across ${dayCount} ${dayLabel}`;

  // Only flag freshness when the gap is meaningful (>12 hrs).
  let freshness: string | null = null;
  if (hoursAgo > 12) {
    if (hoursAgo < 48) {
      freshness = `data through ${format(lastSession, 'EEE d MMM')} (${Math.round(hoursAgo)}h ago)`;
    } else {
      const daysAgo = Math.round(hoursAgo / 24);
      freshness = `data through ${format(lastSession, 'EEE d MMM yyyy')} (${daysAgo}d ago)`;
      // The computation window still runs to today, so the dead tail dilutes
      // per-week and per-day rates — say so rather than let it read as live.
      if (daysAgo > 7) freshness += ' — weekly and daily rates include this inactive period';
    }
  }

  return (
    <p className="text-xs text-muted-foreground mt-3 leading-snug">
      {base}{freshness ? ` · ${freshness}` : ''}
    </p>
  );
}

// ── 1. Snapshot + Visitors per week ──────────────────────────────────────────

function SnapshotSection({
  sessions,
  metrics,
  period,
  platform,
}: {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
  period: string;
  platform?: string;
}) {
  const isSingleDay = metrics.daysInRange <= 1;
  const granConfig = getGranularityConfig(period);
  const [granularity, setGranularity] = useState<Granularity>(() => granConfig.default);

  useEffect(() => {
    setGranularity(getGranularityConfig(period).default);
  }, [period]);

  const chartData = useMemo(() => {
    if (granularity === 'hourly') return buildHourlyTimeseries(sessions);
    if (granularity === 'daily') return buildDailyTimeseries(sessions);
    if (granularity === 'monthly') return buildMonthlyTimeseries(sessions);
    return buildWeeklyTimeseries(sessions);
  }, [sessions, granularity]);

  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;

  const occupancyPct = metrics.totalCapacity > 0
    ? (metrics.totalVisits / metrics.totalCapacity) * 100
    : 0;

  const hourlyAvg = chartData.length > 0 ? Math.round(metrics.totalVisits / chartData.length) : 0;
  const hourlyLabel = chartData.length >= 2
    ? `/hour (${chartData[0].label}–${chartData[chartData.length - 1].label})`
    : '/hour';

  const avgValue = granularity === 'hourly'
    ? hourlyAvg
    : granularity === 'weekly'
    ? Math.round(metrics.weeklyVisits)
    : Math.round(metrics.totalVisits / Math.max(chartData.length, 1));

  const chartLabel = granularity === 'hourly'
    ? hourlyLabel
    : granularity === 'daily'
    ? '/day'
    : granularity === 'monthly'
    ? '/month'
    : '/week';

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
    <Card className="print-section">
      <CardContent className="px-4 py-4 sm:p-5">
        <CardHeader title="Snapshot" />

        {platform === 'trybe' && (
          <p className="text-sm text-muted-foreground mb-4">
            Data shows upcoming bookings only. TryBe doesn&apos;t expose historical records via its public API — past session data will build up here over time as you re-sync.
          </p>
        )}

        {/* Visitors chart */}
        {chartData.length > 1 && (
          <div className="mb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1.5">
                <p className="text-sm font-medium text-muted-foreground tabular-nums">
                  <span className="font-semibold text-foreground">{avgValue.toLocaleString()}</span>{' '} {chartLabel}
                </p>
              {granConfig.options.length > 0 && (
                <div className="flex items-center rounded-full bg-muted p-0.5 gap-px w-full sm:w-auto">
                  {granConfig.options.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGranularity(g)}
                      className={`flex-1 sm:flex-none px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                        granularity === g
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {g === 'monthly' ? 'Monthly' : g === 'weekly' ? 'Weekly' : 'Daily'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={320}>
              {granularity === 'hourly' || granularity === 'monthly' ? (
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
                    contentStyle={chartTooltipContentStyle}
                    labelStyle={chartTooltipLabelStyle}
                    itemStyle={chartTooltipItemStyle}
                    separator=": "
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
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
                    contentStyle={chartTooltipContentStyle}
                    labelStyle={chartTooltipLabelStyle}
                    itemStyle={chartTooltipItemStyle}
                    separator=": "
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

        <DataDensityCaption metrics={metrics} />

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
  // Consistent aggregate occupancy — matches occupancyRate on BenchmarkMetrics
  const seatOccupancyPct = metrics.totalCapacity > 0
    ? (metrics.totalVisits / metrics.totalCapacity) * 100
    : 0;
  // seatsPerWeek derived from actual totalCapacity so it cross-checks with the headline %
  const seatsPerWeek = metrics.totalCapacity / metrics.weeksInRange;

  // Realised avg seats per session from the filtered session list — source of truth.
  const realisedAvgSeats = metrics.totalSessions > 0
    ? (metrics.totalCapacity / metrics.totalSessions)
    : 0;

  const capacityString = useMemo(() => buildCapacityString(metrics), [metrics]);

  const visitorChartData = useMemo(
    () =>
      computeMonthlyTrajectory(monthlyData, { from: metrics.computedFrom, to: metrics.computedTo })
        .map(pt => ({
          name: pt.monthLabel,
          visitors: pt.visitors,
          unfilled: Math.max(0, pt.seats - pt.visitors),
          occupancyPct: pt.occupancy * 100,
          isPartial: pt.isPartial,
        })),
    [monthlyData, metrics.computedFrom, metrics.computedTo],
  );

  const structuralItems = isSingleDay
    ? [
        // Realised avg derived directly from the session list — not the configured default.
        { value: realisedAvgSeats.toFixed(1), label: 'Avg seats / session (today)' },
        { value: metrics.totalSessions.toLocaleString(), label: 'Sessions today' },
        { value: metrics.totalCapacity.toLocaleString(), label: 'Seats today' },
      ]
    : [
        { value: `${metrics.modalCapacity}`, label: 'Seats / session' },
        { value: sessionsPerWeek.toFixed(1), label: 'Sessions / week' },
        { value: Math.round(seatsPerWeek).toLocaleString(), label: 'Seats / week' },
      ];

  return (
    <Card className="print-section shadow-sm">
      <CardContent className="px-4 py-4 sm:p-5">
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

        {/* Monthly visitors vs capacity */}
        {visitorChartData.length > 1 && (
          <div className="pt-4 mb-8">
            <div className="flex justify-between mb-3 items-center">
              <div>
                <p className="text-sm font-medium">Monthly visitors vs capacity</p>
              </div>
              <p className="text-sm text-muted-foreground flex gap-3">
                <span className="flex gap-1">
                  <span className="inline-block w-3 h-3 mr-1 mt-1" style={{ backgroundColor: 'var(--chart-fill)' }} />
                  Filled
                </span>
                <span className="flex gap-1">
                  <span className="inline-block w-3 h-3 bg-muted-foreground/25 mr-1 mt-1" />
                  Capacity
                </span>
              </p>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={visitorChartData}
                margin={{ top: 20, right: 2, bottom: 0, left: 0 }}
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
                  contentStyle={chartTooltipContentStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                  separator=": "
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  formatter={(value: number, name: string, props: { payload: { occupancyPct: number; isPartial: boolean } }) => {
                    if (name === 'visitors') {
                      const { occupancyPct, isPartial } = props.payload;
                      const partialNote = isPartial ? ', partial month' : '';
                      return [`${value.toLocaleString()} (${occupancyPct.toFixed(0)}%${partialNote})`, 'Visitors'];
                    }
                    if (name === 'unfilled') return [value.toLocaleString(), 'Unfilled capacity'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="visitors" stackId="a" fill="var(--chart-fill)" radius={[0, 0, 0, 0]}>
                  {visitorChartData.map((entry, i) => (
                    <Cell key={i} fill="var(--chart-fill)" fillOpacity={entry.isPartial ? 0.4 : 1} />
                  ))}
                </Bar>
                <Bar
                  dataKey="unfilled"
                  stackId="a"
                  fill="color-mix(in srgb, var(--muted-foreground) 18%, transparent)"
                  radius={[4, 4, 0, 0]}
                >
                  {visitorChartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill="color-mix(in srgb, var(--muted-foreground) 18%, transparent)"
                      fillOpacity={entry.isPartial ? 0.4 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Capacity horizontal bar list (same pattern as Day-of-week in Demand) */}
        <div>
          <div className="space-y-1 mb-4">
            {structuralItems.map(item => (
              <div
                key={item.label}
                className="relative h-8 rounded-lg overflow-hidden flex items-center px-3 w-full"
              >
                <div className="absolute inset-0 bg-muted" />
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500 rounded-lg"
                    style={{
                    width: '100%',
                    backgroundColor: 'color-mix(in srgb, var(--chart-fill) 18%, transparent)',
                  }}
                />
                <span className="relative z-10 text-sm">{item.label}</span>
                <span className="relative z-10 ml-auto text-sm tabular-nums text-foreground">
                  {item.value}
                </span>
              </div>
            ))}
            <div className="relative h-8 rounded-lg overflow-hidden flex items-center px-3 w-full">
              <div className="absolute inset-0 bg-muted" />
              <div
                className="absolute inset-y-0 left-0 transition-all duration-500 rounded-lg"
                style={{
                  width: `${Math.min(seatOccupancyPct, 100)}%`,
                  backgroundColor: 'color-mix(in srgb, var(--chart-fill) 35%, transparent)',
                }}
              />
              <span className="relative z-10 text-sm">
                {isSingleDay ? 'Seat occupancy (today)' : 'Seat occupancy'}
              </span>
              <span className="relative z-10 ml-auto text-sm tabular-nums text-foreground">
                {seatOccupancyPct.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{capacityString}</p>
        </div>

        
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
      <CardContent className="px-4 py-4 sm:p-5">
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

// ── Main component ────────────────────────────────────────────────────────────

interface ReportSectionsProps {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
  monthlyData: MonthlyData[];
  period: string;
  platform?: string;
  hostId?: string;
}

export function ReportSections({
  sessions,
  metrics,
  monthlyData,
  period,
  platform,
  hostId,
}: ReportSectionsProps) {
  return (
    <div className="flex flex-col gap-5 sm:gap-8 mb-12">
      <div className="section-animate -mx-4 sm:mx-0" style={{ animationDelay: '0ms' }}>
        <SnapshotSection sessions={sessions} metrics={metrics} period={period} platform={platform} />
      </div>
      <div className="section-animate -mx-4 sm:mx-0" style={{ animationDelay: '60ms' }}>
        <CapacitySection metrics={metrics} monthlyData={monthlyData} />
      </div>
      {sessions.length > 0 && (
        <div className="section-animate -mx-4 sm:mx-0" style={{ animationDelay: '120ms' }}>
          <DemandSection sessions={sessions} metrics={metrics} period={period} />
        </div>
      )}
      {sessions.length > 0 && (
        <div className="section-animate -mx-4 sm:mx-0" style={{ animationDelay: '180ms' }}>
          <OperatingModel sessions={sessions} metrics={metrics} hostId={hostId} />
        </div>
      )}
    </div>
  );
}
