import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { StatCard } from '@/components/ui/stat-card';

interface PerformanceScorecardProps {
  metrics: BenchmarkMetrics;
}

export function PerformanceScorecard({ metrics }: PerformanceScorecardProps) {
  const pct = metrics.occupancyRate * 100;
  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;

  const occupancyNote =
    pct >= 70
      ? 'Sessions filling well — strong demand signal.'
      : pct >= 40
      ? 'Consistent attendance, clear room to grow.'
      : 'Significant capacity upside still available.';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      <StatCard
        value={`${pct.toFixed(1)}%`}
        label="Occupancy rate"
        note={occupancyNote}
      />
      <StatCard
        value={Math.round(metrics.weeklyVisits).toLocaleString()}
        label="Weekly visitors"
        note={`${metrics.totalVisits.toLocaleString()} total across the period`}
      />
      <StatCard
        value={sessionsPerWeek.toFixed(1)}
        label="Sessions per week"
        note={`${metrics.totalSessions.toLocaleString()} sessions in total`}
      />
    </div>
  );
}
