import { useMemo, type ReactNode } from 'react';
import { parseISO, getDay, format, startOfWeek, getWeek } from 'date-fns';
import type { MomenceSession, MonthlyData } from '@/types/momence';
import type { OperatingHours } from '@/lib/benchmarkMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MonthlyTable } from '@/components/MonthlyTable';
import { DemandPatterns } from '@/components/DemandPatterns';
import { BarChart } from '@/components/charts/bar-chart';
import { Bar } from '@/components/charts/bar';
import { BarXAxis } from '@/components/charts/bar-x-axis';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';

interface VisitationSectionProps {
  sessions: MomenceSession[];
  monthlyData: MonthlyData[];
  operatingHours: OperatingHours;
}

// ─── Data builders ───────────────────────────────────────────────────────────

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon → Sun

interface DayOfWeekRow {
  day: string;
  dayShort: string;
  isWeekend: boolean;
  sessions: number;
  visitors: number;
  capacity: number;
  occupancy: number;
  avgVisitorsPerSession: number;
}

function buildDayOfWeekData(sessions: MomenceSession[]): DayOfWeekRow[] {
  const map = new Map<number, { sessions: number; visitors: number; capacity: number }>();
  ORDERED_DAYS.forEach(d => map.set(d, { sessions: 0, visitors: 0, capacity: 0 }));

  sessions.forEach(s => {
    const dow = getDay(parseISO(s.startsAt));
    const row = map.get(dow)!;
    row.sessions += 1;
    row.visitors += s.ticketsSold;
    row.capacity += s.capacity;
  });

  return ORDERED_DAYS.map(dow => {
    const row = map.get(dow)!;
    const occupancy = row.capacity > 0 ? (row.visitors / row.capacity) * 100 : 0;
    const avgVisitorsPerSession = row.sessions > 0 ? row.visitors / row.sessions : 0;
    return {
      day: DAY_LABELS[dow],
      dayShort: DAY_SHORT[dow],
      isWeekend: dow === 0 || dow === 6,
      sessions: row.sessions,
      visitors: row.visitors,
      capacity: row.capacity,
      occupancy,
      avgVisitorsPerSession,
    };
  });
}

interface WeeklyRow {
  weekLabel: string;
  chartLabel: string;
  weekStart: Date;
  sessions: number;
  visitors: number;
  weekdayVisitors: number;
  weekendVisitors: number;
  capacity: number;
  occupancy: number;
}

