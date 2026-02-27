import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { formatDecimalHour } from '@/lib/utils';
import type { VenueConfig } from '@/types/momence';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';

interface OperationalBlueprintProps {
  metrics: BenchmarkMetrics;
  venueConfig: VenueConfig | null;
}

const DAYS_OF_WEEK = [
  { name: 'Monday',    isWeekend: false },
  { name: 'Tuesday',   isWeekend: false },
  { name: 'Wednesday', isWeekend: false },
  { name: 'Thursday',  isWeekend: false },
  { name: 'Friday',    isWeekend: false },
  { name: 'Saturday',  isWeekend: true  },
  { name: 'Sunday',    isWeekend: true  },
];

export function OperationalBlueprint({ metrics, venueConfig }: OperationalBlueprintProps) {
  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;

  // Modal capacity is the most common bookable seats per session — more accurate
  // than the average, which can be pulled up by occasional higher-capacity events.
  const displaySeats = metrics.modalCapacity || Math.round(metrics.avgCapacityPerSession);

  const { operatingHours } = metrics;
  const wdStart = formatDecimalHour(operatingHours.weekdayStart);
  const wdEnd   = formatDecimalHour(operatingHours.weekdayEnd);
  const weStart = formatDecimalHour(operatingHours.weekendStart);
  const weEnd   = formatDecimalHour(operatingHours.weekendEnd);

  return (
    <div className="space-y-3">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {venueConfig?.duration && (
          <StatCard
            value={`${venueConfig.duration} min`}
            label="Session duration"
            note="Per booking, per guest"
          />
        )}
        <StatCard
          value={`${displaySeats}`}
          label="Seats per session"
          note="Bookable spots per rolling wave"
        />
        <StatCard
          value={sessionsPerWeek.toFixed(1)}
          label="Sessions per week"
          note="Across all active operating days"
        />
        <StatCard
          value={`${metrics.weeklyOpenHours.toFixed(0)} hrs`}
          label="Open hours per week"
          note="Based on inferred operating window"
        />
      </div>

      {/* Per-day hours */}
      <Card>
        <CardContent className="px-5 py-4">
          <div className="divide-y divide-border">
            {DAYS_OF_WEEK.map(({ name, isWeekend }) => {
              const start = isWeekend ? weStart : wdStart;
              const end   = isWeekend ? weEnd   : wdEnd;
              return (
                <div key={name} className="flex items-center justify-between py-2.5 first:pt-1 last:pb-1">
                  <span className="text-sm text-muted-foreground w-28">{name}</span>
                  <span className="text-sm font-medium tabular-nums">{start} – {end}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
