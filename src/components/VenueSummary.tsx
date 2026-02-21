import { format, parseISO } from 'date-fns';
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

  // --- Insight card calculations (all derived directly from raw data) ---

  // 1. Total Visitors
  const totalVisitors = metrics.totalVisits;

  // 2. Avg Weekly Visitors
  const avgWeekly = Math.round(metrics.weeklyVisits);

  // 3. Overall Occupancy (ticketsSold / capacity — pure ratio on raw data)
  const occupancyPct = (metrics.occupancyRate * 100).toFixed(1);

  // 4. Peak Month (highest ticketsSold in a single month — raw data max)
  const peakMonth = monthlyData.length > 0
    ? monthlyData.reduce((best, m) => m.ticketsSold > best.ticketsSold ? m : best)
    : null;

  // 5. Visitor Trend — recent 3 months vs earlier (comparison of raw monthly totals)
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

  // 6. Demand split — weekday vs weekend (raw visitor counts)
  const weekdayPct = Math.round(metrics.weekdayShare * 100);
  const weekendPct = Math.round(metrics.weekendShare * 100);
  const dominantDay = weekdayPct >= weekendPct ? 'Weekday' : 'Weekend';
  const dominantPct = Math.max(weekdayPct, weekendPct);

  return (
    <div className="space-y-6">
      {/* Venue Profile */}
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
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {dateRange && <span>{formatDateRange(dateRange.from, dateRange.to)}</span>}
                  {hostInfo?.industry && <span>·</span>}
                  {hostInfo?.industry && <span>{hostInfo.industry}</span>}
                </div>
              </div>
              {venueConfig && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-medium">{venueConfig.duration} min</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Capacity</p>
                    <p className="text-sm font-medium">{venueConfig.capacity} guests</p>
                  </div>
                  {venueConfig.price > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="text-sm font-medium">${venueConfig.price}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Hours</p>
                    <p className="text-sm font-medium">{formatOperatingHours(metrics.operatingHours)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6 Insight Cards */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Key Insights
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InsightCard
            label="Total Visitors"
            value={totalVisitors.toLocaleString()}
            sub={dateRange ? formatDateRange(dateRange.from, dateRange.to) : `${Math.round(metrics.weeksInRange)} weeks`}
            size="large"
          />
          <InsightCard
            label="Avg Weekly Visitors"
            value={avgWeekly.toLocaleString()}
            sub={`${metrics.dailyVisits.toFixed(1)} per day`}
            size="large"
          />
          <InsightCard
            label="Occupancy Rate"
            value={`${occupancyPct}%`}
            sub={`${totalVisitors.toLocaleString()} of ${metrics.totalCapacity.toLocaleString()} seats filled`}
            size="large"
            highlight={metrics.occupancyRate >= 0.7 ? 'green' : metrics.occupancyRate >= 0.4 ? 'amber' : 'red'}
          />
          <InsightCard
            label="Peak Month"
            value={peakMonth ? `${peakMonth.ticketsSold.toLocaleString()} visitors` : '—'}
            sub={peakMonth ? `${peakMonth.month} ${peakMonth.year} · ${peakMonth.sessions} sessions` : ''}
            size="large"
            highlight="green"
          />
          <InsightCard
            label="Visitor Trend"
            value={
              trendPct !== null && monthlyData.length >= 4
                ? `${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(0)}%`
                : '—'
            }
            sub={
              trendPct !== null && monthlyData.length >= 4
                ? `recent 3 months vs earlier (${Math.round(recentAvg).toLocaleString()} vs ${Math.round(olderAvg).toLocaleString()} avg/mo)`
                : monthlyData.length < 4 ? 'Insufficient data (need 4+ months)' : ''
            }
            size="large"
            highlight={trendPct !== null ? (trendPct >= 0 ? 'green' : 'amber') : undefined}
          />
          <InsightCard
            label="Demand Split"
            value={`${dominantPct}% ${dominantDay}`}
            sub={`${metrics.weekdayVisits.toLocaleString()} weekday · ${metrics.weekendVisits.toLocaleString()} weekend`}
            size="large"
          />
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  label,
  value,
  sub,
  size = 'default',
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  size?: 'default' | 'large';
  highlight?: 'green' | 'amber' | 'red';
}) {
  const valueClass = highlight === 'green'
    ? 'text-green-600'
    : highlight === 'amber'
    ? 'text-amber-600'
    : highlight === 'red'
    ? 'text-red-600'
    : '';

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`font-semibold ${size === 'large' ? 'text-2xl' : 'text-xl'} ${valueClass}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
