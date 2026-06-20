'use client';

import type { BOM } from '@/types/saunaMaterials';

function fmt(n: number, suffix: string) {
  return `${n.toLocaleString('en-AU', { maximumFractionDigits: 1 })} ${suffix}`;
}

function fmtAUD(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
}

interface CardProps {
  label: string;
  value: string;
  badge?: string;
  sub?: string;
  hero?: boolean;
}

function Card({ label, value, badge, sub, hero }: CardProps) {
  return (
    <div
      className="bg-card rounded-2xl border border-gray-2 shadow-1 px-5 py-4"
      style={hero ? { borderTop: '2px solid var(--primary)' } : undefined}
    >
      <p className="text-xs text-muted-foreground font-medium mb-1.5 uppercase tracking-wide">{label}</p>
      <p
        className="text-2xl font-bold tracking-tight leading-none text-fg-4"
        style={hero ? { color: 'var(--primary)' } : undefined}
      >
        {value}
      </p>
      {badge && (
        <p className="text-sm font-normal text-muted-foreground mt-0.5">({badge})</p>
      )}
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  );
}

export function BomSummaryCards({ bom }: { bom: BOM }) {
  const t = bom.totals;
  const hasLabour = t.labourHours !== undefined;
  return (
    <div className={`grid grid-cols-2 gap-3 ${hasLabour ? 'sm:grid-cols-5' : 'sm:grid-cols-4'}`}>
      <Card
        label="Timber"
        value={fmt(t.timberLM, 'lm')}
        badge={t.timberM2 > 0 ? fmt(t.timberM2, 'm²') : undefined}
        sub="Cladding · bench · battens"
        hero
      />
      <Card
        label="Insulation"
        value={fmt(t.insulationM2, 'm²')}
        sub="Walls + ceiling"
      />
      <Card
        label="Vapour barrier"
        value={fmt(t.vapourBarrierM2, 'm²')}
        sub="With 10% overlap"
      />
      {hasLabour && (
        <Card label="Labour" value={fmt(t.labourHours!, 'hrs')} sub="Estimate · not priced in library" />
      )}
      <Card
        label="Cost"
        value={t.estimatedTotalCost === null ? '—' : fmtAUD(t.estimatedTotalCost)}
        sub={
          t.estimatedTotalCost === null
            ? 'Set prices in library'
            : hasLabour
              ? 'Materials + labour'
              : 'Priced lines only'
        }
      />
    </div>
  );
}
