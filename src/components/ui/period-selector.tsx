"use client";

import { format, subMonths } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '@/lib/utils';

export type PeriodOption = '1m' | '3m' | '6m' | '12m' | 'all';

export interface PeriodRange {
  from: Date;
  to: Date;
}

interface PeriodSelectorProps {
  value: PeriodOption;
  onChange: (value: PeriodOption) => void;
  className?: string;
  /** 'ghost' = translucent pill (default, for nav bars); 'solid' = filled primary button (for hero cards) */
  variant?: 'ghost' | 'solid';
}

export const PERIOD_OPTIONS: { value: PeriodOption; label: string; months: number | null }[] = [
  { value: '1m',  label: 'Last 1 month',   months: 1  },
  { value: '3m',  label: 'Last 3 months',  months: 3  },
  { value: '6m',  label: 'Last 6 months',  months: 6  },
  { value: '12m', label: 'Last 12 months', months: 12 },
  { value: 'all', label: 'All time',       months: null },
];

/** Returns the from/to Date range for a given period option. */
export function getPeriodRange(period: PeriodOption): PeriodRange {
  const to = new Date();
  if (period === 'all') {
    return { from: new Date('2020-01-01'), to };
  }
  const opt = PERIOD_OPTIONS.find(p => p.value === period)!;
  const months = opt.months ?? 1;
  const from = subMonths(to, months);
  return { from, to };
}

/** Formats a period range as "27 Jan – 27 Feb 2026" or "1 Jan 2025 – 27 Feb 2026". */
export function formatPeriodDateRange(range: PeriodRange, actualFrom?: Date): string {
  const from = actualFrom ?? range.from;
  const fromYear = from.getFullYear();
  const toYear = range.to.getFullYear();
  if (fromYear === toYear) {
    return `${format(from, 'd MMM')} – ${format(range.to, 'd MMM yyyy')}`;
  }
  return `${format(from, 'd MMM yyyy')} – ${format(range.to, 'd MMM yyyy')}`;
}

/** Infer the closest period option from a from/to date string pair. */
export function inferPeriodFromDates(from: string, to: string): PeriodOption {
  try {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 35)  return '1m';
    if (diffDays <= 100) return '3m';
    if (diffDays <= 190) return '6m';
    if (diffDays <= 380) return '12m';
    return 'all';
  } catch {
    return '1m';
  }
}

export function PeriodSelector({ value, onChange, className, variant = 'ghost' }: PeriodSelectorProps) {
  const triggerBase =
    variant === 'solid'
      ? 'h-9 w-auto text-sm font-medium bg-primary text-primary-foreground border-0 rounded-md px-4 gap-1.5 focus:ring-0 focus:ring-offset-0 hover:bg-primary/90 transition-colors'
      : 'h-8 w-auto text-sm font-medium bg-muted/60 border-0 rounded-full px-3.5 gap-1 focus:ring-0 focus:ring-offset-0 hover:bg-muted transition-colors';

  return (
    <Select value={value} onValueChange={(v) => onChange(v as PeriodOption)}>
      <SelectTrigger className={cn(triggerBase, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[168px]">
        {PERIOD_OPTIONS.map(opt => (
          <SelectItem key={opt.value} value={opt.value} className="text-sm">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
