"use client";

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { getVenueComparisonData } from '@/lib/venueComparisonData';

interface VenueComparisonChartProps {
  /** hostId of the venue being viewed — its bar will be highlighted */
  currentVenueId: string;
}

export function VenueComparisonChart({
  currentVenueId,
}: VenueComparisonChartProps) {
  const rawData = useMemo(() => getVenueComparisonData(), []);

  if (rawData.length < 2) return null;

  const currentVenueRank =
    rawData.findIndex((d) => d.venueId === currentVenueId) + 1;

  const maxVisitors = Math.max(...rawData.map((d) => d.weeklyVisitors));

  return (
    <Card className="print-section shadow-sm">
      <CardContent className="px-4 py-4 sm:p-5">
        <div className="flex items-center justify-between mb-8">
          <p className="text-lg font-semibold">Venue comparison</p>
          {currentVenueRank > 0 && (
            <p className="text-sm text-muted-foreground">
              #{currentVenueRank} of {rawData.length}
            </p>
          )}
        </div>

        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-sm font-medium">Average weekly visitors</p>
            <p className="text-sm text-muted-foreground">Across all tracked venues</p>
          </div>
        </div>

        <div className="space-y-1">
          {rawData.map((d) => {
            const isCurrent = d.venueId === currentVenueId;
            const pctOfPeak = maxVisitors > 0 ? (d.weeklyVisitors / maxVisitors) * 100 : 0;

            return (
              <div
                key={d.venueId}
                className="relative h-8 rounded-lg overflow-hidden flex items-center px-3"
              >
                {/* Track */}
                <div className="absolute inset-0 bg" />
                {/* Fill */}
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500 rounded-lg"
                  style={{
                    width: `${pctOfPeak}%`,
                    backgroundColor: isCurrent
                      ? 'color-mix(in srgb, var(--muted-foreground) 35%, transparent)'
                      : 'color-mix(in srgb, var(--chart-fill) 18%, transparent)',
                  }}
                />
                <span className="relative z-10 text-sm">{d.venueName}</span>
                <span className="relative z-10 ml-auto text-sm tabular-nums text-foreground">
                  {d.weeklyVisitors > 0 ? d.weeklyVisitors.toLocaleString() : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
