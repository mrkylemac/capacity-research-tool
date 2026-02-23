import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/untitled/card';
import { Label } from '@/components/untitled/label';
import type { CachedVenueEntry } from '@/lib/venueCache';
import { Button } from '@/components/untitled/button';
import { RotateCw, Trash2 } from 'lucide-react';

interface RecentSearchesProps {
  entries: CachedVenueEntry[];
  onSelect: (entry: CachedVenueEntry) => void;
  onRefresh: (entry: CachedVenueEntry) => void;
  onDelete: (key: string) => void;
  refreshingKey?: string | null;
}

function formatDateRange(from: string, to: string): string {
  try {
    return `${format(parseISO(from), 'MMM d, yyyy')} – ${format(parseISO(to), 'MMM d, yyyy')}`;
  } catch {
    return `${from} – ${to}`;
  }
}

export function RecentSearches({ entries, onSelect, onRefresh, onDelete, refreshingKey }: RecentSearchesProps) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Recent Searches</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map((entry) => (
          <Card
            key={entry.key}
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => onSelect(entry)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                  {entry.hostInfo?.profileImage ? (
                    <img
                      src={entry.hostInfo.profileImage}
                      alt={entry.venueName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">
                      {entry.venueName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate leading-tight">{entry.venueName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateRange(entry.dateRange.from, entry.dateRange.to)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.sessions.length} sessions
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 px-0"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRefresh(entry); }}
                    disabled={refreshingKey === entry.key}
                    aria-label="Refresh"
                  >
                    <RotateCw className={`h-4 w-4 ${refreshingKey === entry.key ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 px-0"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(entry.key); }}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
