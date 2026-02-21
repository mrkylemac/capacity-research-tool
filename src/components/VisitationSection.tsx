import { useMemo, type ReactNode } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { parseISO, getDay, format, startOfWeek, getWeek } from 'date-fns';
import type { MomenceSession, MonthlyData } from '@/types/momence';
import type { OperatingHours } from '@/lib/benchmarkMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MonthlyTable } from '@/components/MonthlyTable';
import { DemandPatterns } from '@/components/DemandPatterns';

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
    rows.push({
      weekLabel: `W${getWeek(data.weekStart, { weekStartsOn: 1 })} – ${format(data.weekStart, 'MMM d, yyyy')}`,
      chartLabel: format(data.weekStart, 'MMM d'),
      weekStart: data.weekStart,
      sessions: data.sessions.length,
      visitors,
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

// ─── Custom tooltip for weekly chart ─────────────────────────────────────────

function WeeklyTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: WeeklyRow }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs space-y-1">
      <p className="font-medium">{d.weekLabel}</p>
      <p><span className="text-muted-foreground">Visitors:</span> <span className="font-medium">{d.visitors.toLocaleString()}</span></p>
      <p><span className="text-muted-foreground">Sessions:</span> {d.sessions}</p>
      <p><span className="text-muted-foreground">Occupancy:</span> <span className={occupancyClass(d.occupancy)}>{d.occupancy.toFixed(1)}%</span></p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VisitationSection({ sessions, monthlyData, operatingHours }: VisitationSectionProps) {
  const dayOfWeekData = useMemo(() => buildDayOfWeekData(sessions), [sessions]);
  const weeklySummary = useMemo(() => buildWeeklySummary(sessions), [sessions]);

  const maxDayVisitors = Math.max(...dayOfWeekData.map(d => d.visitors), 1);

  // For weekly chart: only show every Nth label when there are many weeks
  const tickInterval = weeklySummary.length > 26 ? Math.ceil(weeklySummary.length / 26) - 1 : 0;

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
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
                <p className="text-xs text-muted-foreground">Visitors per week</p>
                <span className="flex gap-2 text-xs text-muted-foreground">
                  <ColorDot color="bg-green-500" label="≥70%" />
                  <ColorDot color="bg-amber-500" label="40–69%" />
                  <ColorDot color="bg-red-500" label="<40%" />
                </span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklySummary} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" vertical={false} />
                    <XAxis
                      dataKey="chartLabel"
                      tick={{ fill: 'hsl(0 0% 45%)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={tickInterval}
                    />
                    <YAxis
                      tick={{ fill: 'hsl(0 0% 45%)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<WeeklyTooltip />} cursor={{ fill: 'hsl(0 0% 95%)' }} />
                    <Bar dataKey="visitors" radius={[4, 4, 0, 0]}>
                      {weeklySummary.map((row, i) => (
                        <Cell key={i} fill={occupancyFill(row.occupancy)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Compact table for verification */}
          <Card className="mt-3">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="notion-table min-w-full">
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
                        <td className="text-sm font-medium">
                          <span className="hidden sm:inline">{row.weekLabel}</span>
                          <span className="sm:hidden">{format(row.weekStart, 'MMM d')}</span>
                        </td>
                        <td className="text-right text-sm">{row.sessions}</td>
                        <td className="text-right text-sm font-medium">{row.visitors.toLocaleString()}</td>
                        <td className="hidden sm:table-cell text-right text-sm text-muted-foreground">{row.capacity.toLocaleString()}</td>
                        <td className={`text-right text-sm ${occupancyClass(row.occupancy)}`}>
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
                const barWidth = row.visitors > 0 ? (row.visitors / maxDayVisitors) * 100 : 0;
                const hasData = row.sessions > 0;
                return (
                  <div key={i} className="flex items-center gap-2 sm:gap-3">
                    {/* Day label — narrower on mobile */}
                    <div className="w-8 sm:w-10 flex-shrink-0 text-center">
                      <span className={`text-xs sm:text-sm font-medium ${row.isWeekend ? 'text-violet-600' : ''}`}>
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
                          <span className="text-[10px] text-muted-foreground">—</span>
                        </div>
                      )}
                    </div>

                    {/* Stats — visitors always shown; avg/session hidden on mobile */}
                    {hasData ? (
                      <div className="flex items-center gap-2 flex-shrink-0 justify-end">
                        <span className="text-xs sm:text-sm font-medium tabular-nums w-12 sm:w-16 text-right">
                          {row.visitors.toLocaleString()}
                        </span>
                        <span className="hidden sm:inline text-xs text-muted-foreground w-24 text-right">
                          avg {row.avgVisitorsPerSession.toFixed(1)}/session
                        </span>
                        <Badge variant={occupancyBadgeVariant(row.occupancy)} className="text-[10px] w-11 justify-center flex-shrink-0">
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
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-3 pt-3 border-t">
              Bar width = relative visitor volume · Badge = occupancy · Cumulative totals from Momence session data.
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
    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
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
