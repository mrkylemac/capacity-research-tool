import { useMemo } from 'react';
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { MonthlyData } from '@/types/momence';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { chartTooltipContentStyle, chartTooltipLabelStyle } from '@/lib/chartTooltip';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';

interface CapacityUtilisationProps {
  metrics: BenchmarkMetrics | null;
  monthlyData: MonthlyData[];
}

export function CapacityUtilisation({ metrics, monthlyData }: CapacityUtilisationProps) {
  if (!metrics || monthlyData.length === 0) return null;

  const visitorsChartData = useMemo(() =>
    monthlyData.map(m => ({
      name: `${m.month.slice(0, 3)} ${String(m.year).slice(-2)}`,
      visitors: m.ticketsSold,
      unfilled: Math.max(0, m.capacity - m.ticketsSold),
    })),
  [monthlyData]);

  // Derive weekly visitors and avg utilisation from BenchmarkMetrics
  const sessionsPerWeek = metrics.totalSessions / metrics.weeksInRange;
  const weeklyVisitors = Math.round(metrics.weeklyVisits);
  const dailyVisitors = Math.round(metrics.weeklyVisits / 7);
  const avgUtilisationPct = Math.round(metrics.occupancyRate * 100);

  return (
    <div className="space-y-3">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          value={weeklyVisitors.toLocaleString()}
          label="Visitors per week"
          note="Average weekly footfall across the period"
        />
        <StatCard
          value={dailyVisitors.toLocaleString()}
          label="Visitors per day"
          note="Estimated daily average"
        />
        <StatCard
          value={sessionsPerWeek.toFixed(1)}
          label="Sessions per week"
          note={`${metrics.totalSessions.toLocaleString()} sessions recorded`}
        />
        <StatCard
          value={`${avgUtilisationPct}%`}
          label="Avg utilisation"
          note="Of total available seat capacity"
        />
      </div>

      {/* Monthly chart */}
      <Card>
        <CardContent className="p-5">
          <p className="text-base font-medium text-foreground mb-1">Monthly visitors vs capacity</p>
          <p className="text-base text-muted-foreground mb-4">
            Filled <span className="inline-block w-2.5 h-2 rounded-sm bg-primary align-middle mx-0.5" /> ·{' '}
            Unfilled <span className="inline-block w-2.5 h-2 rounded-sm bg-muted-foreground/30 align-middle mx-0.5" />
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={visitorsChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={chartTooltipContentStyle}
                labelStyle={chartTooltipLabelStyle}
                formatter={(value: number, name: string) => {
                  if (name === 'visitors') return [value.toLocaleString(), 'Visitors'];
                  if (name === 'unfilled') return [value.toLocaleString(), 'Unfilled'];
                  return [value, name];
                }}
              />
              <Bar dataKey="visitors" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="unfilled" stackId="a" fill="color-mix(in srgb, var(--muted-foreground) 20%, transparent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
