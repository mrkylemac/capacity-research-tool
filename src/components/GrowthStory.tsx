import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
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

  const chartData = useMemo(() =>
    monthlyData.map(m => ({
      name: `${m.month.slice(0, 3)} '${m.year.toString().slice(-2)}`,
      visitors: m.ticketsSold,
    })),
  [monthlyData]);

  if (monthlyData.length < 2) return null;

  const activeMonths = monthlyData.filter(m => m.ticketsSold > 0);
  const avgVisitors = activeMonths.length > 0
    ? activeMonths.reduce((s, m) => s + m.ticketsSold, 0) / activeMonths.length
    : 0;

  const { peakMonth, growthRate, rampUpMonths } = analysis;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-4">Visitors per month</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="growthVisitorsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'hsl(0 0% 45%)', fontSize: 11 }}
                  axisLine={{ stroke: 'hsl(0 0% 90%)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'hsl(0 0% 45%)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(0 0% 100%)',
                    border: '1px solid hsl(0 0% 90%)',
                    borderRadius: '6px',
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [v.toLocaleString(), 'Visitors']}
                />
                <ReferenceLine
                  y={avgVisitors}
                  stroke="hsl(0 0% 60%)"
                  strokeDasharray="5 5"
                  label={{ value: 'avg', position: 'right', fontSize: 10, fill: 'hsl(0 0% 60%)' }}
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#growthVisitorsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
