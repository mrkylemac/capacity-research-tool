import { useState, useMemo } from 'react';
import { parseISO, format, startOfWeek, getWeek } from 'date-fns';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import type { MonthlyData, MomenceSession } from '@/types/momence';
import { Card, CardContent } from '@/components/untitled/card';
import { Button } from '@/components/untitled/button';
import { Badge } from '@/components/untitled/badge';
import { ChevronDown } from 'lucide-react';
import { Disclosure } from '@/components/untitled/disclosure';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface MonthlyTableProps {
  data: MonthlyData[];
  sessions: MomenceSession[];
  collapsible?: boolean;
}

interface WeeklyDataWithSessions {
  weekKey: string;
  weekLabel: string;
  weekStart: Date;
  sessionCount: number;
  visitors: number;
  capacity: number;
  occupancy: number;
  rawSessions: MomenceSession[];
}

interface SeasonalPattern {
  season: string;
  months: string[];
  avgVisitors: number;
  trend: 'high' | 'medium' | 'low';
}

function analyzeSeasonalPatterns(monthlyData: MonthlyData[]): {
  patterns: SeasonalPattern[];
  peakSeason: string;
  growthRate: number;
  rampUpMonths: number;
} {
  if (monthlyData.length === 0) {
    return {
      patterns: [],
      peakSeason: '',
      growthRate: 0,
      rampUpMonths: 0,
    };
  }

  const seasonMap = new Map<string, number[]>();
  
  monthlyData.forEach(m => {
    const monthName = m.month;
    if (!seasonMap.has(monthName)) {
      seasonMap.set(monthName, []);
    }
    seasonMap.get(monthName)!.push(m.ticketsSold);
  });

  const monthAverages: Array<{ month: string; avg: number }> = [];
  seasonMap.forEach((visitors, month) => {
    const avg = visitors.reduce((sum, v) => sum + v, 0) / visitors.length;
    monthAverages.push({ month, avg });
  });

  monthAverages.sort((a, b) => b.avg - a.avg);
  const overallAvg = monthAverages.reduce((sum, m) => sum + m.avg, 0) / monthAverages.length;

  const peakSeason = monthAverages[0]?.month || '';

  const sortedByDate = [...monthlyData].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return new Date(`${a.month} 1, ${a.year}`).getMonth() - new Date(`${b.month} 1, ${b.year}`).getMonth();
  });
  
  const firstThree = sortedByDate.slice(0, Math.min(3, sortedByDate.length));
  const lastThree = sortedByDate.slice(-Math.min(3, sortedByDate.length));
  const firstAvg = firstThree.reduce((sum, m) => sum + m.ticketsSold, 0) / firstThree.length;
  const lastAvg = lastThree.reduce((sum, m) => sum + m.ticketsSold, 0) / lastThree.length;
  const growthRate = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

  const peakVisitors = Math.max(...monthlyData.map(m => m.ticketsSold));
  const threshold = peakVisitors * 0.8;
  let rampUpMonths = 0;
  for (const month of sortedByDate) {
    if (month.ticketsSold >= threshold) break;
    rampUpMonths++;
  }

  const patterns: SeasonalPattern[] = monthAverages.map(m => ({
    season: m.month,
    months: monthlyData.filter(d => d.month === m.month).map(d => `${d.month} ${d.year}`),
    avgVisitors: Math.round(m.avg),
    trend: m.avg >= overallAvg * 1.15 ? 'high' : m.avg <= overallAvg * 0.85 ? 'low' : 'medium',
  }));

  return {
    patterns,
    peakSeason,
    growthRate,
    rampUpMonths,
  };
}

