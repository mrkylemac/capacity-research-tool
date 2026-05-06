'use client';

import { Fragment, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BOM, BOMCategory, BOMLineItem } from '@/types/saunaMaterials';

const CATEGORY_LABEL: Record<BOMCategory, string> = {
  timber: 'Timber',
  insulation: 'Insulation',
  vapourBarrier: 'Vapour barrier',
  tape: 'Foil tape',
  fixings: 'Fixings',
  misc: 'Other',
};

const CATEGORY_ORDER: BOMCategory[] = [
  'timber',
  'insulation',
  'vapourBarrier',
  'tape',
  'fixings',
  'misc',
];

function fmt(n: number) {
  return n.toLocaleString('en-AU', { maximumFractionDigits: 1 });
}

function fmtAUD(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
}

function groupByCategory(items: BOMLineItem[]) {
  const groups = new Map<BOMCategory, BOMLineItem[]>();
  for (const cat of CATEGORY_ORDER) groups.set(cat, []);
  for (const item of items) {
    const list = groups.get(item.category);
    if (list) list.push(item);
  }
  return [...groups.entries()].filter(([, list]) => list.length > 0);
}

export function BomTable({ bom }: { bom: BOM }) {
  const groups = groupByCategory(bom.lineItems);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (cat: string) => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bill of materials</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[760px]">
            <thead>
              <tr>
                <th className="pl-4 text-xs uppercase tracking-wide">Description</th>
                <th className="text-xs uppercase tracking-wide">Profile / Material</th>
                <th className="text-right text-xs uppercase tracking-wide">Qty</th>
                <th className="text-xs uppercase tracking-wide">Unit</th>
                <th className="text-right text-xs uppercase tracking-wide">Waste</th>
                <th className="text-right text-xs uppercase tracking-wide">Unit price</th>
                <th className="text-right pr-4 text-xs uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(([cat, items]) => {
                const isCollapsed = collapsed[cat];
                return (
                  <Fragment key={cat}>
                    <tr
                      className="cursor-pointer select-none bg-gray-1 hover:bg-muted/60 transition-colors"
                      onClick={() => toggle(cat)}
                    >
                      <td className="pl-4 font-semibold text-fg-4 py-2.5" colSpan={7}>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-muted-foreground text-xs w-3 text-center">
                            {isCollapsed ? '▸' : '▾'}
                          </span>
                          <span className="text-sm">{CATEGORY_LABEL[cat]}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            ({items.length})
                          </span>
                        </span>
                      </td>
                    </tr>
                    {!isCollapsed && items.map(item => (
                      <tr key={item.id}>
                        <td className="pl-10 text-sm text-fg-3">
                          {item.description}
                          {item.notes && (
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              {item.notes}
                            </span>
                          )}
                        </td>
                        <td className="text-sm text-muted-foreground">{item.profileOrMaterialName}</td>
                        <td className="text-right text-sm font-semibold tabular-nums">{fmt(item.quantity)}</td>
                        <td className="text-sm text-muted-foreground">{item.unit}</td>
                        <td className="text-right text-sm text-muted-foreground tabular-nums">
                          {item.wasteApplied > 0 ? `${Math.round(item.wasteApplied * 100)}%` : '—'}
                        </td>
                        <td className="text-right text-sm tabular-nums">
                          {item.unitPrice == null ? '—' : fmtAUD(item.unitPrice)}
                        </td>
                        <td className="pr-4 text-right text-sm font-semibold tabular-nums">
                          {item.totalPrice == null ? '—' : fmtAUD(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
