import type { FinancialSignal, SignalType } from '@/types/tracker';

const SIGNAL_STYLES: Record<SignalType, { bg: string; border: string; title: string; icon: string }> = {
  danger:  { bg: 'bg-red-1',   border: 'border-red-3',   title: 'text-red-4',   icon: '⚠' },
  warning: { bg: 'bg-amber-1', border: 'border-amber-3', title: 'text-amber-4', icon: '◉' },
  info:    { bg: 'bg-sky-1',   border: 'border-sky-3',   title: 'text-sky-4',   icon: 'ℹ' },
  success: { bg: 'bg-green-1', border: 'border-green-3', title: 'text-green-4', icon: '✓' },
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