function calculateWeeklyDataWithSessions(sessions: MomenceSession[], month?: string, year?: number): WeeklyDataWithSessions[] {
  const filtered = month && year
    ? sessions.filter(s => {
        const date = parseISO(s.startsAt);
        return format(date, 'MMMM') === month && date.getFullYear() === year;
      })
    : sessions;

  const weeklyMap = new Map<string, { sessions: MomenceSession[]; weekStart: Date }>();

  filtered.forEach(session => {
    const date = parseISO(session.startsAt);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-ww');

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, { sessions: [], weekStart });
    }
    weeklyMap.get(weekKey)!.sessions.push(session);
  });

  const results: WeeklyDataWithSessions[] = [];
  weeklyMap.forEach((data, weekKey) => {
    const visitors = data.sessions.reduce((sum, s) => sum + s.ticketsSold, 0);
    const capacity = data.sessions.reduce((sum, s) => sum + s.capacity, 0);
    const occupancy = capacity > 0 ? (visitors / capacity) * 100 : 0;

    const sortedSessions = [...data.sessions].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );

    results.push({
      weekKey,
      weekLabel: `W${getWeek(data.weekStart, { weekStartsOn: 1 })}`,
      weekStart: data.weekStart,
      sessionCount: data.sessions.length,
      visitors,
      capacity,
      occupancy,
      rawSessions: sortedSessions,
    });
  });

  return results.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

function formatSessionTime(startsAt: string, durationMinutes: number): string {
  const start = parseISO(startsAt);
  const endTime = new Date(start.getTime() + durationMinutes * 60000);
  
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return minutes > 0 ? `${hour12}:${minutes.toString().padStart(2, '0')}${period}` : `${hour12}${period}`;
  };

  return `${formatTime(start)}–${formatTime(endTime)}`;
}

