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
  // Pick the 4 most important comparisons
  const keyMetrics = ['Weekly Visits', 'Occupancy Rate', 'Weekday Share', 'Visitors/Session'];
  const displayComparisons = comparisons.filter(c => keyMetrics.includes(c.metric));

  return (
    <Card className="border-2">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">vs Slow Folk Model</h3>
          <span className="text-xs text-muted-foreground">
            Target: {SLOW_FOLK_TARGETS.occupancy.target * 100}% occupancy, {SLOW_FOLK_TARGETS.weeklyVisits} visits/week
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayComparisons.map((comp) => (
            <ComparisonCard key={comp.metric} comparison={comp} />
          ))}
        </div>

        {/* Breakeven context */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-6 text-xs">
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
  const cards = [
    {
      label: 'Weekly Visits',
      value: Math.round(metrics.weeklyVisits).toLocaleString(),
      sublabel: `${Math.round(metrics.dailyVisits)} daily avg`,
    },
    {
      label: 'Occupancy Rate',
      value: `${(metrics.occupancyRate * 100).toFixed(1)}%`,
      sublabel: `${metrics.totalVisits.toLocaleString()} of ${metrics.totalCapacity.toLocaleString()} capacity`,
    },
    {
      label: 'Visitors/Session',
      value: metrics.avgVisitorsPerSession.toFixed(1),
      sublabel: `of ${metrics.avgCapacityPerSession.toFixed(0)} capacity`,
    },
    {
      label: 'Visits/Open Hour',
      value: metrics.visitsPerOpenHour.toFixed(1),
      sublabel: `${metrics.weeklyOpenHours.toFixed(0)} hrs/week`,
    },
    {
      label: 'Weekday Share',
      value: `${(metrics.weekdayShare * 100).toFixed(0)}%`,
      sublabel: `vs ${(metrics.weekendShare * 100).toFixed(0)}% weekend`,
    },
    {
      label: 'Avg Price',
      value: `$${metrics.avgPrice.toFixed(0)}`,
      sublabel: metrics.impliedArpv > 0 ? `ARPV: $${metrics.impliedArpv.toFixed(2)}` : '',
    },
  ];

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-semibold text-sm mb-4">Key Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cards.map((card, index) => (
            <div key={index} className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
              <p className="text-xl font-semibold">{card.value}</p>
              {card.sublabel && (
                <p className="text-xs text-muted-foreground mt-1">{card.sublabel}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
