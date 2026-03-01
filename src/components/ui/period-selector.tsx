"use client";

import { useState } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';
import { ChevronsUpDown } from 'lucide-react';

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
  { options: ['yesterday', '1w', '1m'] },
  { label: 'The last', options: ['last1m', '3m', '6m', '12m'] },
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
}

export function PeriodSelector({ value, onChange, className, availableMonths }: PeriodSelectorProps) {
  const [open, setOpen] = useState(false);

  const currentLabel = PERIOD_OPTIONS.find(o => o.value === value)?.label ?? 'All time';

  const isVisible = (opt: { value: PeriodOption; months: number | null }) => {
    if (opt.months === null) return true;
    if (availableMonths == null) return true;
    return opt.months <= availableMonths;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3.5 py-1.5 text-md font-medium text-foreground transition-colors hover:bg-muted',
            className,
          )}
        >
          {currentLabel}
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-44 p-1.5"
      >
        {PERIOD_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div className="my-1 h-px bg-border" />}
            {group.label && (
              <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
            )}
            {group.options.map(v => {
              const opt = PERIOD_OPTIONS.find(o => o.value === v)!;
              if (!isVisible(opt)) return null;
              const selected = value === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => { onChange(v); setOpen(false); }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-md transition-colors',
                    selected
                      ? 'text-foreground'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  {opt.label}
                  {selected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
