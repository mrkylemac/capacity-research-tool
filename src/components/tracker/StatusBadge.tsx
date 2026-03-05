import type { ItemStatus } from '@/types/tracker';

const CONFIG: Record<ItemStatus, { label: string; cls: string }> = {
  forecast:  { label: 'Forecast',  cls: 'bg-gray-2 text-fg-3' },
  quoted:    { label: 'Quoted',    cls: 'bg-sky-1   text-sky-4' },
  invoiced:  { label: 'Invoiced',  cls: 'bg-amber-1 text-amber-4' },
  paid:      { label: 'Paid',      cls: 'bg-green-1 text-green-4' },
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  const { label, cls } = CONFIG[status] ?? CONFIG.forecast;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
