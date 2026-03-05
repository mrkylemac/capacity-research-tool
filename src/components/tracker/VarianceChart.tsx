'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CategorySummary } from '@/types/tracker';

function fmtAUD(n: number) {
  const abs = Math.abs(n);
  const str = abs >= 1000 ? `$${(abs / 1000).toFixed(0)}k` : `$${abs.toFixed(0)}`;
  return n >= 0 ? `+${str}` : `−${str}`;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value as number;
  return (
    <div className="bg-card border border-gray-2 rounded-xl shadow-2 px-3 py-2 text-sm">
      <p className="font-semibold text-fg-4 mb-1">{label}</p>
      <p className={v >= 0 ? 'text-green-4' : 'text-red-4'}>
        {v >= 0 ? 'Under budget' : 'Over budget'}: {fmtAUD(v)}
      </p>
    </div>
  );
}

export function VarianceChart({ categories }: { categories: CategorySummary[] }) {
  const data = categories
    .filter(c => c.forecastTotal > 0)
    .map(c => ({ name: c.name, variance: c.variance }))
    .sort((a, b) => a.variance - b.variance);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Forecast vs Actual</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">Variance by category (green = under, red = over)</p>
        <ResponsiveContainer width="100%" height={Math.max(180, data.length * 38)}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--gray-2)" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: 'var(--fg-3)', fontFamily: 'var(--font-body)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={n => `$${Math.abs(n / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={96}
              tick={{ fontSize: 12, fill: 'var(--fg-3)', fontFamily: 'var(--font-body)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--gray-a1)' }} />
            <Bar dataKey="variance" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((entry, i) => (
                <Cell
                  key={`cell-${i}`}
                  fill={entry.variance >= 0 ? 'var(--green-4)' : 'var(--red-4)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
