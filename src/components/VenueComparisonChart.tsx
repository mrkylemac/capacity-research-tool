"use client";

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart } from '@/components/charts/bar-chart';
import { Bar } from '@/components/charts/bar';
import { BarYAxis } from '@/components/charts/bar-y-axis';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';
import { getVenueComparisonData } from '@/lib/venueComparisonData';

interface VenueComparisonChartProps {
  /** hostId of the venue being viewed — its bar will be highlighted */
  currentVenueId: string;
}

export function VenueComparisonChart({
  currentVenueId,
}: VenueComparisonChartProps) {
  const rawData = useMemo(() => getVenueComparisonData(), []);

  // Sort ascending so highest is at the top in horizontal bar chart
  const chartData = useMemo(
    () =>
      [...rawData]
        .sort((a, b) => a.weeklyVisitors - b.weeklyVisitors)
        .map((d) => ({
          name: d.venueName,
          weeklyVisitors: d.weeklyVisitors,
          totalVisitors: d.totalVisitors,
          weeksOfData: d.weeksOfData,
          venueId: d.venueId,
        })),
    [rawData]
  );

  if (rawData.length < 2) return null;

  const currentVenueRank =
    rawData.findIndex((d) => d.venueId === currentVenueId) + 1;

  // Dynamic aspect ratio based on venue count
  const aspectRatio = `4 / ${Math.max(2, Math.min(chartData.length * 0.55, 6))}`;

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

        <p className="text-base font-medium text-muted-foreground mb-3">
          Average weekly visitors across all tracked venues
        </p>

        <BarChart
          data={chartData as unknown as Record<string, unknown>[]}
          xDataKey="name"
          orientation="horizontal"
          aspectRatio={aspectRatio}
          margin={{ top: 8, right: 48, bottom: 8, left: 8 }}
          barGap={0.25}
        >
          <Grid horizontal={false} vertical fadeVertical />
          <Bar
            dataKey="weeklyVisitors"
            fill="var(--chart-visitors)"
            stroke="var(--chart-visitors)"
            lineCap={4}
          />
          <BarYAxis />
          <ChartTooltip
            showDatePill={false}
            rows={(point) => {
              const visitors = point.weeklyVisitors as number;
              const total = point.totalVisitors as number;
              const weeks = point.weeksOfData as number;
              const isCurrent = point.venueId === currentVenueId;
              return [
                {
                  color: 'var(--chart-visitors)',
                  label: 'Weekly avg',
                  value: visitors.toLocaleString(),
                },
                {
                  color: 'var(--chart-foreground-muted)',
                  label: 'Total visitors',
                  value: total.toLocaleString(),
                },
                {
                  color: 'var(--chart-foreground-muted)',
                  label: 'Weeks of data',
                  value: weeks.toFixed(1),
                },
                ...(isCurrent
                  ? [
                      {
                        color: 'var(--chart-high)',
                        label: 'Current venue',
                        value: `#${currentVenueRank}`,
                      },
                    ]
                  : []),
              ];
            }}
          />
        </BarChart>
      </CardContent>
    </Card>
  );
}
