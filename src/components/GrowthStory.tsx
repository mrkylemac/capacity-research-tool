"use client";

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, type DotProps } from 'recharts';
import type { MonthlyData } from '@/types/momence';
import { chartTooltipContentStyle, chartTooltipLabelStyle, chartTooltipItemStyle } from '@/lib/chartTooltip';
import { isPartialMonth } from '@/lib/venueInsights';

interface GrowthStoryProps {
  monthlyData: MonthlyData[];
}

function analyzeGrowth(data: MonthlyData[]): { peakMonth: string; growthRate: number } {
  if (data.length === 0) return { peakMonth: '', growthRate: 0 };

  const full = data.filter(m => m.sessions > 0 && !isPartialMonth(m, data));
  const base = full.length >= 2 ? full : data;

  const sorted = [...base].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return new Date(`${a.month} 1, ${a.year}`).getMonth() -
           new Date(`${b.month} 1, ${b.year}`).getMonth();
  });

  const peak = sorted.reduce((best, m) => m.ticketsSold > best.ticketsSold ? m : best);
  const n = Math.min(3, sorted.length);
  const firstAvg = sorted.slice(0, n).reduce((s, m) => s + m.ticketsSold, 0) / n;
  const lastAvg = sorted.slice(-n).reduce((s, m) => s + m.ticketsSold, 0) / n;
  const growthRate = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

  return { peakMonth: `${peak.month} ${peak.year}`, growthRate };
}

/** Custom dot that fades partial months. */
function GrowthDot(props: DotProps & { payload?: { partial?: boolean } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.5}
      fill={payload?.partial ? 'var(--muted-foreground)' : 'var(--chart-fill)'}
      opacity={payload?.partial ? 0.3 : 1}
      stroke="none"
    />
  );
}

/** Renders flat (no Card wrapper) — embed inside a parent CardContent. */
export function GrowthStory({ monthlyData }: GrowthStoryProps) {
  const { peakMonth, growthRate } = useMemo(() => analyzeGrowth(monthlyData), [monthlyData]);

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
        partial: isPartialMonth(m, monthlyData),
      })),
  [monthlyData]);

  const hasPartialMonths = chartData.some(d => d.partial);

  if (monthlyData.length < 2) return null;

  const activeMonths = monthlyData.filter(m => m.ticketsSold > 0 && !isPartialMonth(m, monthlyData));
  const avgVisitors = activeMonths.length > 0
    ? Math.round(activeMonths.reduce((s, m) => s + m.ticketsSold, 0) / activeMonths.length)
    : 0;

  const growthLabel = Math.abs(growthRate) < 2
    ? 'stable'
    : growthRate > 0
    ? `+${growthRate.toFixed(0)}%`
    : `${growthRate.toFixed(0)}%`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-y-1 mb-2">
        <p className="text-sm text-muted-foreground">Visitors per month</p>
        <p className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
          {peakMonth && (
            <span>Peak <span className="font-medium text-foreground">{peakMonth}</span></span>
          )}
          <span>
            Growth{' '}
            <span className="font-medium text-foreground tabular-nums">{growthLabel}</span>
          </span>
          <span>
            avg <span className="font-medium text-foreground tabular-nums">{avgVisitors.toLocaleString()}</span>/mo
          </span>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-fill)" stopOpacity={0.14} />
              <stop offset="95%" stopColor="var(--chart-fill)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip
            contentStyle={chartTooltipContentStyle}
            labelStyle={chartTooltipLabelStyle}
            itemStyle={chartTooltipItemStyle}
            separator=": "
            formatter={(value: number) => [value.toLocaleString(), 'Visitors']}
          />
          <Area
            type="monotone"
            dataKey="visitors"
            stroke="var(--chart-fill)"
            strokeWidth={1.5}
            fill="url(#visitorsGradient)"
            dot={<GrowthDot />}
            activeDot={{ r: 3, fill: 'var(--chart-fill)' }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {hasPartialMonths && (
        <p className="text-sm text-muted-foreground mt-1.5">
          Faded months have insufficient data and are excluded from growth calculations.
        </p>
      )}
    </div>
  );
}
