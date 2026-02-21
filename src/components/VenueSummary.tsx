import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, Users, CalendarDays, Flame, Activity, BarChart3, SplitSquareHorizontal } from 'lucide-react';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import type { VenueConfig, MonthlyData } from '@/types/momence';
import type { HostInfo } from '@/lib/momenceClient';
import { formatOperatingHours } from '@/lib/benchmarkMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface VenueSummaryProps {
  metrics: BenchmarkMetrics;
  venueConfig: VenueConfig | null;
  monthlyData: MonthlyData[];
  hostInfo: HostInfo | null;
  dateRange?: { from: string; to: string };
}

function formatDateRange(from: string, to: string): string {
  try {
    return `${format(parseISO(from), 'MMM d, yyyy')} – ${format(parseISO(to), 'MMM d, yyyy')}`;
  } catch {
    return `${from} – ${to}`;
  }
}

export function VenueSummary({ metrics, venueConfig, monthlyData, hostInfo, dateRange }: VenueSummaryProps) {
  const venueName = hostInfo?.name || venueConfig?.venueName || 'Venue';
  const initials = venueName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // 1. Total Visitors
  const totalVisitors = metrics.totalVisits;

  // 2. Avg Weekly Visitors
  const avgWeekly = Math.round(metrics.weeklyVisits);

  // 3. Occupancy
  const occupancyRate = metrics.occupancyRate;
  const occupancyPct = (occupancyRate * 100).toFixed(1);
  const occupancyAccent = occupancyRate >= 0.7 ? 'border-l-green-500' : occupancyRate >= 0.4 ? 'border-l-amber-500' : 'border-l-red-500';
  const occupancyValueClass = occupancyRate >= 0.7 ? 'text-green-600' : occupancyRate >= 0.4 ? 'text-amber-600' : 'text-red-600';

  // 4. Peak Month
  const peakMonth = monthlyData.length > 0
    ? monthlyData.reduce((best, m) => m.ticketsSold > best.ticketsSold ? m : best)
    : null;

  // 5. Visitor Trend
  const sortedMonths = [...monthlyData].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return new Date(`${a.month} 1`).getMonth() - new Date(`${b.month} 1`).getMonth();
  });
  const recentMonths = sortedMonths.slice(-3);
  const olderMonths = sortedMonths.slice(0, -3);
  const recentAvg = recentMonths.length > 0
    ? recentMonths.reduce((s, m) => s + m.ticketsSold, 0) / recentMonths.length
    : 0;
  const olderAvg = olderMonths.length > 0
    ? olderMonths.reduce((s, m) => s + m.ticketsSold, 0) / olderMonths.length
    : 0;
  const trendPct = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : null;
  const hasTrend = trendPct !== null && monthlyData.length >= 4;

  // 6. Demand split
  const weekdayPct = Math.round(metrics.weekdayShare * 100);
  const weekendPct = Math.round(metrics.weekendShare * 100);
  const dominantDay = weekdayPct >= weekendPct ? 'Weekday' : 'Weekend';
  const dominantPct = Math.max(weekdayPct, weekendPct);

  return (
    <div className="space-y-6">
      {/* Venue Profile */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-20 w-20 rounded-xl flex-shrink-0">
              {hostInfo?.profileImage && (
                <AvatarImage src={hostInfo.profileImage} alt={venueName} />
              )}
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{venueName}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-0.5">
                  {dateRange && <span>{formatDateRange(dateRange.from, dateRange.to)}</span>}
                  {hostInfo?.industry && <><span>·</span><span>{hostInfo.industry}</span></>}
                </div>
              </div>
              {venueConfig && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Spec label="Duration" value={`${venueConfig.duration} min`} />
                  <Spec label="Capacity" value={`${venueConfig.capacity} guests`} />
                  {venueConfig.price > 0 && <Spec label="Price" value={`$${venueConfig.price}`} />}
                  <Spec label="Hours" value={formatOperatingHours(metrics.operatingHours)} />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6 Insight Cards */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Key Insights</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          {/* 1 — Total Visitors */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground">Total Visitors</p>
                <Users size={14} className="text-muted-foreground/40 mt-0.5" />
              </div>
              <p className="text-3xl font-bold mt-1 tabular-nums">
                {totalVisitors.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {dateRange ? formatDateRange(dateRange.from, dateRange.to) : `${Math.round(metrics.weeksInRange)} weeks`}
              </p>
            </CardContent>
          </Card>

          {/* 2 — Avg Weekly */}
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground">Avg Weekly Visitors</p>
                <Activity size={14} className="text-muted-foreground/40 mt-0.5" />
              </div>
              <p className="text-3xl font-bold mt-1 tabular-nums">
                {avgWeekly.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.dailyVisits.toFixed(1)} per day
              </p>
            </CardContent>
          </Card>

          {/* 3 — Occupancy */}
          <Card className={`border-l-4 ${occupancyAccent}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground">Occupancy Rate</p>
                <BarChart3 size={14} className="text-muted-foreground/40 mt-0.5" />
              </div>
              <p className={`text-3xl font-bold mt-1 tabular-nums ${occupancyValueClass}`}>
                {occupancyPct}%
              </p>
              <Progress
                value={occupancyRate * 100}
                className={`h-1.5 mt-2 mb-1 ${
                  occupancyRate >= 0.7
                    ? '[&>div]:bg-green-500'
                    : occupancyRate >= 0.4
                    ? '[&>div]:bg-amber-500'
                    : '[&>div]:bg-red-500'
                }`}
              />
              <p className="text-xs text-muted-foreground">
                {totalVisitors.toLocaleString()} of {metrics.totalCapacity.toLocaleString()} seats
              </p>
            </CardContent>
          </Card>

          {/* 4 — Peak Month */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground">Peak Month</p>
                <Flame size={14} className="text-muted-foreground/40 mt-0.5" />
              </div>
              {peakMonth ? (
                <>
                  <p className="text-3xl font-bold mt-1 tabular-nums text-green-600">
                    {peakMonth.ticketsSold.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {peakMonth.month} {peakMonth.year}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{peakMonth.sessions} sessions</span>
                  </div>
                </>
              ) : (
                <p className="text-3xl font-bold mt-1 text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          {/* 5 — Trend */}
          <Card className={`border-l-4 ${hasTrend && trendPct! >= 0 ? 'border-l-green-500' : hasTrend ? 'border-l-amber-500' : 'border-l-muted'}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground">Visitor Trend</p>
                {hasTrend
                  ? trendPct! >= 0
                    ? <TrendingUp size={14} className="text-green-500 mt-0.5" />
                    : <TrendingDown size={14} className="text-amber-500 mt-0.5" />
                  : <Minus size={14} className="text-muted-foreground/40 mt-0.5" />
                }
              </div>
              {hasTrend ? (
                <>
                  <p className={`text-3xl font-bold mt-1 tabular-nums ${trendPct! >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                    {trendPct! >= 0 ? '+' : ''}{trendPct!.toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recent 3mo avg {Math.round(recentAvg).toLocaleString()} vs {Math.round(olderAvg).toLocaleString()} earlier
                  </p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold mt-1 text-muted-foreground">—</p>
                  <p className="text-xs text-muted-foreground mt-1">Need 4+ months of data</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* 6 — Demand Split */}
          <Card className="border-l-4 border-l-violet-400">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground">Demand Split</p>
                <SplitSquareHorizontal size={14} className="text-muted-foreground/40 mt-0.5" />
              </div>
              <p className="text-3xl font-bold mt-1 tabular-nums">
                {dominantPct}% <span className="text-xl font-semibold text-muted-foreground">{dominantDay}</span>
              </p>
              {/* Two-tone bar */}
              <div className="flex h-2 rounded-full overflow-hidden mt-2 gap-px">
                <div className="bg-blue-400 h-full transition-all" style={{ width: `${weekdayPct}%` }} />
                <div className="bg-violet-400 h-full transition-all" style={{ width: `${weekendPct}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1 align-middle" />
                  Weekday {weekdayPct}%
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Weekend {weekendPct}%
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-400 ml-1 align-middle" />
                </span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
