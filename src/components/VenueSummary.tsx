import { format, parseISO } from 'date-fns';
import { Users, TrendingUp, CalendarDays, Clock, BarChart3, Target, DollarSign } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import type { VenueConfig, MonthlyData } from '@/types/momence';
import type { HostInfo } from '@/lib/momenceClient';
import { formatOperatingHours } from '@/lib/benchmarkMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
  const weeklyRevenue = metrics.weeklyVisits * metrics.impliedArpv;
  const theoreticalMaxWeekly = Math.round(sessionsPerWeek * metrics.avgCapacityPerSession);

  const recentMonths = monthlyData.slice(-3);
  const olderMonths = monthlyData.slice(0, -3);
  const recentAvgVisitors = recentMonths.length > 0
    ? recentMonths.reduce((sum, m) => sum + m.ticketsSold, 0) / recentMonths.length : 0;
  const olderAvgVisitors = olderMonths.length > 0
    ? olderMonths.reduce((sum, m) => sum + m.ticketsSold, 0) / olderMonths.length : 0;
  const visitorTrendPct = olderAvgVisitors > 0
    ? ((recentAvgVisitors - olderAvgVisitors) / olderAvgVisitors) * 100 : 0;

  const bestMonth = monthlyData.length > 0
    ? monthlyData.reduce((best, m) => m.ticketsSold > best.ticketsSold ? m : best)
    : null;

  return (
    <div className="space-y-6">
      {/* Venue Profile */}
      {venueConfig && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 rounded-xl shrink-0">
                {hostInfo?.profileImage && (
                  <AvatarImage src={hostInfo.profileImage} alt={venueName} />
                )}
                <AvatarFallback className="rounded-xl bg-muted text-muted-foreground font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{venueName}</p>
                {dateRange && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatDateRange(dateRange.from, dateRange.to)}
                  </p>
                )}
              </div>
              <div className="hidden md:flex items-center divide-x divide-border">
                {[
                  { label: 'Duration', value: `${venueConfig.duration} min` },
                  { label: 'Capacity', value: `${venueConfig.capacity} guests` },
                  { label: 'Price', value: `$${venueConfig.price}` },
                  { label: 'Hours', value: formatOperatingHours(metrics.operatingHours) },
                ].map(({ label, value }) => (
                  <div key={label} className="px-5 first:pl-0 last:pr-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4 md:hidden">
              {[
                { label: 'Duration', value: `${venueConfig.duration} min` },
                { label: 'Capacity', value: `${venueConfig.capacity} guests` },
                { label: 'Price', value: `$${venueConfig.price}` },
                { label: 'Hours', value: formatOperatingHours(metrics.operatingHours) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Performance */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Primary Performance
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Weekly Visitors"
            value={Math.round(metrics.weeklyVisits).toLocaleString()}
            sublabel={`${metrics.totalVisits.toLocaleString()} total over ${Math.round(metrics.weeksInRange)} wks`}
            icon={Users}
          />
          {metrics.impliedArpv > 0 && (
            <MetricCard
              label="Weekly Revenue"
              value={`$${Math.round(weeklyRevenue).toLocaleString()}`}
              sublabel={`$${metrics.impliedArpv.toFixed(2)} per visitor`}
              icon={DollarSign}
            />
          )}
          <MetricCard
            label="Avg Group Size"
            value={metrics.avgVisitorsPerSession.toFixed(1)}
            sublabel={`of ${metrics.avgCapacityPerSession.toFixed(0)} seats per session`}
            icon={Users}
          />
          <MetricCard
            label="Sessions / Week"
            value={sessionsPerWeek.toFixed(1)}
            sublabel={`${(sessionsPerWeek / 7).toFixed(1)} per day`}
            icon={CalendarDays}
          />
        </div>
      </div>

      {/* Operational Context */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Operational Context
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Operating Hours"
            value={`${metrics.weeklyOpenHours.toFixed(0)}/wk`}
            sublabel={formatOperatingHours(metrics.operatingHours)}
            icon={Clock}
          />
          <MetricCard
            label="Seats / Session"
            value={metrics.avgCapacityPerSession.toFixed(0)}
            sublabel="average capacity"
            icon={Users}
          />
          <MetricCard
            label="Weekly Max"
            value={theoreticalMaxWeekly.toLocaleString()}
            sublabel={`${sessionsPerWeek.toFixed(0)} sessions × ${metrics.avgCapacityPerSession.toFixed(0)} seats`}
            icon={BarChart3}
          />
          <MetricCard
            label="Utilisation"
            value={`${(metrics.occupancyRate * 100).toFixed(1)}%`}
            sublabel={`${Math.round(metrics.weeklyVisits)} of ${theoreticalMaxWeekly.toLocaleString()} weekly slots`}
            icon={Target}
          />
        </div>
      </div>

      {/* Signals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-semibold mb-3">Weekly Distribution</p>
            <div className="space-y-3">
              <DemandBar label="Weekday" value={metrics.weekdayShare} visitors={metrics.weekdayVisits} />
              <DemandBar label="Weekend" value={metrics.weekendShare} visitors={metrics.weekendVisits} />
            </div>
          </CardContent>
        </Card>

        {monthlyData.length >= 4 && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Visitor Trend</p>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className={`text-3xl font-bold tabular-nums ${visitorTrendPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {visitorTrendPct >= 0 ? '+' : ''}{Math.abs(visitorTrendPct).toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round(recentAvgVisitors).toLocaleString()} vs {Math.round(olderAvgVisitors).toLocaleString()} avg/mo
              </p>
            </CardContent>
          </Card>
        )}

        {bestMonth && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Strongest Month</p>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-3xl font-bold tabular-nums">
                {bestMonth.ticketsSold.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {bestMonth.month} {bestMonth.year} · {bestMonth.sessions} sessions
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold tabular-nums tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
      </CardContent>
    </Card>
  );
}

function DemandBar({ label, value, visitors }: { label: string; value: number; visitors: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{visitors.toLocaleString()} visitors</p>
    </div>
  );
}
