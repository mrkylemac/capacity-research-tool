import type { FinancialSignal, SignalType } from '@/types/tracker';

const SIGNAL_STYLES: Record<SignalType, { bg: string; border: string; title: string; icon: string }> = {
  danger:  { bg: 'bg-status-error',   border: 'border-status-error-border',   title: 'text-status-error-foreground',   icon: '⚠' },
  warning: { bg: 'bg-status-warning', border: 'border-status-warning-border', title: 'text-status-warning-foreground', icon: '◉' },
  info:    { bg: 'bg-status-info',    border: 'border-status-info-border',    title: 'text-status-info-foreground',    icon: 'ℹ' },
  success: { bg: 'bg-status-success', border: 'border-status-success-border', title: 'text-status-success-foreground', icon: '✓' },
};

function SignalCard({ signal }: { signal: FinancialSignal }) {
  const s = SIGNAL_STYLES[signal.type];
  return (
    <div className={`flex gap-3 items-start rounded-xl border px-4 py-3 ${s.bg} ${s.border}`}>
      <span className={`text-xs font-bold mt-0.5 shrink-0 w-4 text-center ${s.title}`} aria-hidden="true">
        {s.icon}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${s.title}`}>{signal.title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{signal.message}</p>
      </div>
    </div>
  );
}

export function CashSignals({ signals }: { signals: FinancialSignal[] }) {
  if (signals.length === 0) return null;

  const order: SignalType[] = ['danger', 'warning', 'info', 'success'];
  const sorted = [...signals].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  return (
    <div className="space-y-2">
      {sorted.map((s, i) => (
        <SignalCard key={i} signal={s} />
      ))}
    </div>
  );
}
