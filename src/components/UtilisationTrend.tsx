"use client";

import { useMemo } from 'react';
import { LineChart } from '@/components/charts/line-chart';
import { Line } from '@/components/charts/line';
import { Grid } from '@/components/charts/grid';
import { XAxis } from '@/components/charts/x-axis';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';
import type { MonthlyData } from '@/types/momence';
import { Card, CardContent } from '@/components/ui/card';

interface UtilisationTrendProps {
  monthlyData: MonthlyData[];
}

/**
 * UtilisationTrend — new enrichment chart showing monthly occupancy % over time.
 *
 * Why this matters: raw visitor counts are affected by session count changes
 * (adding more sessions grows headcount without improving fill rate). The
 * occupancy rate strips that out and shows true demand intensity.
 */
export function UtilisationTrend({ monthlyData }: UtilisationTrendProps) {
  const chartData = useMemo(() =>
    [...monthlyData]
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return new Date(`${a.month} 1, ${a.year}`).getMonth() -
               new Date(`${b.month} 1, ${b.year}`).getMonth();
      })
      .map(m => ({
        date: new Date(`${m.month} 1, ${m.year}`),
        occupancy: Math.round(m.utilisation * 10) / 10,
        visitors: m.ticketsSold,
        sessions: m.sessions,
      })),
  [monthlyData]);

  if (monthlyData.length < 2) return null;

  const avgOccupancy = chartData.length > 0
    ? chartData.reduce((s, m) => s + m.occupancy, 0) / chartData.length
    : 0;

  const peak = chartData.reduce((best, m) => m.occupancy > best.occupancy ? m : best, chartData[0]);
  const low = chartData.reduce((least, m) => m.occupancy < least.occupancy ? m : least, chartData[0]);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">Monthly occupancy rate (%)</p>
          <p className="text-xs text-muted-foreground">
            avg <span className="font-semibold text-foreground">{avgOccupancy.toFixed(1)}%</span>
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground mb-4">
          Occupancy = visitors ÷ total available seats. Shows demand intensity independent of session count.
        </p>

        <LineChart
          data={chartData}
          xDataKey="date"
          aspectRatio="3 / 1"
          margin={{ top: 20, right: 20, bottom: 36, left: 20 }}
        >
          <Grid horizontal />
          <Line
            dataKey="occupancy"
            stroke="var(--chart-visitors)"
            strokeWidth={2.5}
          />
          <XAxis numTicks={6} />
          <ChartTooltip
            rows={(point) => {
              const occ = point.occupancy as number;
              return [
                {
                  color: occ >= 70
                    ? 'var(--chart-high)'
                    : occ >= 40
                    ? 'var(--chart-medium)'
                    : 'var(--chart-low)',
                  label: 'Occupancy',
                  value: `${occ.toFixed(1)}%`,
                },
                {
                  color: 'var(--chart-foreground-muted)',
                  label: 'Visitors',
                  value: (point.visitors as number).toLocaleString(),
                },
                {
                  color: 'var(--chart-foreground-muted)',
                  label: 'Sessions',
                  value: String(point.sessions),
                },
              ];
            }}
          />
        </LineChart>

        {/* Insight pills */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="border border-border rounded-lg px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Peak occupancy</p>
            <p className="text-sm font-semibold mt-0.5 text-green-600">{peak.occupancy.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {peak.date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })}
            </p>
          </div>
          <div className="border border-border rounded-lg px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Average</p>
            <p className={`text-sm font-semibold mt-0.5 ${avgOccupancy >= 70 ? 'text-green-600' : avgOccupancy >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
              {avgOccupancy.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">all months</p>
          </div>
          <div className="border border-border rounded-lg px-3 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">Lowest month</p>
            <p className="text-sm font-semibold mt-0.5 text-muted-foreground">{low.occupancy.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {low.date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
