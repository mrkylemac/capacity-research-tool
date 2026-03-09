'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CategorySummary } from '@/types/tracker';

function fmtAUD(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-gray-2 rounded-xl shadow-2 px-3 py-2 text-sm min-w-32">
      <p className="font-semibold text-fg-4 mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-fg-3 mb-0.5">
          <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: p.color }} />
          <span className="capitalize">{p.name}</span>
          <span className="ml-auto font-medium text-fg-4">{fmtAUD(p.value as number)}</span>
        </div>
      ))}
    </div>
  );
}

export function CategoryBreakdown({ categories }: { categories: CategorySummary[] }) {
  const data = categories
    .filter(c => c.forecastTotal > 0)
    .map(c => ({
      name: c.name,
      Forecast: c.forecastTotal,
      Actual:   c.actualTotal,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spend by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--gray-2)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--fg-3)', fontFamily: 'var(--font-body)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--fg-3)', fontFamily: 'var(--font-body)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmtAUD}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--gray-a1)' }} />
            <Legend
              wrapperStyle={{ fontSize: 12, fontFamily: 'var(--font-body)', color: 'var(--fg-3)' }}
              iconType="square"
              iconSize={8}
            />
            <Bar dataKey="Forecast" fill="var(--sky-2)"   radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Actual"   fill="var(--sky-4)"   radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
