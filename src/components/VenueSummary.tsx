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
  // Calculate trends
  const recentMonths = monthlyData.slice(-3);
  const olderMonths = monthlyData.slice(0, -3);
  
  const recentAvgOccupancy = recentMonths.length > 0
    ? recentMonths.reduce((sum, m) => sum + m.utilisation, 0) / recentMonths.length
    : 0;
  const olderAvgOccupancy = olderMonths.length > 0
    ? olderMonths.reduce((sum, m) => sum + m.utilisation, 0) / olderMonths.length
    : 0;
  const occupancyTrend = recentAvgOccupancy - olderAvgOccupancy;

  const bestMonth = monthlyData.length > 0
    ? monthlyData.reduce((best, m) => m.utilisation > best.utilisation ? m : best)
    : null;
  const worstMonth = monthlyData.length > 0
    ? monthlyData.reduce((worst, m) => m.utilisation < worst.utilisation ? m : worst)
    : null;

  const venueName = hostInfo?.name || venueConfig?.venueName || 'Venue';
  const initials = venueName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Venue Profile - Featured Card */}
      {venueConfig && (
        <Card className="border-2 bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Profile Image */}
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

              {/* Profile Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{venueName}</h3>
                  {hostInfo?.industry && (
                    <p className="text-sm text-muted-foreground">{hostInfo.industry}</p>
                  )}
                </div>

                {/* Profile Stats */}
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

      {/* Key Metrics Grid - 3 per row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard
          label="Total Visitors"
          value={metrics.totalVisits.toLocaleString()}
          sublabel={`${metrics.weeksInRange} weeks`}
        />
        <MetricCard
          label="Weekly Average"
          value={Math.round(metrics.weeklyVisits).toLocaleString()}
          sublabel={`${Math.round(metrics.dailyVisits)} daily`}
        />
        <MetricCard
          label="Occupancy Rate"
          value={`${(metrics.occupancyRate * 100).toFixed(1)}%`}
          sublabel={getOccupancyLabel(metrics.occupancyRate)}
          highlight={getOccupancyHighlight(metrics.occupancyRate)}
        />
        <MetricCard
          label="Visitors/Session"
          value={metrics.avgVisitorsPerSession.toFixed(1)}
          sublabel={`of ${metrics.avgCapacityPerSession.toFixed(0)} capacity`}
        />
        <MetricCard
          label="Total Sessions"
          value={metrics.totalSessions.toLocaleString()}
          sublabel={`${(metrics.totalSessions / metrics.weeksInRange).toFixed(1)}/week`}
        />
        <MetricCard
          label="Visits/Hour"
          value={metrics.visitsPerOpenHour.toFixed(1)}
          sublabel={`${metrics.weeklyOpenHours.toFixed(0)} hrs/week open`}
        />
      </div>

      {/* Insights Row - max 3 per row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weekday vs Weekend */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-xs text-muted-foreground mb-2">Weekly Distribution</h4>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Weekday</span>
                  <span className="font-medium">{(metrics.weekdayShare * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${metrics.weekdayShare * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Weekend</span>
                  <span className="font-medium">{(metrics.weekendShare * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${metrics.weekendShare * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trend - only show if 4+ months */}
        {monthlyData.length >= 4 && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs text-muted-foreground mb-2">Occupancy Trend</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-semibold ${occupancyTrend >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                    {occupancyTrend >= 0 ? '↑' : '↓'} {Math.abs(occupancyTrend).toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    vs earlier months
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recent 3mo: {recentAvgOccupancy.toFixed(1)}% avg
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Best/Worst */}
        {bestMonth && worstMonth && (
          <Card>
            <CardContent className="p-4">
              <h4 className="text-xs text-muted-foreground mb-2">Performance Range</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Best:</span>
                  <span className="font-medium text-green-600">
                    {bestMonth.month} {bestMonth.year} ({bestMonth.utilisation.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lowest:</span>
                  <span className="font-medium text-amber-600">
                    {worstMonth.month} {worstMonth.year} ({worstMonth.utilisation.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Additional Stats */}
      {(venueConfig?.sessionsPerDay > 0 || metrics.impliedArpv > 0) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              {venueConfig && venueConfig.sessionsPerDay > 0 && (
                <div>
                  <span className="text-muted-foreground">Sessions/Day: </span>
                  <span className="font-semibold">{venueConfig.sessionsPerDay.toFixed(1)}</span>
                </div>
              )}
              {metrics.impliedArpv > 0 && (
                <div>
                  <span className="text-muted-foreground">Blended ARPV: </span>
                  <span className="font-semibold">${metrics.impliedArpv.toFixed(2)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ 
  label, 
  value, 
  sublabel, 
  highlight 
}: { 
  label: string; 
  value: string; 
  sublabel: string;
  highlight?: 'good' | 'medium' | 'low';
}) {
  const highlightClass = highlight === 'good' ? 'text-green-600' :
                         highlight === 'medium' ? 'text-amber-600' :
                         highlight === 'low' ? 'text-red-600' : '';

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-xl font-semibold ${highlightClass}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
      </CardContent>
    </Card>
  );
}

function getOccupancyLabel(rate: number): string {
  if (rate >= 0.7) return 'High demand';
  if (rate >= 0.5) return 'Healthy';
  if (rate >= 0.3) return 'Moderate';
  return 'Low utilisation';
}

function getOccupancyHighlight(rate: number): 'good' | 'medium' | 'low' {
  if (rate >= 0.6) return 'good';
  if (rate >= 0.4) return 'medium';
  return 'low';
}
