'use client';

import { Fragment, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import type { CategorySummary } from '@/types/tracker';

function fmt(n: number) {
  if (n === 0) return '—';
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
}

function varianceColor(v: number) {
  if (v > 0) return 'text-green-4';
  if (v < 0) return 'text-red-4';
  return 'text-muted-foreground';
}

function varianceFmt(v: number) {
  if (v === 0) return '—';
  const abs = Math.abs(v).toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
  return v > 0 ? `+${abs}` : `−${abs.replace('-', '')}`;
}

export function CostTable({ categories }: { categories: CategorySummary[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(categories.map(c => [c.name, true]))
  );

  const toggle = (name: string) =>
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost Line Items</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[640px]">
            <thead>
              <tr>
                <th className="pl-4 text-xs uppercase tracking-wide">Description</th>
                <th className="text-xs uppercase tracking-wide">Supplier</th>
                <th className="text-right text-xs uppercase tracking-wide">Forecast</th>
                <th className="text-right text-xs uppercase tracking-wide">Actual</th>
                <th className="text-right text-xs uppercase tracking-wide">Variance</th>
                <th className="text-right pr-4 text-xs uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <Fragment key={cat.name}>
                  {/* Category header row */}
                  <tr
                    className="cursor-pointer select-none bg-gray-1 hover:bg-muted/60 transition-colors"
                    onClick={() => toggle(cat.name)}
                  >
                    <td className="pl-4 font-semibold text-fg-4 py-2.5" colSpan={2}>
                      <span className="inline-flex items-center gap-2">
                        <span className="text-muted-foreground text-xs w-3 text-center">
                          {expanded[cat.name] ? '▾' : '▸'}
                        </span>
                        <span className="text-sm">{cat.name}</span>
                      </span>
                    </td>
                    <td className="text-right font-semibold text-sm">{fmt(cat.forecastTotal)}</td>
                    <td className="text-right font-semibold text-sm">
                      {cat.actualTotal > 0 ? fmt(cat.actualTotal) : '—'}
                    </td>
                    <td className={`text-right font-semibold text-sm ${varianceColor(cat.variance)}`}>
                      {varianceFmt(cat.variance)}
                    </td>
                    <td className="pr-4" />
                  </tr>

                  {/* Line items */}
                  {expanded[cat.name] && cat.items.map(item => (
                    <tr key={item.id}>
                      <td className="pl-10 text-fg-3 text-sm">
                        {item.description || '—'}
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {item.supplier || '—'}
                      </td>
                      <td className="text-right text-sm">{fmt(item.forecastAmount)}</td>
                      <td className="text-right text-sm">
                        {item.actualAmount > 0 ? fmt(item.actualAmount) : '—'}
                      </td>
                      <td className={`text-right text-sm ${varianceColor(item.variance)}`}>
                        {item.forecastAmount > 0 || item.actualAmount > 0 ? varianceFmt(item.variance) : '—'}
                      </td>
                      <td className="text-right pr-4">
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
