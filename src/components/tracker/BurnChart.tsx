'use client';

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CostLineItem, BurnDataPoint } from '@/types/tracker';

function buildBurnData(items: CostLineItem[]): BurnDataPoint[] {
  const datedPaid = items
    .filter(i => i.date && i.actualAmount > 0 && i.status === 'paid')
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));

  if (datedPaid.length < 2) return [];

  // Group by YYYY-MM
  const monthMap = new Map<string, number>();
  for (const item of datedPaid) {
    const month = item.date!.slice(0, 7); // YYYY-MM
    monthMap.set(month, (monthMap.get(month) ?? 0) + item.actualAmount);
  }

  const months = Array.from(monthMap.keys()).sort();
  const totalBudget = items.reduce((s, i) => s + i.forecastAmount, 0);
  const budgetPerMonth = totalBudget / months.length;

  let cumActual = 0;
  let cumBudget = 0;

  return months.map(m => {
    cumActual += monthMap.get(m) ?? 0;
    cumBudget  = Math.min(totalBudget, cumBudget + budgetPerMonth);
    const [year, mon] = m.split('-');
    const label = new Date(Number(year), Number(mon) - 1).toLocaleString('en-AU', { month: 'short', year: '2-digit' });
    return { month: label, cumulativeBudget: Math.round(cumBudget), cumulativeActual: Math.round(cumActual) };
  });
}

function fmtAUD(n: number) {
  return n >= 1000
    ? `$${(n / 1000).toFixed(0)}k`
    : `$${n.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-gray-2 rounded-xl shadow-2 px-3 py-2 text-sm">
      <p className="font-semibold text-fg-4 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-fg-3">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name === 'cumulativeBudget' ? 'Budget pace' : 'Actual spend'}</span>
          <span className="ml-auto font-medium text-fg-4">
            {fmtAUD(p.value as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function BurnChart({ items }: { items: CostLineItem[] }) {
  const data = buildBurnData(items);

  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cumulative Burn</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add payment dates to line items to see cumulative spend over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cumulative Burn</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-sky-3 rounded inline-block" />
            Budget pace
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-green-4 rounded inline-block" />
            Actual spend
          </span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--gray-2)" />
            <XAxis
              dataKey="month"
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
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="cumulativeBudget"
              fill="var(--sky-1)"
              stroke="var(--sky-3)"
              strokeWidth={2}
              fillOpacity={1}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="cumulativeActual"
              stroke="var(--green-4)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--green-4)' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
