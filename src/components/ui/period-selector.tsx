"use client";

import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  startOfMonth,
  startOfYear,
  subMonths,
} from 'date-fns';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';
import { cn } from '@/lib/utils';

export type PeriodOption =
  | 'today'
  | 'yesterday'
  | '1w'
  | '1m'
  | '1y'
  | 'last1m'
  | '3m'
  | '6m'
  | '12m'
  | 'all';

export interface PeriodRange {
  from: Date;
  to: Date;
}

/** Flat list used for period auto-correction logic. months: null = never filtered out. */
export const PERIOD_OPTIONS: { value: PeriodOption; label: string; months: number | null }[] = [
  { value: 'today',     label: 'Today',      months: 0.03 },
  { value: 'yesterday', label: 'Yesterday',  months: 0.03 },
  { value: '1w',        label: 'This week',  months: 0.25 },
  { value: '1m',        label: 'This month', months: 1    },
  { value: '1y',        label: 'This year',  months: 12   },
  { value: 'last1m',    label: '1 month',    months: 1    },
  { value: '3m',        label: '3 months',   months: 3    },
  { value: '6m',        label: '6 months',   months: 6    },
  { value: '12m',       label: '12 months',  months: 12   },
  { value: 'all',       label: 'All time',   months: null },
];

/** Groups used to render the dropdown with separators. */
const PERIOD_GROUPS: { label?: string; options: PeriodOption[] }[] = [
  { options: ['today', 'yesterday', '1w', '1m'] },
  { label: 'The last', options: ['last1m', '3m', '6m', '12m'] },
  { options: ['all'] },
];

/** Returns the from/to Date range for a given period option. */
export function getPeriodRange(period: PeriodOption): PeriodRange {
  const now = new Date();
  switch (period) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    }
    case '1w':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
    case 'last1m':
      return { from: subMonths(now, 1), to: now };
    case '1m':
      return { from: startOfMonth(now), to: now };
    case '1y':
      return { from: startOfYear(now), to: now };
    case '3m':
      return { from: subMonths(now, 3), to: now };
    case '6m':
      return { from: subMonths(now, 6), to: now };
    case '12m':
      return { from: subMonths(now, 12), to: now };
    case 'all':
      return { from: new Date('2020-01-01'), to: now };
  }
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
    if (diffDays <= 2)   return 'today';
    if (diffDays <= 7)   return '1w';
    if (diffDays <= 35)  return '1m';
    if (diffDays <= 100) return '3m';
    if (diffDays <= 190) return '6m';
    if (diffDays <= 380) return '12m';
    return 'all';
  } catch {
    return '1m';
  }
}

interface PeriodSelectorProps {
  value: PeriodOption;
  onChange: (value: PeriodOption) => void;
  className?: string;
  /** Months of data available. Options requiring more months are hidden. */
  availableMonths?: number | null;
  /** Period values to render as disabled (no data available for those ranges). */
  disabledValues?: Set<PeriodOption>;
}

export function PeriodSelector({ value, onChange, className, availableMonths, disabledValues }: PeriodSelectorProps) {
  const isVisible = (opt: { months: number | null }) => {
    if (opt.months === null) return true;
    if (availableMonths == null) return true;
    return opt.months <= availableMonths;
  };

  return (
    <Select
      value={value}
      onValueChange={v => {
        const p = v as PeriodOption;
        if (disabledValues?.has(p)) return;
        onChange(p);
      }}
    >
      <SelectTrigger
        className={cn(
          'inline-flex h-auto w-auto items-center gap-1.5 rounded-full border-0 bg px-3.5 py-2 text-base font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus:ring-0 focus:ring-offset-0',
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" sideOffset={6} className="w-44 rounded-2xl shadow-2">
        {PERIOD_GROUPS.map((group, gi) => (
          <SelectGroup key={gi}>
            {gi > 0 && <SelectSeparator />}
            {group.options.map(v => {
              const opt = PERIOD_OPTIONS.find(o => o.value === v)!;
              if (!isVisible(opt)) return null;
              const isDisabled = disabledValues?.has(v) ?? false;
              return (
                <SelectItem
                  key={v}
                  value={v}
                  disabled={isDisabled}
                  className={isDisabled ? 'opacity-40 cursor-not-allowed' : undefined}
                >
                  {opt.label}
                </SelectItem>
              );
            })}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
