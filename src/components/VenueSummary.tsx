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
}

export function VenueSummary({ metrics, venueConfig, monthlyData, hostInfo }: VenueSummaryProps) {
  const venueName = hostInfo?.name || venueConfig?.venueName || 'Venue';
  const initials = venueName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Derived metrics
  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
  const weeklyRevenue = metrics.weeklyVisits * metrics.impliedArpv;
  const theoreticalMaxWeekly = Math.round(
    sessionsPerWeek * metrics.avgCapacityPerSession
  );

  // Visitor trend (recent 3mo vs earlier)
  const recentMonths = monthlyData.slice(-3);
  const olderMonths = monthlyData.slice(0, -3);
  const recentAvgVisitors = recentMonths.length > 0
    ? recentMonths.reduce((sum, m) => sum + m.ticketsSold, 0) / recentMonths.length
    : 0;
  const olderAvgVisitors = olderMonths.length > 0
    ? olderMonths.reduce((sum, m) => sum + m.ticketsSold, 0) / olderMonths.length
    : 0;
  const visitorTrendPct = olderAvgVisitors > 0
    ? ((recentAvgVisitors - olderAvgVisitors) / olderAvgVisitors) * 100
    : 0;

  // Best month by visitors not occupancy
  const bestMonth = monthlyData.length > 0
    ? monthlyData.reduce((best, m) => m.ticketsSold > best.ticketsSold ? m : best)
    : null;

  return (
    <div className="space-y-6">
      {/* Venue Profile */}
      {venueConfig && (
        <Card className="border-2 bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <Avatar className="h-20 w-20 rounded-xl">
                  {hostInfo?.profileImage && (
                    <AvatarImage src={hostInfo.profileImage} alt={venueName} />
                  )}
                  <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{venueName}</h3>
                  {hostInfo?.industry && (
                    <p className="text-sm text-muted-foreground">{hostInfo.industry}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-medium">{venueConfig.duration} min</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Capacity</p>
                    <p className="text-sm font-medium">{venueConfig.capacity} guests</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="text-sm font-medium">${venueConfig.price}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Hours</p>
                    <p className="text-sm font-medium">{formatOperatingHours(metrics.operatingHours)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Primary Performance — the numbers that matter */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Primary Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Weekly Visitors"
            value={Math.round(metrics.weeklyVisits).toLocaleString()}
            sublabel={`${metrics.totalVisits.toLocaleString()} total over ${Math.round(metrics.weeksInRange)} weeks`}
            size="large"
          />
          {metrics.impliedArpv > 0 && (
            <MetricCard
              label="Weekly Revenue"
              value={`$${Math.round(weeklyRevenue).toLocaleString()}`}
              sublabel={`$${metrics.impliedArpv.toFixed(2)} ARPV`}
              size="large"
            />
          )}
          <MetricCard
            label="Avg Group Size"
            value={metrics.avgVisitorsPerSession.toFixed(1)}
            sublabel={`of ${metrics.avgCapacityPerSession.toFixed(0)} capacity per session`}
            size="large"
          />
          <MetricCard
            label="Sessions / Week"
            value={sessionsPerWeek.toFixed(1)}
            sublabel={`${(sessionsPerWeek / 7).toFixed(1)}/day`}
            size="large"
          />
        </div>
      </div>

      {/* Operational Context — how you're getting there */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Operational Context
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Operating Hours"
            value={`${metrics.weeklyOpenHours.toFixed(0)}/week`}
            sublabel={formatOperatingHours(metrics.operatingHours)}
          />
          <MetricCard
            label="Capacity"
            value={`${metrics.avgCapacityPerSession.toFixed(0)} guests`}
            sublabel="per session"
          />
          <MetricCard
            label="Theoretical Max"
            value={`${theoreticalMaxWeekly.toLocaleString()}/week`}
            sublabel={`${sessionsPerWeek.toFixed(0)} sessions × ${metrics.avgCapacityPerSession.toFixed(0)} seats`}
          />
          <MetricCard
            label="Current Utilisation"
            value={`${(metrics.occupancyRate * 100).toFixed(1)}%`}
            sublabel={`${Math.round(metrics.weeklyVisits)} of ${theoreticalMaxWeekly.toLocaleString()} weekly slots`}
          />
        </div>
      </div>

      {/* Signals — trends and distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weekday vs Weekend */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-xs text-muted-foreground mb-2">Weekly Distribution</h4>
            <div className="space-y-2">
              <DemandBar label="Weekday" value={metrics.weekdayShare} visitors={metrics.weekdayVisits} />
              <DemandBar label="Weekend" value={metrics.weekendShare} visitors={metrics.weekendVisits} />
            </div>
          </CardContent>
        </Card>

        {/* Visitor Trend */}
        {monthlyData.length >= 4 && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs text-muted-foreground mb-2">Visitor Trend</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-semibold ${visitorTrendPct >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                    {visitorTrendPct >= 0 ? '↑' : '↓'} {Math.abs(visitorTrendPct).toFixed(0)}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    recent 3 months
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(recentAvgVisitors).toLocaleString()} avg visitors/mo vs {Math.round(olderAvgVisitors).toLocaleString()} earlier
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Best month by visitors */}
        {bestMonth && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs text-muted-foreground mb-2">Strongest Month</h4>
              <div className="space-y-1">
                <p className="text-xl font-semibold text-green-600">
                  {bestMonth.ticketsSold.toLocaleString()} visitors
                </p>
                <p className="text-sm text-muted-foreground">
                  {bestMonth.month} {bestMonth.year}
                </p>
                <p className="text-xs text-muted-foreground">
                  {bestMonth.sessions} sessions, {bestMonth.utilisation.toFixed(0)}% utilisation
                </p>
              </div>
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
  size = 'default',
}: {
  label: string;
  value: string;
  sublabel: string;
  size?: 'default' | 'large';
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`font-semibold ${size === 'large' ? 'text-2xl' : 'text-xl'}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
      </CardContent>
    </Card>
  );
}

function DemandBar({ label, value, visitors }: { label: string; value: number; visitors: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{visitors.toLocaleString()} visitors</p>
    </div>
  );
}
