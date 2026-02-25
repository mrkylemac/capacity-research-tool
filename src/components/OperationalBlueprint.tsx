import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { formatOperatingHours } from '@/lib/benchmarkMetrics';
import type { VenueConfig } from '@/types/momence';

interface OperationalBlueprintProps {
  metrics: BenchmarkMetrics;
  venueConfig: VenueConfig | null;
}

interface BlueprintItem {
  label: string;
  value: string;
}

export function OperationalBlueprint({ metrics, venueConfig }: OperationalBlueprintProps) {
  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;

  const items: BlueprintItem[] = [
    ...(venueConfig?.duration ? [{ label: 'Duration', value: `${venueConfig.duration} min` }] : []),
    ...(venueConfig?.price ? [{ label: 'Ticket price', value: `$${venueConfig.price}` }] : []),
    { label: 'Seats per session', value: `${metrics.avgCapacityPerSession.toFixed(0)}` },
    { label: 'Sessions/week', value: sessionsPerWeek.toFixed(1) },
    { label: 'Open hours/week', value: `${metrics.weeklyOpenHours.toFixed(0)} hrs` },
    { label: 'Hours', value: formatOperatingHours(metrics.operatingHours) },
  ];

  return (
    <div className="border border-border rounded-lg px-5 py-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        How they operate
      </p>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {items.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