function buildWeeklySummary(sessions: MomenceSession[]): WeeklyRow[] {
  const map = new Map<string, { weekStart: Date; sessions: MomenceSession[] }>();

  sessions.forEach(s => {
    const date = parseISO(s.startsAt);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const key = format(weekStart, 'yyyy-ww');
    if (!map.has(key)) map.set(key, { weekStart, sessions: [] });
    map.get(key)!.sessions.push(s);
  });

  const rows: WeeklyRow[] = [];
  map.forEach(data => {
    const visitors = data.sessions.reduce((s, x) => s + x.ticketsSold, 0);
    const capacity = data.sessions.reduce((s, x) => s + x.capacity, 0);
    const occupancy = capacity > 0 ? (visitors / capacity) * 100 : 0;

    const weekdayVisitors = data.sessions
      .filter(s => { const d = getDay(parseISO(s.startsAt)); return d >= 1 && d <= 5; })
      .reduce((s, x) => s + x.ticketsSold, 0);
    const weekendVisitors = visitors - weekdayVisitors;

    rows.push({
      weekLabel: `W${getWeek(data.weekStart, { weekStartsOn: 1 })} – ${format(data.weekStart, 'MMM d, yyyy')}`,
      chartLabel: format(data.weekStart, 'MMM d'),
      weekStart: data.weekStart,
      sessions: data.sessions.length,
      visitors,
      weekdayVisitors,
      weekendVisitors,
      capacity,
      occupancy,
    });
  });

  return rows.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function occupancyFill(pct: number) {
  if (pct >= 70) return '#22c55e';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}

function occupancyClass(pct: number) {
  if (pct >= 70) return 'text-green-600 font-medium';
  if (pct >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function occupancyBadgeVariant(pct: number): 'default' | 'secondary' | 'destructive' {
  if (pct >= 70) return 'default';
  if (pct >= 40) return 'secondary';
  return 'destructive';
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VisitationSection({ sessions, monthlyData, operatingHours }: VisitationSectionProps) {
  const dayOfWeekData = useMemo(() => buildDayOfWeekData(sessions), [sessions]);
  const weeklySummary = useMemo(() => buildWeeklySummary(sessions), [sessions]);

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-12">

      {/* ── By Month ─────────────────────────────────────────────────────── */}
      {monthlyData.length > 0 && (
        <div>
          <SectionLabel>By Month</SectionLabel>
          <MonthlyTable data={monthlyData} sessions={sessions} />
        </div>
      )}

      {/* ── By Week ──────────────────────────────────────────────────────── */}
      {weeklySummary.length > 0 && (
        <div>
          <SectionLabel>By Week</SectionLabel>
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
                <p className="text-base text-muted-foreground">Visitors per week</p>
                <span className="flex gap-3 text-base text-muted-foreground">
                  <ColorDot color="bg-primary/70" label="Weekday" />
                  <ColorDot color="bg-violet-500" label="Weekend" />
                </span>
              </div>
              <BarChart
                data={weeklySummary as unknown as Record<string, unknown>[]}
                xDataKey="chartLabel"
                stacked
                aspectRatio="3 / 1"
                margin={{ top: 16, right: 16, bottom: 36, left: 16 }}
                barGap={0.15}
              >
                <Grid horizontal />
                <Bar
                  dataKey="weekdayVisitors"
                  fill="var(--chart-visitors)"
                  stroke="var(--chart-visitors)"
                  lineCap={3}
                />
                <Bar
                  dataKey="weekendVisitors"
                  fill="var(--chart-weekend)"
                  stroke="var(--chart-weekend)"
                  lineCap={3}
                />
                <BarXAxis />
                <ChartTooltip
                  rows={(point) => {
                    const wd = point.weekdayVisitors as number;
                    const we = point.weekendVisitors as number;
                    const total = wd + we;
                    const occ = point.occupancy as number;
                    return [
                      { color: 'var(--chart-visitors)', label: 'Weekday', value: wd.toLocaleString() },
                      { color: 'var(--chart-weekend)', label: 'Weekend', value: we.toLocaleString() },
                      { color: 'var(--chart-foreground)', label: 'Total', value: total.toLocaleString() },
                      {
                        color: occ >= 70 ? 'var(--chart-high)' : occ >= 40 ? 'var(--chart-medium)' : 'var(--chart-low)',
                        label: 'Occupancy',
                        value: `${(occ).toFixed(1)}%`,
                      },
                    ];
                  }}
                />
              </BarChart>
            </CardContent>
          </Card>

          {/* Compact table */}
          <Card className="mt-3">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="data-table min-w-full">
                  <thead>
                    <tr className="bg-muted/30">
                      <th>Week</th>
                      <th className="text-right">Sessions</th>
                      <th className="text-right">Visitors</th>
                      <th className="hidden sm:table-cell text-right">Seats</th>
                      <th className="text-right">Occupancy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklySummary.map((row, i) => (
                      <tr key={i}>
                        <td className="text-base font-medium">
                          <span className="hidden sm:inline">{row.weekLabel}</span>
                          <span className="sm:hidden">{format(row.weekStart, 'MMM d')}</span>
                        </td>
                        <td className="text-right text-sm">{row.sessions}</td>
                        <td className="text-right text-base font-medium">{row.visitors.toLocaleString()}</td>
                        <td className="hidden sm:table-cell text-right text-base text-muted-foreground">{row.capacity.toLocaleString()}</td>
                        <td className={`text-right text-base ${occupancyClass(row.occupancy)}`}>
                          {row.occupancy.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── By Day of Week ───────────────────────────────────────────────── */}
      <div>
        <SectionLabel>By Day of Week</SectionLabel>
        <Card>
          <CardContent className="p-5">
            <div className="space-y-2.5">
              {dayOfWeekData.map((row, i) => {
                const barWidth = row.occupancy;
                const hasData = row.sessions > 0;
                return (
                  <div key={i} className="flex items-center gap-2 sm:gap-3">
                    {/* Day label */}
                    <div className="w-8 sm:w-10 flex-shrink-0 text-center">
                      <span className={`text-base sm:text-base font-medium ${row.isWeekend ? 'text-violet-600' : ''}`}>
                        {row.dayShort.slice(0, 2)}
                      </span>
                    </div>

                    {/* Bar */}
                    <div className="flex-1 h-6 sm:h-7 bg-muted rounded-md overflow-hidden relative">
                      {hasData ? (
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: occupancyFill(row.occupancy),
                            opacity: 0.85,
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center px-2">
                          <span className="text-base text-muted-foreground">—</span>
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    {hasData ? (
                      <div className="flex items-center gap-2 flex-shrink-0 justify-end">
                        <span className="text-base sm:text-base font-medium tabular-nums w-12 sm:w-16 text-right">
                          {row.visitors.toLocaleString()}
                        </span>
                        <span className="hidden sm:inline text-base text-muted-foreground w-24 text-right">
                          avg {row.avgVisitorsPerSession.toFixed(1)}/session
                        </span>
                        <Badge variant={occupancyBadgeVariant(row.occupancy)} className="text-base w-11 justify-center flex-shrink-0">
                          {row.occupancy.toFixed(0)}%
                        </Badge>
                      </div>
                    ) : (
                      <div className="w-24 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-base sm:text-base text-muted-foreground mt-3 pt-3 border-t">
              Bar width = occupancy % · Badge = occupancy · Cumulative totals from Momence session data.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── By Time Slot ─────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>By Time Slot</SectionLabel>
        <DemandPatterns sessions={sessions} operatingHours={operatingHours} />
      </div>

    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-base font-medium text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

function ColorDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${color}`} />
      <span>{label}</span>
    </span>
  );
}
