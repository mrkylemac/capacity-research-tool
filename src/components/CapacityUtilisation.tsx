import { useMemo } from 'react';
import { BarChart } from '@/components/charts/bar-chart';
import { Bar } from '@/components/charts/bar';
import { BarXAxis } from '@/components/charts/bar-x-axis';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';
import type { MonthlyData, SessionMetrics } from '@/types/momence';
import { Card, CardContent } from '@/components/ui/card';

interface CapacityUtilisationProps {
  metrics: SessionMetrics | null;
  monthlyData: MonthlyData[];
}

export function CapacityUtilisation({ metrics, monthlyData }: CapacityUtilisationProps) {
  if (!metrics || monthlyData.length === 0) return null;

  // Stacked visitors chart: booked seats vs available-but-unfilled seats
  const visitorsChartData = useMemo(() =>
    monthlyData.map(m => ({
      name: `${m.month.slice(0, 3)} ${String(m.year).slice(-2)}`,
      visitors: m.ticketsSold,
      unfilled: Math.max(0, m.capacity - m.ticketsSold),
      utilisation: Math.round(m.utilisation),
    })),
  [monthlyData]);

  const avgPerWeek = metrics.sessionsPerWeek;

  const totalVisitors = monthlyData.reduce((sum, m) => sum + m.ticketsSold, 0);
  const totalWeeks = monthlyData.length > 0
    ? monthlyData.reduce((sum, m) => sum + m.sessions, 0) / (avgPerWeek || 1)
    : 1;
  const weeklyVisitors = totalWeeks > 0 ? totalVisitors / totalWeeks : 0;

  return (
    <Card>
      <CardContent className="p-5">
        {/* Demand stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-xl font-semibold text-foreground">{Math.round(weeklyVisitors)}</div>
            <div className="text-xs text-muted-foreground">Visitors/Week</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-xl font-semibold text-foreground">{Math.round(weeklyVisitors / 7)}</div>
            <div className="text-xs text-muted-foreground">Visitors/Day</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-xl font-semibold text-foreground">{avgPerWeek.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Sessions/Week</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-xl font-semibold text-foreground">{metrics.avgUtilisation.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Avg Utilisation</div>
          </div>
        </div>

        {/* Monthly Visitors vs Capacity Chart */}
        <p className="text-xs text-muted-foreground mb-1">Monthly Visitors vs Capacity</p>
        <p className="text-[10px] text-muted-foreground mb-3">
          Blue = booked · Grey = unfilled capacity
        </p>
        <BarChart
          data={visitorsChartData}
          xDataKey="name"
          stacked
          aspectRatio="3 / 1"
          margin={{ top: 16, right: 20, bottom: 36, left: 20 }}
          barGap={0.15}
        >
          <Grid horizontal />
          <Bar
            dataKey="visitors"
            fill="var(--chart-visitors)"
            stroke="var(--chart-visitors)"
            lineCap={4}
          />
          <Bar
            dataKey="unfilled"
            fill="var(--chart-grid)"
            stroke="var(--chart-grid)"
            lineCap={4}
          />
          <BarXAxis />
          <ChartTooltip
            rows={(point) => {
              const visitors = point.visitors as number;
              const unfilled = point.unfilled as number;
              const util = point.utilisation as number;
              return [
                {
                  color: 'var(--chart-visitors)',
                  label: 'Visitors',
                  value: visitors.toLocaleString(),
                },
                {
                  color: 'var(--chart-grid)',
                  label: 'Unfilled',
                  value: unfilled.toLocaleString(),
                },
                {
                  color: util >= 70 ? 'var(--chart-high)' : util >= 40 ? 'var(--chart-medium)' : 'var(--chart-low)',
                  label: 'Utilisation',
                  value: `${util}%`,
                },
              ];
            }}
          />
        </BarChart>
      </CardContent>
    </Card>
  );
}
