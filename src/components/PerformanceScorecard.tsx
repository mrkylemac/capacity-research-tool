import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { Card, CardContent } from '@/components/untitled/card';

interface PerformanceScorecardProps {
  metrics: BenchmarkMetrics;
}

function OccupancyCard({ rate }: { rate: number }) {
  const pct = rate * 100;
  const color =
    pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500';
  const sublabel =
    pct >= 70 ? 'Sessions filling well' : pct >= 40 ? 'Consistent, with room to grow' : 'Significant capacity still available';

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Occupancy</p>
        <p className={`text-4xl font-bold tabular-nums tracking-tight ${color}`}>
          {pct.toFixed(1)}%
        </p>
        <p className="text-xs text-muted-foreground mt-2">{sublabel}</p>
      </CardContent>
    </Card>
  );
}

export function PerformanceScorecard({ metrics }: PerformanceScorecardProps) {
  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
  const weeklyRevenue = metrics.weeklyVisits * metrics.impliedArpv;
  const revenueCeiling = sessionsPerWeek * metrics.avgCapacityPerSession * metrics.impliedArpv;
  const ceilingCaptured = revenueCeiling > 0 ? (weeklyRevenue / revenueCeiling) * 100 : 0;
  const hasRevenue = metrics.impliedArpv > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <OccupancyCard rate={metrics.occupancyRate} />

      <Card>
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Weekly Visitors</p>
          <p className="text-4xl font-bold tabular-nums tracking-tight">
            {Math.round(metrics.weeklyVisits).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.totalVisits.toLocaleString()} total over {Math.round(metrics.weeksInRange)} weeks
          </p>
        </CardContent>
      </Card>

      {hasRevenue ? (
        <>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Weekly Revenue</p>
              <p className="text-4xl font-bold tabular-nums tracking-tight">
                ${Math.round(weeklyRevenue).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                ${metrics.impliedArpv.toFixed(2)} per visitor
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Revenue ceiling</p>
              <p className="text-4xl font-bold tabular-nums tracking-tight">
                ${Math.round(revenueCeiling).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {(100 - ceilingCaptured).toFixed(0)}% headroom remaining
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="col-span-2">
          <CardContent className="p-5 flex items-center">
            <p className="text-sm text-muted-foreground">No pricing data — revenue estimates not available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
