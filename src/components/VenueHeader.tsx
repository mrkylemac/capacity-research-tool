import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/untitled/avatar';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import type { VenueConfig } from '@/types/momence';
import type { HostInfo } from '@/lib/momenceClient';

interface VenueHeaderProps {
  metrics: BenchmarkMetrics;
  venueConfig: VenueConfig | null;
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

function occupancyColor(rate: number): string {
  if (rate >= 0.7) return 'text-green-600';
  if (rate >= 0.4) return 'text-amber-600';
  return 'text-red-500';
}

export function VenueHeader({ metrics, venueConfig, hostInfo, dateRange }: VenueHeaderProps) {
  const venueName = hostInfo?.name || venueConfig?.venueName || 'Venue';
  const initials = venueName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const location = hostInfo?.countryCode ?? null;

  const pills = [
    {
      label: 'Occupancy',
      value: `${(metrics.occupancyRate * 100).toFixed(1)}%`,
      valueClass: occupancyColor(metrics.occupancyRate),
    },
    {
      label: 'Weekly Visitors',
      value: Math.round(metrics.weeklyVisits).toLocaleString(),
      valueClass: 'text-foreground',
    },
    ...(metrics.impliedArpv > 0
      ? [{ label: 'ARPV', value: `$${metrics.impliedArpv.toFixed(2)}`, valueClass: 'text-foreground' }]
      : []),
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-2">
      {/* Identity */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Avatar className="h-14 w-14 shrink-0">
          {hostInfo?.profileImage && (
            <AvatarImage src={hostInfo.profileImage} alt={venueName} />
          )}
          <AvatarFallback className="text-lg">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight truncate">{venueName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {[location, dateRange && formatDateRange(dateRange.from, dateRange.to)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      {/* Hero pills */}
      <div className="flex items-center gap-px shrink-0">
        {pills.map((pill, i) => (
          <div
            key={pill.label}
            className={`px-4 py-2 text-center ${i < pills.length - 1 ? 'border-r border-border' : ''}`}
          >
            <p className={`text-lg font-bold tabular-nums leading-tight ${pill.valueClass}`}>
              {pill.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{pill.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
