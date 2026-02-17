import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CachedVenueEntry } from '@/lib/venueCache';

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
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Recent Searches</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map((entry) => {
          const isHovered = hoveredKey === entry.key;
          const isRefreshing = refreshingKey === entry.key;

          return (
            <Card
              key={entry.key}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => onSelect(entry)}
              onMouseEnter={() => setHoveredKey(entry.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium truncate">{entry.venueName}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateRange(entry.dateRange.from, entry.dateRange.to)}
                    </p>
                  </div>
                  {isHovered && !isRefreshing ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(entry.key);
                      }}
                    >
                      Delete
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefresh(entry);
                      }}
                      disabled={isRefreshing}
                    >
                      Refresh
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {entry.sessions.length} sessions
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
