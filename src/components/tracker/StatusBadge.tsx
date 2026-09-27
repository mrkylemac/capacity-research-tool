import type { ItemStatus } from '@/types/tracker';

const CONFIG: Record<ItemStatus, { label: string; cls: string }> = {
  forecast:  { label: 'Forecast',  cls: 'bg-muted text-muted-foreground' },
  quoted:    { label: 'Quoted',    cls: 'bg-status-info text-status-info-foreground' },
  invoiced:  { label: 'Invoiced',  cls: 'bg-status-warning text-status-warning-foreground' },
  paid:      { label: 'Paid',      cls: 'bg-status-success text-status-success-foreground' },
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  const { label, cls } = CONFIG[status] ?? CONFIG.forecast;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
