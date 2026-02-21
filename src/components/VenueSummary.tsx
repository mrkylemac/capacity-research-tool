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
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-row gap-4">
            <Avatar className="h-14 w-14 sm:h-20 sm:w-20 rounded-xl flex-shrink-0">
              {hostInfo?.profileImage && (
                <AvatarImage src={hostInfo.profileImage} alt={venueName} />
              )}
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl sm:text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold leading-tight">{venueName}</h3>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {dateRange && <span>{formatDateRange(dateRange.from, dateRange.to)}</span>}
                  {hostInfo?.industry && <><span>·</span><span>{hostInfo.industry}</span></>}
                </div>
              </div>
              {venueConfig && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">

          {/* 1 — Total Visitors */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground leading-tight">Total Visitors</p>
                <Users size={13} className="text-muted-foreground/40 mt-0.5 flex-shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums">
                {totalVisitors.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-tight">
                {Math.round(metrics.weeksInRange)} weeks
              </p>
            </CardContent>
          </Card>

          {/* 2 — Avg Weekly */}
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground leading-tight">Avg Weekly</p>
                <Activity size={13} className="text-muted-foreground/40 mt-0.5 flex-shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums">
                {avgWeekly.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {metrics.dailyVisits.toFixed(1)}/day
              </p>
            </CardContent>
          </Card>

          {/* 3 — Occupancy */}
          <Card className={`border-l-4 ${occupancyAccent}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground leading-tight">Occupancy</p>
                <BarChart3 size={13} className="text-muted-foreground/40 mt-0.5 flex-shrink-0" />
              </div>
              <p className={`text-2xl sm:text-3xl font-bold mt-1 tabular-nums ${occupancyValueClass}`}>
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
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {totalVisitors.toLocaleString()}/{metrics.totalCapacity.toLocaleString()} seats
              </p>
            </CardContent>
          </Card>

          {/* 4 — Peak Month */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground leading-tight">Peak Month</p>
                <Flame size={13} className="text-muted-foreground/40 mt-0.5 flex-shrink-0" />
              </div>
              {peakMonth ? (
                <>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums text-green-600">
                    {peakMonth.ticketsSold.toLocaleString()}
                  </p>
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {peakMonth.month.slice(0, 3)} {peakMonth.year}
                    </Badge>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{peakMonth.sessions} sessions</span>
                  </div>
                </>
              ) : (
                <p className="text-2xl sm:text-3xl font-bold mt-1 text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>

          {/* 5 — Trend */}
          <Card className={`border-l-4 ${hasTrend && trendPct! >= 0 ? 'border-l-green-500' : hasTrend ? 'border-l-amber-500' : 'border-l-muted'}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground leading-tight">Trend</p>
                {hasTrend
                  ? trendPct! >= 0
                    ? <TrendingUp size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                    : <TrendingDown size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  : <Minus size={13} className="text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                }
              </div>
              {hasTrend ? (
                <>
                  <p className={`text-2xl sm:text-3xl font-bold mt-1 tabular-nums ${trendPct! >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                    {trendPct! >= 0 ? '+' : ''}{trendPct!.toFixed(0)}%
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-tight">
                    {Math.round(recentAvg).toLocaleString()} vs {Math.round(olderAvg).toLocaleString()} avg/mo
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-bold mt-1 text-muted-foreground">—</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Need 4+ months</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* 6 — Demand Split */}
          <Card className="border-l-4 border-l-violet-400">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between">
                <p className="text-xs text-muted-foreground leading-tight">Demand Split</p>
                <SplitSquareHorizontal size={13} className="text-muted-foreground/40 mt-0.5 flex-shrink-0" />
              </div>
              {/* Number on its own line to avoid overflow */}
              <p className="text-2xl sm:text-3xl font-bold mt-1 tabular-nums">{dominantPct}%</p>
              <p className="text-sm font-semibold text-muted-foreground -mt-0.5">{dominantDay}</p>
              {/* Two-tone bar */}
              <div className="flex h-2 rounded-full overflow-hidden mt-2 gap-px">
                <div className="bg-blue-400 h-full transition-all" style={{ width: `${weekdayPct}%` }} />
                <div className="bg-violet-400 h-full transition-all" style={{ width: `${weekendPct}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                  {weekdayPct}% wd
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  {weekendPct}% we
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-400" />
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
