import { format, parseISO, differenceInMonths, differenceInWeeks } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { VENUES } from '@/config/api';
import type { CachedVenueEntry } from '@/lib/venueCache';

interface RecentSearchesProps {
  entries: CachedVenueEntry[];
  onSelect: (entry: CachedVenueEntry) => void;
  onDelete: (key: string) => void;
}

function derivePeriodLabel(from: string, to: string): { duration: string; fromLabel: string } {
  try {
    const fromDate = parseISO(from);
    const toDate = parseISO(to);
    const months = differenceInMonths(toDate, fromDate);
    const duration = months >= 1 ? `Last ${months} month${months !== 1 ? 's' : ''}` : 'Last 30 days';
    const fromLabel = `From ${format(fromDate, 'd MMM')}`;
    return { duration, fromLabel };
  } catch {
    return { duration: from, fromLabel: '' };
  }
}

function getWeeklyVisits(entry: CachedVenueEntry): number {
  try {
    const totalVisitors = entry.sessions.reduce((s, ses) => s + ses.ticketsSold, 0);
    const from = parseISO(entry.dateRange.from);
    const to = parseISO(entry.dateRange.to);
    const weeks = Math.max(differenceInWeeks(to, from), 1);
    return Math.round(totalVisitors / weeks);
  } catch {
    return 0;
  }
}

function getLocation(entry: CachedVenueEntry): string {
  const venue = VENUES.find(v => v.id === entry.hostId);
  return venue?.location ?? entry.hostInfo?.countryCode ?? '';
}

export function RecentSearches({ entries, onSelect }: RecentSearchesProps) {
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {entries.map((entry) => {
        const { duration, fromLabel } = derivePeriodLabel(entry.dateRange.from, entry.dateRange.to);
        const weeklyVisits = getWeeklyVisits(entry);
        const location = getLocation(entry);
        const sessionCount = entry.sessions.length;

        return (
          <Card
            key={entry.key}
            className="cursor-pointer hover:border-primary/40 transition-colors bg-muted/30 border-muted"
            onClick={() => onSelect(entry)}
          >
            <CardContent className="p-5">
              {/* Top row: name + logo */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0 pt-0.5">
                  <p className="font-semibold text-base leading-tight truncate">{entry.venueName}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-snug">{duration}</p>
                  <p className="text-sm text-muted-foreground leading-snug">({fromLabel})</p>
                </div>
                <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                  {entry.hostInfo?.profileImage ? (
                    <img
                      src={entry.hostInfo.profileImage}
                      alt={entry.venueName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-muted-foreground">
                      {entry.venueName.charAt(0)}
                    </span>
                  )}
                </div>
              </div>

              {/* Pills */}
              <div className="flex flex-wrap gap-2">
                {location && (
                  <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                    {location}
                  </span>
                )}
                <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                  {sessionCount.toLocaleString()} sessions
                </span>
                {weeklyVisits > 0 && (
                  <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                    {weeklyVisits.toLocaleString()} weekly visits
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
