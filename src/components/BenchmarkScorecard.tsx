import type { BenchmarkMetrics, BenchmarkComparison } from '@/lib/benchmarkMetrics';
import { compareToSlowFolk } from '@/lib/benchmarkMetrics';
import { SLOW_FOLK_TARGETS } from '@/config/slowfolk';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Check } from 'lucide-react';

interface BenchmarkScorecardProps {
  metrics: BenchmarkMetrics;
  showComparison: boolean;
}

export function BenchmarkScorecard({ metrics, showComparison }: BenchmarkScorecardProps) {
  const comparisons = showComparison ? compareToSlowFolk(metrics) : [];

  if (showComparison) {
    return <ComparisonView metrics={metrics} comparisons={comparisons} />;
  }

  return <CaseStudyView metrics={metrics} />;
}

function ComparisonView({ metrics, comparisons }: { metrics: BenchmarkMetrics; comparisons: BenchmarkComparison[] }) {
  // Lead with demand and revenue metrics, then operational context
  const primaryMetrics = ['Weekly Visits', 'ARPV', 'Visitors/Session'];
  const contextMetrics = ['Occupancy Rate', 'Weekday Share'];

  const primaryComparisons = comparisons.filter(c => primaryMetrics.includes(c.metric));
  const contextComparisons = comparisons.filter(c => contextMetrics.includes(c.metric));

  // Compute weekly revenue comparison
  const weeklyRevenue = Math.round(metrics.weeklyVisits * metrics.impliedArpv);
  const targetWeeklyRevenue = Math.round(SLOW_FOLK_TARGETS.weeklyVisits * SLOW_FOLK_TARGETS.arpv);

  return (
    <Card className="border-2">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">vs Slow Folk Model</h3>
          <span className="text-xs text-muted-foreground">
            Target: {SLOW_FOLK_TARGETS.weeklyVisits} visits/week, ${targetWeeklyRevenue.toLocaleString()}/week revenue
          </span>
        </div>

        {/* Primary: demand and revenue */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {primaryComparisons.map((comp) => (
            <ComparisonCard key={comp.metric} comparison={comp} />
          ))}
          {/* Weekly Revenue (derived, not in standard comparisons) */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Weekly Revenue</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-semibold ${weeklyRevenue >= targetWeeklyRevenue * 0.95 ? 'text-green-600' : 'text-amber-600'}`}>
                ${weeklyRevenue.toLocaleString()}
              </span>
              {weeklyRevenue >= targetWeeklyRevenue * 0.95
                ? <ArrowUp className="w-4 h-4 text-green-600" />
                : <ArrowDown className="w-4 h-4 text-amber-600" />
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs ${targetWeeklyRevenue.toLocaleString()} target
            </p>
            <p className={`text-xs ${weeklyRevenue >= targetWeeklyRevenue ? 'text-green-600' : 'text-amber-600'}`}>
              {weeklyRevenue >= targetWeeklyRevenue ? '+' : ''}{(((weeklyRevenue - targetWeeklyRevenue) / targetWeeklyRevenue) * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Operational context */}
        {contextComparisons.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
            {contextComparisons.map((comp) => (
              <ComparisonCard key={comp.metric} comparison={comp} />
            ))}
          </div>
        )}

        {/* Breakeven context */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            <span className="text-muted-foreground">Breakeven thresholds:</span>
            <span className={metrics.weeklyVisits >= SLOW_FOLK_TARGETS.breakeven.operating ? 'text-green-600' : 'text-muted-foreground'}>
              Operating: {SLOW_FOLK_TARGETS.breakeven.operating}/wk
              {metrics.weeklyVisits >= SLOW_FOLK_TARGETS.breakeven.operating && ' ✓'}
            </span>
            <span className={metrics.weeklyVisits >= SLOW_FOLK_TARGETS.breakeven.combined ? 'text-green-600' : 'text-muted-foreground'}>
              Combined: {SLOW_FOLK_TARGETS.breakeven.combined}/wk
              {metrics.weeklyVisits >= SLOW_FOLK_TARGETS.breakeven.combined && ' ✓'}
            </span>
            <span className={metrics.weeklyVisits >= SLOW_FOLK_TARGETS.breakeven.profit ? 'text-green-600' : 'text-muted-foreground'}>
              + Profit: {SLOW_FOLK_TARGETS.breakeven.profit}/wk
              {metrics.weeklyVisits >= SLOW_FOLK_TARGETS.breakeven.profit && ' ✓'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonCard({ comparison }: { comparison: BenchmarkComparison }) {
  const statusColors = {
    'above': 'text-green-600',
    'below': 'text-amber-600',
    'on-target': 'text-green-600',
  };

  const StatusIcon = comparison.status === 'above' ? ArrowUp :
                     comparison.status === 'below' ? ArrowDown : Check;

  const formatValue = (val: number, unit: string) => {
    if (unit === '%') return `${val.toFixed(1)}%`;
    if (unit === '$') return `$${val.toFixed(2)}`;
    if (unit.includes('visit')) return val.toFixed(0);
    return val.toFixed(1);
  };

  return (
    <div className="p-3 bg-muted/30 rounded-lg">
      <p className="text-xs text-muted-foreground mb-1">{comparison.metric}</p>
      <div className="flex items-baseline gap-2">
        <span className={`text-xl font-semibold ${statusColors[comparison.status]}`}>
          {formatValue(comparison.value, comparison.unit)}
        </span>
        <StatusIcon className={`w-4 h-4 ${statusColors[comparison.status]}`} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        vs {formatValue(comparison.target, comparison.unit)} target
      </p>
      <p className={`text-xs ${statusColors[comparison.status]}`}>
        {comparison.deltaPercent > 0 ? '+' : ''}{comparison.deltaPercent.toFixed(0)}%
      </p>
    </div>
  );
}

function CaseStudyView({ metrics }: { metrics: BenchmarkMetrics }) {
  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
  const weeklyRevenue = metrics.weeklyVisits * metrics.impliedArpv;

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-semibold text-sm mb-4">Key Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Weekly Visitors</p>
            <p className="text-xl font-semibold">{Math.round(metrics.weeklyVisits).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{Math.round(metrics.dailyVisits)} daily avg</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Weekly Revenue</p>
            <p className="text-xl font-semibold">
              {metrics.impliedArpv > 0 ? `$${Math.round(weeklyRevenue).toLocaleString()}` : '-'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.impliedArpv > 0 ? `$${metrics.impliedArpv.toFixed(2)} ARPV` : 'No pricing'}
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Avg Group Size</p>
            <p className="text-xl font-semibold">{metrics.avgVisitorsPerSession.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">of {metrics.avgCapacityPerSession.toFixed(0)} capacity</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Sessions/Week</p>
            <p className="text-xl font-semibold">{sessionsPerWeek.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">{(sessionsPerWeek / 7).toFixed(1)}/day</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Weekday Share</p>
            <p className="text-xl font-semibold">{(metrics.weekdayShare * 100).toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">vs {(metrics.weekendShare * 100).toFixed(0)}% weekend</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Utilisation</p>
            <p className="text-xl font-semibold">{(metrics.occupancyRate * 100).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">{metrics.weeklyOpenHours.toFixed(0)} hrs/week</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
