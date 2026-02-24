import { useMemo } from 'react';
import { AreaChart, Area } from '@/components/charts/area-chart';
import { Grid } from '@/components/charts/grid';
import { XAxis } from '@/components/charts/x-axis';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';
import type { MonthlyData } from '@/types/momence';
import { Card, CardContent } from '@/components/untitled/card';

interface GrowthStoryProps {
  monthlyData: MonthlyData[];
}

interface SeasonalSummary {
  peakMonth: string;
  growthRate: number;
  rampUpMonths: number;
}

function analyzeGrowth(data: MonthlyData[]): SeasonalSummary {
  if (data.length === 0) return { peakMonth: '', growthRate: 0, rampUpMonths: 0 };

  const sorted = [...data].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return new Date(`${a.month} 1, ${a.year}`).getMonth() -
           new Date(`${b.month} 1, ${b.year}`).getMonth();
  });

  const peak = sorted.reduce((best, m) => m.ticketsSold > best.ticketsSold ? m : best);
  const peakMonth = `${peak.month} ${peak.year}`;

  const n = Math.min(3, sorted.length);
  const firstAvg = sorted.slice(0, n).reduce((s, m) => s + m.ticketsSold, 0) / n;
  const lastAvg = sorted.slice(-n).reduce((s, m) => s + m.ticketsSold, 0) / n;
  const growthRate = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

  const peakVisitors = Math.max(...data.map(m => m.ticketsSold));
  const threshold = peakVisitors * 0.8;
  let rampUpMonths = 0;
  for (const m of sorted) {
    if (m.ticketsSold >= threshold) break;
    rampUpMonths++;
  }

  return { peakMonth, growthRate, rampUpMonths };
}

export function GrowthStory({ monthlyData }: GrowthStoryProps) {
  const analysis = useMemo(() => analyzeGrowth(monthlyData), [monthlyData]);

  // bklit AreaChart uses Date objects on the x-axis
  const chartData = useMemo(() =>
    [...monthlyData]
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return new Date(`${a.month} 1, ${a.year}`).getMonth() -
               new Date(`${b.month} 1, ${b.year}`).getMonth();
      })
      .map(m => ({
        date: new Date(`${m.month} 1, ${m.year}`),
        visitors: m.ticketsSold,
      })),
  [monthlyData]);

  if (monthlyData.length < 2) return null;

  const activeMonths = monthlyData.filter(m => m.ticketsSold > 0);
  const avgVisitors = activeMonths.length > 0
    ? Math.round(activeMonths.reduce((s, m) => s + m.ticketsSold, 0) / activeMonths.length)
    : 0;

  const { peakMonth, growthRate, rampUpMonths } = analysis;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">Visitors per month</p>
            <p className="text-xs text-muted-foreground">
              avg <span className="font-semibold text-foreground">{avgVisitors.toLocaleString()}</span>/mo
            </p>
          </div>
          <AreaChart
            data={chartData}
            xDataKey="date"
            aspectRatio="3 / 1"
            margin={{ top: 20, right: 20, bottom: 36, left: 20 }}
          >
            <Grid horizontal />
            <Area
              dataKey="visitors"
              fill="var(--chart-visitors)"
              stroke="var(--chart-visitors)"
              fillOpacity={0.12}
              strokeWidth={2.5}
            />
            <XAxis numTicks={6} />
            <ChartTooltip
              rows={(point) => [
                {
                  color: 'var(--chart-visitors)',
                  label: 'Visitors',
                  value: (point.visitors as number).toLocaleString(),
                },
              ]}
            />
          </AreaChart>
        </CardContent>
      </Card>

      {/* Annotation pills */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-border rounded-lg px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">Strongest month</p>
          <p className="text-sm font-semibold mt-1">{peakMonth || '—'}</p>
        </div>
        <div className="border border-border rounded-lg px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">Visitor growth</p>
          <p className={`text-sm font-semibold mt-1 ${growthRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(0)}%
          </p>
        </div>
        <div className="border border-border rounded-lg px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">Time to peak</p>
          <p className="text-sm font-semibold mt-1">
            {rampUpMonths === 0 ? 'From launch' : `${rampUpMonths} months`}
          </p>
        </div>
      </div>
    </div>
  );
}
