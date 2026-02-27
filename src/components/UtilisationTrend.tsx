"use client";

import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { MonthlyData } from '@/types/momence';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface UtilisationTrendProps {
  monthlyData: MonthlyData[];
}

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
      <CardHeader className="pb-2 px-5 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Monthly occupancy rate (%)</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visitors ÷ total available seats — demand intensity independent of session count
            </p>
          </div>
          <span className="text-sm text-muted-foreground shrink-0 ml-4">
            avg <span className="font-semibold text-foreground">{avgOccupancy.toFixed(1)}%</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
              formatter={(value: number, name: string) => {
                if (name === 'occupancy') return [`${value.toFixed(1)}%`, 'Occupancy'];
                return [value.toLocaleString(), name];
              }}
            />
            <Line
              type="monotone"
              dataKey="occupancy"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Insight pills */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Card className="bg-muted/30">
            <CardContent className="px-3 py-2.5 text-center">
              <p className="text-sm text-muted-foreground">Peak occupancy</p>
              <p className="text-sm font-semibold mt-0.5 text-emerald-600">{peak.occupancy.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground mt-0.5">{peak.month}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="px-3 py-2.5 text-center">
              <p className="text-sm text-muted-foreground">Average</p>
              <p className={`text-sm font-semibold mt-0.5 ${avgOccupancy >= 70 ? 'text-emerald-600' : avgOccupancy >= 40 ? 'text-amber-500' : 'text-foreground'}`}>
                {avgOccupancy.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">all months</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="px-3 py-2.5 text-center">
              <p className="text-sm text-muted-foreground">Lowest month</p>
              <p className="text-sm font-semibold mt-0.5 text-muted-foreground">{low.occupancy.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground mt-0.5">{low.month}</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
