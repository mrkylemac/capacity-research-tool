"use client";

import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  type DotProps,
} from 'recharts';
import type { MonthlyData } from '@/types/momence';
import { isPartialMonth } from '@/lib/venueInsights';

interface UtilisationTrendProps {
  monthlyData: MonthlyData[];
}

/** Custom dot that fades partial months. */
function OccDot(props: DotProps & { payload?: { partial?: boolean } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.5}
      fill={payload?.partial ? 'var(--muted-foreground)' : '#474747'}
      opacity={payload?.partial ? 0.3 : 1}
      stroke="none"
    />
  );
}

/** Renders flat (no Card wrapper) — embed inside a parent CardContent. */
export function UtilisationTrend({ monthlyData }: UtilisationTrendProps) {
  const chartData = useMemo(() =>
    [...monthlyData]
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return new Date(`${a.month} 1, ${a.year}`).getMonth() -
               new Date(`${b.month} 1, ${b.year}`).getMonth();
      })
      .map(m => ({
        month: format(new Date(`${m.month} 1, ${m.year}`), 'MMM yy'),
        occupancy: Math.round(m.utilisation * 10) / 10,
        partial: isPartialMonth(m, monthlyData),
      })),
  [monthlyData]);

  if (monthlyData.length < 2) return null;

  const fullData = chartData.filter(d => !d.partial);
  const hasPartialMonths = chartData.some(d => d.partial);

  const avgOccupancy = fullData.length > 0
    ? fullData.reduce((s, m) => s + m.occupancy, 0) / fullData.length
    : 0;

  const statBase = fullData.length > 0 ? fullData : chartData;
  const peak = statBase.reduce((best, m) => m.occupancy > best.occupancy ? m : best, statBase[0]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">Monthly occupancy (%)</p>
        <p className="text-sm text-muted-foreground flex gap-3">
          <span>
            Peak <span className="font-medium text-foreground tabular-nums">{peak.occupancy.toFixed(0)}%</span>
            {' '}<span className="text-muted-foreground">{peak.month}</span>
          </span>
          <span>
            avg <span className="font-medium text-foreground tabular-nums">{avgOccupancy.toFixed(1)}%</span>
          </span>
        </p>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              fontSize: 12,
              color: 'var(--popover-foreground)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}
            labelStyle={{ color: 'var(--muted-foreground)', marginBottom: 2 }}
            formatter={(value: number, name: string) => {
              if (name === 'occupancy') return [`${value.toFixed(1)}%`, 'Occupancy'];
              return [value.toLocaleString(), name];
            }}
          />
          <Line
            type="monotone"
            dataKey="occupancy"
            stroke="#474747"
            strokeWidth={1.5}
            dot={<OccDot />}
            activeDot={{ r: 3, fill: '#474747' }}
          />
        </LineChart>
      </ResponsiveContainer>

      {hasPartialMonths && (
        <p className="text-sm text-muted-foreground mt-1.5">
          Faded months have insufficient data and are excluded from calculations.
        </p>
      )}
    </div>
  );
}
