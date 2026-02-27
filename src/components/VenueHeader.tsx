import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { VENUES } from '@/config/api';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import type { VenueConfig } from '@/types/momence';
import type { HostInfo } from '@/lib/momenceClient';
import type { PlaceInfo } from '@/app/api/venue-info/route';
import { PeriodSelector, type PeriodOption } from '@/components/ui/period-selector';

interface VenueHeaderProps {
  metrics: BenchmarkMetrics;
  venueConfig: VenueConfig | null;
  hostInfo: HostInfo | null;
  hostId?: string;
  locationOverride?: string;
  placeInfo?: PlaceInfo | null;
  period: PeriodOption;
  onPeriodChange: (p: PeriodOption) => void;
  dateRangeLabel: string;
  availableMonths?: number | null;
}

export function VenueHeader({
  metrics,
  venueConfig,
  hostInfo,
  hostId,
  locationOverride,
  placeInfo,
  period,
  onPeriodChange,
  dateRangeLabel,
  availableMonths,
}: VenueHeaderProps) {
  const venueName = hostInfo?.name || venueConfig?.venueName || 'Venue';
  const initials = venueName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const venue = VENUES.find(v => v.id === hostId);
  const location = locationOverride ?? venue?.location ?? hostInfo?.countryCode ?? null;

  const sessionCount = metrics.totalSessions;
  const weeklyVisits = Math.round(metrics.weeklyVisits);

  return (
    <Card className="bg-muted/20 border-border">
      <CardContent className="p-5">

        {/* Name + avatar row */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="font-bold text-2xl leading-tight tracking-tight truncate">
              {venueName}
            </h1>
            {location && (
              <p className="text-sm text-muted-foreground mt-0.5">{location}</p>
            )}
          </div>

          {/* Venue logo — 100px square */}
          <Avatar className="h-[100px] w-[100px] shrink-0 rounded-xl">
            {hostInfo?.profileImage && (
              <AvatarImage
                src={hostInfo.profileImage}
                alt={venueName}
                className="rounded-xl object-cover"
              />
            )}
            <AvatarFallback className="rounded-xl text-xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Pills + period selector row */}
        <div className="flex items-center justify-between gap-3 mt-5">
          {/* Info pills */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-foreground">
              {sessionCount.toLocaleString()} sessions
            </span>
            {weeklyVisits > 0 && (
              <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-foreground">
                {weeklyVisits.toLocaleString()} weekly visits
              </span>
            )}
            {placeInfo?.rating && (
              <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-foreground">
                ★ {placeInfo.rating.toFixed(1)}
              </span>
            )}
            {placeInfo?.website && (
              <a
                href={placeInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                Website ↗
              </a>
            )}
          </div>

          {/* Period selector — solid primary */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-sm text-muted-foreground tabular-nums hidden sm:block">
              {dateRangeLabel}
            </span>
            <PeriodSelector
              value={period}
              onChange={onPeriodChange}
              variant="solid"
              availableMonths={availableMonths}
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
