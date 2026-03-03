import { useMemo } from 'react';
import { parseISO, format, startOfMonth, getDay } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import type { MomenceSession, MonthlyData } from '@/types/momence';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { chartTooltipContentStyle, chartTooltipLabelStyle } from '@/lib/chartTooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RevenueInsightsProps {
  sessions: MomenceSession[];
  monthlyData: MonthlyData[];
  benchmarkMetrics: BenchmarkMetrics | null;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  visitors: number;
  arpv: number;
  sessions: number;
}

interface RevenueByDayOfWeek {
  day: string;
  revenue: number;
  visitors: number;
  sessions: number;
  arpv: number;
}

interface Highlight {
  title: string;
  value: string;
  description: string;
  sentiment: 'positive' | 'neutral' | 'warning';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function computeMonthlyRevenue(sessions: MomenceSession[]): MonthlyRevenue[] {
  const map = new Map<string, MomenceSession[]>();
  sessions.forEach(s => {
    const key = format(startOfMonth(parseISO(s.startsAt)), 'yyyy-MM');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  });

  const result: MonthlyRevenue[] = [];
  map.forEach((monthSessions, key) => {
    const revenue = monthSessions.reduce((sum, s) => sum + s.ticketsSold * s.fixedTicketPrice, 0);
    const visitors = monthSessions.reduce((sum, s) => sum + s.ticketsSold, 0);
    const date = parseISO(key + '-01');
    result.push({
      month: format(date, 'MMM yyyy'),
      revenue,
      visitors,
      arpv: visitors > 0 ? revenue / visitors : 0,
      sessions: monthSessions.length,
    });
  });

  return result.sort((a, b) => a.month.localeCompare(b.month));
}

function computeRevenueByDay(sessions: MomenceSession[]): RevenueByDayOfWeek[] {
  const dayBuckets: MomenceSession[][] = Array.from({ length: 7 }, () => []);
  sessions.forEach(s => {
    const day = getDay(parseISO(s.startsAt));
    dayBuckets[day].push(s);
  });

  // Reorder to Mon-Sun
  const ordered = [1, 2, 3, 4, 5, 6, 0];
  return ordered.map(dayIdx => {
    const daySessions = dayBuckets[dayIdx];
    const revenue = daySessions.reduce((sum, s) => sum + s.ticketsSold * s.fixedTicketPrice, 0);
    const visitors = daySessions.reduce((sum, s) => sum + s.ticketsSold, 0);
    return {
      day: DAY_NAMES[dayIdx],
      revenue,
      visitors,
      sessions: daySessions.length,
      arpv: visitors > 0 ? revenue / visitors : 0,
    };
  });
}

function detectHighlights(
  sessions: MomenceSession[],
  monthlyRevenue: MonthlyRevenue[],
  dayRevenue: RevenueByDayOfWeek[],
  benchmarkMetrics: BenchmarkMetrics | null,
): Highlight[] {
  const highlights: Highlight[] = [];
  if (sessions.length === 0) return highlights;

  const totalRevenue = sessions.reduce((sum, s) => sum + s.ticketsSold * s.fixedTicketPrice, 0);
  const totalVisitors = sessions.reduce((sum, s) => sum + s.ticketsSold, 0);

  // 1. Revenue growth trend (if 3+ months)
  if (monthlyRevenue.length >= 3) {
    const recentHalf = monthlyRevenue.slice(-Math.ceil(monthlyRevenue.length / 2));
    const olderHalf = monthlyRevenue.slice(0, Math.floor(monthlyRevenue.length / 2));

    const recentAvg = recentHalf.reduce((s, m) => s + m.revenue, 0) / recentHalf.length;
    const olderAvg = olderHalf.length > 0
      ? olderHalf.reduce((s, m) => s + m.revenue, 0) / olderHalf.length
      : 0;

    if (olderAvg > 0) {
      const growthPct = ((recentAvg - olderAvg) / olderAvg) * 100;
      if (Math.abs(growthPct) >= 5) {
        highlights.push({
          title: growthPct > 0 ? 'Revenue Trending Up' : 'Revenue Declining',
          value: `${growthPct > 0 ? '+' : ''}${growthPct.toFixed(0)}%`,
          description: `Recent months avg $${Math.round(recentAvg).toLocaleString()} vs earlier $${Math.round(olderAvg).toLocaleString()}`,
          sentiment: growthPct > 0 ? 'positive' : 'warning',
        });
      }
    }
  }

  // 2. Best revenue day of week
  const activeDays = dayRevenue.filter(d => d.sessions > 0);
  if (activeDays.length > 0) {
    const bestDay = activeDays.reduce((best, d) => d.revenue > best.revenue ? d : best);
    const avgDayRevenue = activeDays.reduce((s, d) => s + d.revenue, 0) / activeDays.length;
    const aboveAvgPct = avgDayRevenue > 0 ? ((bestDay.revenue - avgDayRevenue) / avgDayRevenue) * 100 : 0;

    highlights.push({
      title: `${bestDay.day} is Strongest`,
      value: `$${bestDay.revenue.toLocaleString()}`,
      description: `${aboveAvgPct.toFixed(0)}% above avg day, ${bestDay.visitors.toLocaleString()} visitors across ${bestDay.sessions} sessions`,
      sentiment: 'positive',
    });
  }

  // 3. Best performing month
  if (monthlyRevenue.length >= 2) {
    const bestMonth = monthlyRevenue.reduce((best, m) => m.revenue > best.revenue ? m : best);
    highlights.push({
      title: `Peak Month: ${bestMonth.month}`,
      value: `$${bestMonth.revenue.toLocaleString()}`,
      description: `${bestMonth.visitors.toLocaleString()} visitors at $${bestMonth.arpv.toFixed(2)} ARPV`,
      sentiment: 'positive',
    });
  }

  // 4. ARPV consistency signal
  if (benchmarkMetrics && benchmarkMetrics.impliedArpv > 0) {
    const prices = sessions.filter(s => s.fixedTicketPrice > 0).map(s => s.fixedTicketPrice);
    if (prices.length > 0) {
      const uniquePrices = new Set(prices);
      if (uniquePrices.size === 1) {
        highlights.push({
          title: 'Consistent Pricing',
          value: `$${benchmarkMetrics.impliedArpv.toFixed(2)}`,
          description: `Single price point across all ${sessions.length} sessions`,
          sentiment: 'neutral',
        });
      } else {
        const weightedArpv = benchmarkMetrics.impliedArpv;
        const simpleAvg = benchmarkMetrics.avgPrice;
        const pricingSpread = ((Math.max(...prices) - Math.min(...prices)) / simpleAvg) * 100;
        highlights.push({
          title: `${uniquePrices.size} Price Tiers`,
          value: `$${weightedArpv.toFixed(2)} ARPV`,
          description: `Range $${Math.min(...prices)}–$${Math.max(...prices)} (${pricingSpread.toFixed(0)}% spread)`,
          sentiment: pricingSpread > 50 ? 'warning' : 'neutral',
        });
      }
    }
  }

  // 5. Weekend vs weekday revenue efficiency
  if (activeDays.length >= 5) {
    const weekdayRevenue = dayRevenue.slice(0, 5).reduce((s, d) => s + d.revenue, 0);
    const weekendRevenue = dayRevenue.slice(5).reduce((s, d) => s + d.revenue, 0);
    const weekdaySessions = dayRevenue.slice(0, 5).reduce((s, d) => s + d.sessions, 0);
    const weekendSessions = dayRevenue.slice(5).reduce((s, d) => s + d.sessions, 0);

    if (weekdaySessions > 0 && weekendSessions > 0) {
      const weekdayPerSession = weekdayRevenue / weekdaySessions;
      const weekendPerSession = weekendRevenue / weekendSessions;
      const winner = weekendPerSession > weekdayPerSession ? 'Weekend' : 'Weekday';
      const diff = Math.abs(weekendPerSession - weekdayPerSession);
      const diffPct = ((diff / Math.min(weekdayPerSession, weekendPerSession)) * 100);

      if (diffPct >= 5) {
        highlights.push({
          title: `${winner} Earns More/Session`,
          value: `$${Math.max(weekdayPerSession, weekendPerSession).toFixed(0)}/session`,
          description: `${diffPct.toFixed(0)}% higher than ${winner === 'Weekend' ? 'weekdays' : 'weekends'} ($${Math.min(weekdayPerSession, weekendPerSession).toFixed(0)}/session)`,
          sentiment: 'neutral',
        });
      }
    }
  }

  // Return top 3
  return highlights.slice(0, 3);
}

export function RevenueInsights({ sessions, monthlyData, benchmarkMetrics }: RevenueInsightsProps) {
  const hasPricing = sessions.some(s => s.fixedTicketPrice > 0);

  const { monthlyRevenue, dayRevenue, highlights, totalRevenue, totalVisitors } = useMemo(() => {
    const monthlyRevenue = computeMonthlyRevenue(sessions);
    const dayRevenue = computeRevenueByDay(sessions);
    const highlights = detectHighlights(sessions, monthlyRevenue, dayRevenue, benchmarkMetrics);
    const totalRevenue = sessions.reduce((sum, s) => sum + s.ticketsSold * s.fixedTicketPrice, 0);
    const totalVisitors = sessions.reduce((sum, s) => sum + s.ticketsSold, 0);
    return { monthlyRevenue, dayRevenue, highlights, totalRevenue, totalVisitors };
  }, [sessions, benchmarkMetrics]);

  if (sessions.length === 0 || !hasPricing) return null;

  const avgMonthlyRevenue = monthlyRevenue.length > 0
    ? monthlyRevenue.reduce((s, m) => s + m.revenue, 0) / monthlyRevenue.length
    : 0;

  const maxDayRevenue = Math.max(...dayRevenue.map(d => d.revenue));

  return (
    <div className="space-y-6">
      {/* Top-line revenue KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-xl font-semibold">${totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">{monthlyRevenue.length} months</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Avg Monthly</p>
            <p className="text-xl font-semibold">${Math.round(avgMonthlyRevenue).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">
              ${Math.round(avgMonthlyRevenue / 4.33).toLocaleString()}/week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">ARPV</p>
            <p className="text-xl font-semibold">
              ${totalVisitors > 0 ? (totalRevenue / totalVisitors).toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">per visit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Rev/Session</p>
            <p className="text-xl font-semibold">
              ${sessions.length > 0 ? Math.round(totalRevenue / sessions.length).toLocaleString() : '0'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{sessions.length} sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Top 3 Highlights */}
      {highlights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {highlights.map((h, i) => (
            <Card key={i} className={
              h.sentiment === 'positive' ? 'border-green-200 bg-green-50/50' :
              h.sentiment === 'warning' ? 'border-amber-200 bg-amber-50/50' :
              ''
            }>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={
                    h.sentiment === 'positive' ? 'default' :
                    h.sentiment === 'warning' ? 'destructive' :
                    'secondary'
                  } className="text-xs">
                    {h.sentiment === 'positive' ? 'Signal' : h.sentiment === 'warning' ? 'Watch' : 'Insight'}
                  </Badge>
                </div>
                <p className="text-sm font-medium mb-1">{h.title}</p>
                <p className="text-2xl font-semibold text-foreground">{h.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{h.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Monthly Revenue Trend */}
      {monthlyRevenue.length >= 2 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-3">Monthly Revenue Trend</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-revenue)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--chart-revenue)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={chartTooltipContentStyle}
                    labelStyle={chartTooltipLabelStyle}
                    formatter={(value: number, name: string) => {
                      if (name === 'revenue') return [`$${value.toLocaleString()}`, 'Revenue'];
                      return [value, name];
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--chart-revenue)"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={{ fill: 'var(--chart-revenue)', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue by Day of Week */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-3">Revenue by Day of Week</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayRevenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={chartTooltipContentStyle}
                  labelStyle={chartTooltipLabelStyle}
                  formatter={(value: number, name: string) => {
                    if (name === 'revenue') return [`$${value.toLocaleString()}`, 'Revenue'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {dayRevenue.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.revenue === maxDayRevenue
                        ? 'var(--chart-revenue)'
                        : entry.revenue > 0
                          ? 'color-mix(in srgb, var(--chart-revenue) 50%, transparent)'
                          : 'var(--border)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
