import type { CapExSummary } from '@/types/tracker';

function fmt(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: 'default' | 'green' | 'amber' | 'red';
  hero?: boolean;
}

function StatCard({ label, value, sub, accent = 'default', hero = false }: StatCardProps) {
  const valueColor = {
    default: hero ? '' : 'text-fg-4',
    green:   'text-green-4',
    amber:   'text-amber-4',
    red:     'text-red-4',
  }[accent];

  return (
    <div
      className="bg-card rounded-2xl border border-gray-2 shadow-1 px-5 py-4 transition-all"
      style={hero ? { borderTop: '2px solid var(--primary)' } : undefined}
    >
      <p className="text-xs text-muted-foreground font-medium mb-1.5 uppercase tracking-wide">{label}</p>
      <p
        className={`text-2xl font-bold tracking-tight leading-none ${valueColor}`}
        style={hero && accent === 'default' ? { color: 'var(--primary)' } : undefined}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  );
}

interface BurnBarProps {
  percentage: number;
  spent: number;
  budget: number;
}

function BurnBar({ percentage, spent, budget }: BurnBarProps) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const color =
    clamped > 90 ? 'bg-red-4' :
    clamped > 75 ? 'bg-amber-4' :
    'bg-green-4';

  const label = clamped < 50 ? 'On track' : clamped < 75 ? 'Progressing' : clamped < 90 ? 'High utilisation' : 'Near capacity';

  return (
    <div className="bg-card rounded-2xl border border-gray-2 shadow-1 px-5 py-4">
      <div className="flex justify-between items-baseline mb-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Budget burn</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground">{fmt(spent)} of {fmt(budget)}</span>
          <span className="text-sm font-bold text-fg-4">{clamped.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-2 bg-gray-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">{label}</p>
    </div>
  );
}

export function BudgetSummary({ summary }: { summary: CapExSummary }) {
  const remainingAccent = summary.totalRemaining < 0 ? 'red' : summary.totalRemaining < summary.totalBudget * 0.1 ? 'amber' : 'default';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total budget"
          value={fmt(summary.totalBudget)}
          sub="Forecast total"
          hero
        />
        <StatCard
          label="Spent to date"
          value={fmt(summary.totalSpent)}
          sub="Paid invoices"
          accent={summary.totalSpent > summary.totalBudget ? 'red' : 'default'}
        />
        <StatCard
          label="Committed"
          value={fmt(summary.totalCommitted)}
          sub="Quoted + invoiced"
          accent="amber"
        />
        <StatCard
          label="Remaining"
          value={fmt(Math.max(0, summary.totalRemaining))}
          sub={summary.totalRemaining < 0 ? `${fmt(Math.abs(summary.totalRemaining))} over` : 'Unallocated'}
          accent={remainingAccent}
        />
      </div>
      <BurnBar
        percentage={summary.burnPercentage}
        spent={summary.totalSpent}
        budget={summary.totalBudget}
      />
    </div>
  );
}
