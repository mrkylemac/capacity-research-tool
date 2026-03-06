"use client";

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { chartTooltipContentStyle, chartTooltipLabelStyle } from '@/lib/chartTooltip';
import {
  getVenueComparisonData,
  DEFAULT_REFERENCE_LINE,
  type ComparisonReferenceLine,
} from '@/lib/venueComparisonData';

interface VenueComparisonChartProps {
  /** hostId of the venue being viewed — its bar will be highlighted */
  currentVenueId: string;
  /** Optional override for the reference line (defaults to DEFAULT_REFERENCE_LINE) */
  referenceLine?: ComparisonReferenceLine;
}

export function VenueComparisonChart({
  currentVenueId,
  referenceLine = DEFAULT_REFERENCE_LINE,
}: VenueComparisonChartProps) {
  const data = useMemo(() => getVenueComparisonData(), []);

  if (data.length < 2) return null;

  const currentVenueRank = data.findIndex(d => d.venueId === currentVenueId) + 1;

  return (
    <Card className="print-section shadow-sm">
      <CardContent className="px-4 py-4 sm:p-5">
        <div className="flex items-center justify-between mb-8">
          <p className="text-lg font-semibold">Venue comparison</p>
          {currentVenueRank > 0 && (
            <p className="text-sm text-muted-foreground">
              #{currentVenueRank} of {data.length}
            </p>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          Average weekly visitors across all tracked venues
        </p>

        <ResponsiveContainer width="100%" height={Math.max(data.length * 44, 280)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
            barCategoryGap="18%"
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeOpacity={0.5} />
            <XAxis
              type="number"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="venueName"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={130}
            />
            <Tooltip
              contentStyle={chartTooltipContentStyle}
              labelStyle={chartTooltipLabelStyle}
              formatter={(value: number) => [
                `${value.toLocaleString()} / week`,
                'Visitors',
              ]}
            />
            {referenceLine.value !== null && (
              <ReferenceLine
                x={referenceLine.value}
                stroke="var(--chart-fill)"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: referenceLine.label,
                  position: 'top',
                  fill: 'var(--muted-foreground)',
                  fontSize: 11,
                }}
              />
            )}
            <Bar dataKey="weeklyVisitors" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.venueId}
                  fill={
                    entry.venueId === currentVenueId
                      ? 'var(--chart-fill)'
                      : 'var(--color-gray-2)'
                  }
                  fillOpacity={entry.venueId === currentVenueId ? 1 : 0.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
