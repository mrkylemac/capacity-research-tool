import { format, parseISO, differenceInDays, differenceInMonths, differenceInWeeks } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { VENUES } from '@/config/api';
import type { CachedVenueEntry } from '@/lib/venueCache';

interface RecentSearchesProps {
  entries: CachedVenueEntry[];
  onSelect: (entry: CachedVenueEntry) => void;
  onDelete?: (key: string) => void;
  onRefresh?: (entry: CachedVenueEntry) => Promise<void>;
  refreshingKey?: string | null;
}

function derivePeriodLabel(from: string, to: string): { duration: string; fromLabel: string } {
  try {
    const fromDate = parseISO(from);
    const toDate = parseISO(to);
    const days = differenceInDays(toDate, fromDate);
    const months = differenceInMonths(toDate, fromDate);

    let duration: string;
    if (days <= 1) {
      duration = 'Today';
    } else if (days <= 6) {
      duration = `${days} days`;
    } else if (days <= 13) {
      duration = '1 week';
    } else if (days <= 27) {
      duration = `${Math.round(days / 7)} weeks`;
    } else if (months <= 1) {
      duration = '1 month';
    } else if (months < 12) {
      duration = `${months} months`;
    } else {
      const wholeYears = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (remainingMonths <= 1) {
        duration = `${wholeYears} year${wholeYears !== 1 ? 's' : ''}`;
      } else {
        duration = `${months} months`;
      }
    }

    const fromLabel = format(fromDate, 'd MMM yyyy');
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
            className="cursor-pointer transition-colors bg-background rounded-2xl shadow-2"
            onClick={() => onSelect(entry)}
          >
            <CardContent className="p-0">

              <div className="flex justify-between h-full flex-row-reverse">
                <div className="grid grid-cols-1 gap-1 p-4 w-full">
                  <p className="font-medium text-base leading-tight truncate">
                    {entry.venueName.split(',')[0].trim()}
                  </p>
                  <p className="text-sm text-muted-foreground h-auto grow-0 flex items-end">{location}</p>
                </div>
                <div className="aspect-square w-full rounded-xl rounded-r-none overflow-hidden flex items-center justify-center max-w-24">
                  {entry.hostInfo?.profileImage ? (
                    <img
                      src={entry.hostInfo.profileImage}
                      alt={entry.venueName}
                      className="aspect-square rounded-xl rounded-r-none object-cover overflow-hidden"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-muted-foreground">
                      {entry.venueName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