export function MonthlyTable({ data, sessions, collapsible = false }: MonthlyTableProps) {
  const [selectedMonth, setSelectedMonth] = useState<{ month: string; year: number } | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'monthly' | 'weekly'>('timeline');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  const toggleWeek = (weekKey: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekKey)) next.delete(weekKey);
      else next.add(weekKey);
      return next;
    });
  };

  const seasonalAnalysis = useMemo(() => analyzeSeasonalPatterns(data), [data]);

  const weeklyData = useMemo(() => {
    if (selectedMonth) {
      return calculateWeeklyDataWithSessions(sessions, selectedMonth.month, selectedMonth.year);
    }
    return calculateWeeklyDataWithSessions(sessions);
  }, [sessions, selectedMonth]);

  const chartData = useMemo(() => {
    if (viewMode === 'timeline') {
      return data.map(m => ({
        name: `${m.month.slice(0, 3)} '${m.year.toString().slice(-2)}`,
        occupancy: Math.round(m.utilisation * 10) / 10,
        visitors: m.ticketsSold,
      }));
    }
    if (viewMode === 'weekly') {
      return weeklyData.map(w => ({
        name: selectedMonth ? w.weekLabel : `${w.weekLabel} ${format(w.weekStart, 'MMM')}`,
        occupancy: Math.round(w.occupancy * 10) / 10,
        visitors: w.visitors,
      }));
    }
    return data.map(m => ({
      name: `${m.month.slice(0, 3)} ${m.year}`,
      occupancy: Math.round(m.utilisation * 10) / 10,
      visitors: m.ticketsSold,
    }));
  }, [data, weeklyData, viewMode, selectedMonth]);

  if (data.length === 0) return null;

  const activeMonths = data.filter(row => row.ticketsSold > 0);
  const inactiveMonthCount = data.length - activeMonths.length;

  const totals = data.reduce(
    (acc, row) => ({
      sessions: acc.sessions + row.sessions,
      visitors: acc.visitors + row.ticketsSold,
      capacity: acc.capacity + row.capacity,
    }),
    { sessions: 0, visitors: 0, capacity: 0 }
  );

  const activeTotals = activeMonths.reduce(
    (acc, row) => ({
      visitors: acc.visitors + row.ticketsSold,
      capacity: acc.capacity + row.capacity,
    }),
    { visitors: 0, capacity: 0 }
  );

  const avgOccupancy = activeTotals.capacity > 0 ? (activeTotals.visitors / activeTotals.capacity) * 100 : 0;

  const inner = (
    <div className="space-y-4">
      {/* View Toggle and Month Filter */}
      <div className="space-y-2">
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'timeline' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => { setViewMode('timeline'); setSelectedMonth(null); }}
          >
            Timeline
          </Button>
          <Button
            variant={viewMode === 'monthly' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => { setViewMode('monthly'); setSelectedMonth(null); }}
          >
            Monthly
          </Button>
          <Button
            variant={viewMode === 'weekly' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('weekly')}
          >
            Weekly
          </Button>
        </div>

        {viewMode === 'weekly' && (
          <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            <Button
              variant={selectedMonth === null ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-shrink-0"
              onClick={() => { setSelectedMonth(null); setExpandedWeeks(new Set()); }}
            >
              All
            </Button>
            {data.map((m, i) => (
              <Button
                key={i}
                variant={selectedMonth?.month === m.month && selectedMonth?.year === m.year ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-shrink-0"
                onClick={() => { setSelectedMonth({ month: m.month, year: m.year }); setExpandedWeeks(new Set()); }}
              >
                {m.month.slice(0, 3)} {m.year.toString().slice(2)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">
              {viewMode === 'timeline' 
                ? 'Visitor Growth & Seasonal Patterns'
                : viewMode === 'weekly' 
                  ? selectedMonth 
                    ? `Weekly Occupancy – ${selectedMonth.month} ${selectedMonth.year}`
                    : 'Weekly Occupancy (All Time)'
                  : 'Monthly Occupancy Trend'
              }
            </p>
            {viewMode === 'timeline' && data.length > 1 && (
              <Badge className="text-xs">
                {data.length} months tracked
              </Badge>
            )}
            {selectedMonth && (
              <Badge className="text-xs">
                {weeklyData.length} weeks
              </Badge>
            )}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 40, left: -20, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'hsl(0 0% 45%)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: 'hsl(0 0% 45%)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fill: 'hsl(0 0% 45%)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(0 0% 90%)',
                    borderRadius: '6px',
                    fontSize: 12,
                    color: 'hsl(0 0% 9%)',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'occupancy' ? `${value}%` : value.toLocaleString(),
                    name === 'occupancy' ? 'Occupancy' : 'Visitors',
                  ]}
                />
                <ReferenceLine yAxisId="right" y={70} stroke="hsl(142 71% 45%)" strokeDasharray="4 4" strokeOpacity={0.6} />
                <ReferenceLine yAxisId="right" y={avgOccupancy} stroke="hsl(0 0% 60%)" strokeDasharray="5 5" />
                <Bar yAxisId="left" dataKey="visitors" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {chartData.map((d, i) => {
                    const fill = d.occupancy >= 70 ? '#22c55e' : d.occupancy >= 40 ? '#f59e0b' : '#ef4444';
                    return <Cell key={i} fill={fill} fillOpacity={0.85} />;
                  })}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="occupancy"
                  stroke="hsl(0 0% 35%)"
                  strokeWidth={1.5}
                  dot={{ fill: 'hsl(0 0% 35%)', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-green-500 opacity-85" /> ≥70% occupancy
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-500 opacity-85" /> 40–69%
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-red-500 opacity-85" /> &lt;40%
            </span>
            <span className="text-[10px] text-muted-foreground">
              — — avg {avgOccupancy.toFixed(1)}% &nbsp;·&nbsp; green dashed = 70% threshold
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {viewMode === 'timeline' ? (
              <table className="notion-table min-w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th>Month</th>
                    <th className="text-right">Visitors</th>
                    <th className="hidden sm:table-cell text-right">vs Prev</th>
                    <th className="text-right">Occupancy</th>
                    <th className="hidden sm:table-cell">Phase</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => {
                    const prevMonth = index > 0 ? data[index - 1] : null;
                    const growth = prevMonth && prevMonth.ticketsSold > 0
                      ? ((row.ticketsSold - prevMonth.ticketsSold) / prevMonth.ticketsSold) * 100
                      : null;

                    const pattern = seasonalAnalysis.patterns.find(p =>
                      p.months.includes(`${row.month} ${row.year}`)
                    );

                    return (
                      <tr
                        key={index}
                        className="cursor-pointer hover:bg-muted/20"
                        onClick={() => { setViewMode('weekly'); setSelectedMonth({ month: row.month, year: row.year }); }}
                      >
                        <td className="font-medium">
                          <span className="hidden sm:inline">{row.month} {row.year}</span>
                          <span className="sm:hidden">{row.month.slice(0, 3)} {row.year.toString().slice(2)}</span>
                          {pattern?.trend === 'high' && (
                            <Badge variant="default" className="ml-2 text-[10px] hidden sm:inline-flex">Peak</Badge>
                          )}
                          {pattern?.trend === 'low' && (
                            <Badge variant="outline" className="ml-2 text-[10px] hidden sm:inline-flex">Off</Badge>
                          )}
                        </td>
                        <td className="text-right font-medium">{row.ticketsSold.toLocaleString()}</td>
                        <td className="hidden sm:table-cell text-right">
                          {growth !== null ? (
                            <span className={growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-muted-foreground'}>
                              {growth > 0 ? '+' : ''}{growth.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className={getOccupancyClass(row.utilisation)}>
                          {row.utilisation.toFixed(1)}%
                        </td>
                        <td className="hidden sm:table-cell text-xs text-muted-foreground">
                          {index === 0 && 'Launch'}
                          {index > 0 && index < seasonalAnalysis.rampUpMonths && 'Ramp-up'}
                          {index >= seasonalAnalysis.rampUpMonths && 'Established'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : viewMode === 'weekly' ? (
              <div className="divide-y">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4 px-3 sm:px-4 py-3 bg-muted/30 text-xs sm:text-sm font-medium">
                  <div>Week</div>
                  <div className="hidden sm:block text-right">Sessions</div>
                  <div className="text-right">Visitors</div>
                  <div className="hidden sm:block text-right">Total Seats</div>
                  <div className="hidden sm:block text-right">Seats/Session</div>
                  <div className="text-right">Occupancy</div>
                </div>

                {weeklyData.map((row) => {
                  const seatsPerSession = row.sessionCount > 0 ? row.capacity / row.sessionCount : 0;
                  const isExpanded = expandedWeeks.has(row.weekKey);

                  return (
                    <Collapsible key={row.weekKey} open={isExpanded} onOpenChange={() => toggleWeek(row.weekKey)}>
                      <CollapsibleTrigger asChild>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4 px-3 sm:px-4 py-3 text-sm cursor-pointer hover:bg-muted/20 transition-colors">
                          <div className="font-medium flex items-center gap-1.5 min-w-0">
                            <span className="text-muted-foreground text-xs flex-shrink-0">{isExpanded ? '▼' : '▶'}</span>
                            <span className="truncate">
                              <span className="hidden sm:inline">{row.weekLabel} – </span>
                              {format(row.weekStart, 'MMM d')}
                            </span>
                          </div>
                          <div className="hidden sm:block text-right">{row.sessionCount}</div>
                          <div className="text-right">{row.visitors.toLocaleString()}</div>
                          <div className="hidden sm:block text-right text-muted-foreground">{row.capacity.toLocaleString()}</div>
                          <div className="hidden sm:block text-right text-muted-foreground">{seatsPerSession.toFixed(0)}</div>
                          <div className={`text-right ${getOccupancyClass(row.occupancy)}`}>
                            {row.occupancy.toFixed(1)}%
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="bg-muted/10 border-t px-3 sm:px-4 py-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {row.rawSessions.map((session) => {
                              const occupancyPct = session.capacity > 0
                                ? (session.ticketsSold / session.capacity) * 100
                                : 0;
                              return (
                                <div
                                  key={session.id}
                                  className="flex items-center justify-between text-xs bg-background rounded px-3 py-2 border"
                                >
                                  <div>
                                    <span className="font-medium">
                                      {format(parseISO(session.startsAt), 'MMM d')}
                                    </span>
                                    <span className="text-muted-foreground ml-2">
                                      {formatSessionTime(session.startsAt, session.durationMinutes)}
                                    </span>
                                  </div>
                                  <Badge
                                    variant={occupancyPct >= 70 ? 'default' : occupancyPct >= 40 ? 'secondary' : 'destructive'}
                                    className="text-xs ml-2 flex-shrink-0"
                                  >
                                    {session.ticketsSold}/{session.capacity}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            ) : (
              <table className="notion-table min-w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th>Month</th>
                    <th className="text-right">Sessions</th>
                    <th className="text-right">Visitors</th>
                    <th className="hidden sm:table-cell text-right">Total Seats</th>
                    <th className="hidden sm:table-cell text-right">Seats/Session</th>
                    <th className="text-right">Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, index) => {
                    const seatsPerSession = row.sessions > 0 ? row.capacity / row.sessions : 0;
                    return (
                      <tr
                        key={index}
                        className="cursor-pointer hover:bg-muted/20"
                        onClick={() => { setViewMode('weekly'); setSelectedMonth({ month: row.month, year: row.year }); }}
                      >
                        <td className="font-medium">
                          <span className="hidden sm:inline">{row.month} {row.year}</span>
                          <span className="sm:hidden">{row.month.slice(0, 3)} {row.year.toString().slice(2)}</span>
                        </td>
                        <td className="text-right">{row.sessions}</td>
                        <td className="text-right">{row.ticketsSold.toLocaleString()}</td>
                        <td className="hidden sm:table-cell text-right text-muted-foreground">{row.capacity.toLocaleString()}</td>
                        <td className="hidden sm:table-cell text-right text-muted-foreground">{seatsPerSession.toFixed(0)}</td>
                        <td className={`text-right ${getOccupancyClass(row.utilisation)}`}>
                          {row.utilisation.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-semibold">
                    <td>Total</td>
                    <td className="text-right">{totals.sessions.toLocaleString()}</td>
                    <td className="text-right">{activeTotals.visitors.toLocaleString()}</td>
                    <td className="hidden sm:table-cell text-right text-muted-foreground">{activeTotals.capacity.toLocaleString()}</td>
                    <td className="hidden sm:table-cell text-right text-muted-foreground">
                      {activeMonths.length > 0
                        ? (activeTotals.capacity / activeMonths.reduce((sum, m) => sum + m.sessions, 0)).toFixed(0)
                        : '-'
                      }
                    </td>
                    <td className={`text-right ${getOccupancyClass(avgOccupancy)}`}>
                      {avgOccupancy.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {viewMode === 'timeline' && data.length > 1 && (
        <div className="space-y-2">
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Peak Season</p>
                <p className="text-sm font-semibold">{seasonalAnalysis.peakSeason || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Growth Rate</p>
                <p className={`text-sm font-semibold ${seasonalAnalysis.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {seasonalAnalysis.growthRate > 0 ? '+' : ''}{seasonalAnalysis.growthRate.toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ramp-up Period</p>
                <p className="text-sm font-semibold">{seasonalAnalysis.rampUpMonths} months</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Tracked</p>
                <p className="text-sm font-semibold">{data.length} months</p>
              </div>
            </div>
            <div className="pt-3 border-t space-y-1">
              <p className="text-xs font-medium">Insights:</p>
              <p className="text-xs text-muted-foreground">
                • <span className="font-medium">{seasonalAnalysis.peakSeason}</span> shows strongest visitation patterns
              </p>
              {seasonalAnalysis.growthRate > 0 && (
                <p className="text-xs text-muted-foreground">
                  • <span className="font-medium">Positive momentum:</span> visitors growing {seasonalAnalysis.growthRate.toFixed(0)}% from early to recent months
                </p>
              )}
              {seasonalAnalysis.rampUpMonths > 0 && (
                <p className="text-xs text-muted-foreground">
                  • <span className="font-medium">Launch phase:</span> took {seasonalAnalysis.rampUpMonths} months to reach 80% of peak performance
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {viewMode === 'monthly' && (
        <p className="text-xs text-muted-foreground text-center">
          Click any month row to see weekly breakdown
        </p>
      )}
      {viewMode === 'weekly' && (
        <p className="text-xs text-muted-foreground text-center">
          Click any week to see individual sessions
        </p>
      )}
    </div>
  );

  if (!collapsible) return inner;

  return (
    <Disclosure
      summary={(
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          <span>Show session data</span>
          <span className="text-xs font-normal">({data.length} months · {sessions.length} sessions)</span>
        </div>
      )}
    >
      {inner}
    </Disclosure>
  );
}

function getOccupancyClass(util: number): string {
  if (util >= 70) return 'text-green-600 font-medium';
  if (util >= 40) return 'text-amber-600';
  return 'text-red-600';
}
