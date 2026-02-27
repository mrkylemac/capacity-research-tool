import { useMemo } from 'react';
import { format } from 'date-fns';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { MonthlyData } from '@/types/momence';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';

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
    [...monthlyData]
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return new Date(`${a.month} 1, ${a.year}`).getMonth() -
               new Date(`${b.month} 1, ${b.year}`).getMonth();
      })
      .map(m => ({
        month: format(new Date(`${m.month} 1, ${m.year}`), 'MMM yy'),
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
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2 px-5 pt-5">
          <div className="flex items-center justify-between">
            <CardDescription className="text-sm font-medium">Visitors per month</CardDescription>
            <span className="text-sm text-muted-foreground">
              avg <span className="font-semibold text-foreground">{avgVisitors.toLocaleString()}</span>/mo
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: 13,
                  color: 'hsl(var(--popover-foreground))',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}
                formatter={(value: number) => [value.toLocaleString(), 'Visitors']}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#visitorsGradient)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Annotation stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">Strongest month</p>
            <p className="text-sm font-semibold">{peakMonth || '—'}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">Visitor growth</p>
            <p className={`text-sm font-semibold ${growthRate >= 0 ? 'text-emerald-600' : 'text-foreground'}`}>
              {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(0)}%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground mb-1">Time to peak</p>
            <p className="text-sm font-semibold">
              {rampUpMonths === 0 ? 'From launch' : `${rampUpMonths} months`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
