"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, subMonths, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { CalendarIcon, ChevronDown, Loader2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { useSessions } from '@/hooks/useSessions';
import { VENUES } from '@/config/api';
import {
  getRecentSearches,
  getCacheKey,
  getCachedEntry,
  setCachedEntry,
  type CachedVenueEntry,
} from '@/lib/venueCache';
import { RecentSearches } from '@/components/RecentSearches';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ── Period presets ──────────────────────────────────────────────

type SearchPeriod = 'this-week' | 'this-month' | '1m' | '3m' | '6m' | '12m';

const SEARCH_PERIODS: { value: SearchPeriod; label: string }[] = [
  { value: 'this-week',  label: 'This week' },
  { value: 'this-month', label: 'This month' },
  { value: '1m',         label: 'Last month' },
  { value: '3m',         label: 'Last 3 months' },
  { value: '6m',         label: 'Last 6 months' },
  { value: '12m',        label: 'Last 12 months' },
];

function getSearchRange(period: SearchPeriod): { from: Date; to: Date } {
  const now = new Date();
  switch (period) {
    case 'this-week':
      // Mon–today
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
    case 'this-month':
      return { from: startOfMonth(now), to: now };
    case '1m': {
      // Full previous calendar month (e.g. on Mar 2 → Feb 1–Feb 28)
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case '3m':
      return { from: subMonths(now, 3), to: now };
    case '6m':
      return { from: subMonths(now, 6), to: now };
    case '12m':
      return { from: subMonths(now, 12), to: now };
  }
}

function formatDateLabel(from: Date, to: Date): string {
  if (from.getFullYear() === to.getFullYear()) {
    return `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`;
  }
  return `${format(from, 'MMM d, yyyy')} – ${format(to, 'MMM d, yyyy')}`;
}

// ── Compound date + period picker ──────────────────────────────

interface DatePeriodPickerProps {
  period: SearchPeriod | null;
  range: DateRange;
  onPeriodChange: (period: SearchPeriod) => void;
  onRangeChange: (range: DateRange) => void;
}

function DatePeriodPicker({ period, range, onPeriodChange, onRangeChange }: DatePeriodPickerProps) {
  const [open, setOpen] = useState(false);

  const displayLabel = period
    ? (SEARCH_PERIODS.find(p => p.value === period)?.label ?? 'Custom range')
    : range.from && range.to
    ? formatDateLabel(range.from, range.to)
    : 'Select dates';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center gap-2.5 rounded-md border border-input bg-background px-3',
            'text-base text-foreground transition-colors hover:bg-accent/20',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left">{displayLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="w-auto p-0 overflow-hidden">
        
        {/* Quick period presets */}
        <div className="p-2">
          {/* "This" group */}
          {SEARCH_PERIODS.slice(0, 2).map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => { onPeriodChange(p.value); setOpen(false); }}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-base transition-colors hover:bg-muted',
                period === p.value ? 'font-medium' : 'text-foreground',
              )}
            >
              {p.label}
              {period === p.value && <span className="h-1.5 w-1.5 rounded-full bg-foreground shrink-0" />}
            </button>
          ))}

          <div className="my-1 h-px bg-border" />

          {/* "Last" group */}
          {SEARCH_PERIODS.slice(2).map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => { onPeriodChange(p.value); setOpen(false); }}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-base transition-colors hover:bg-muted',
                period === p.value ? 'font-medium' : 'text-foreground',
              )}
            >
              {p.label}
              {period === p.value && <span className="h-1.5 w-1.5 rounded-full bg-foreground shrink-0" />}
            </button>
          ))}
        </div>

        <div className="h-px bg-border" />

        {/* Calendar range picker */}
        <Calendar
          mode="range"
          selected={range}
          onSelect={(r) => {
            if (!r) return;
            onRangeChange(r);
            if (r.from && r.to) setOpen(false);
          }}
          disabled={{ after: new Date() }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ── Main component ──────────────────────────────────────────────

export function HomeClient() {
  const router = useRouter();
  const hook = useSessions();
  const { allSessions, metrics, monthlyData, venueConfig, hostInfo, isLoading, fetchingCount } = hook;

  const [selectedVenueId, setSelectedVenueId] = useState(VENUES[0]?.id ?? '');
  const [activePeriod, setActivePeriod] = useState<SearchPeriod | null>('3m');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const r = getSearchRange('3m');
    return { from: r.from, to: r.to };
  });

  const [loadingVenueId, setLoadingVenueId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<CachedVenueEntry[]>([]);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const dateFrom = format(dateRange.from ?? new Date(), 'yyyy-MM-dd');
  const dateTo   = format(dateRange.to   ?? new Date(), 'yyyy-MM-dd');

  // Once fetch completes → cache and navigate
  useEffect(() => {
    if (!loadingVenueId || isLoading) return;

    if (allSessions.length === 0) {
      setFetchError('No sessions found for this venue and date range.');
      setLoadingVenueId(null);
      return;
    }

    const venueName =
      VENUES.find(v => v.id === loadingVenueId)?.name ||
      hostInfo?.name ||
      `Host ${loadingVenueId}`;

    const entry = setCachedEntry({
      hostId: loadingVenueId,
      platform: 'momence',
      venueName,
      dateRange: { from: dateFrom, to: dateTo },
      sessions: allSessions,
      metrics,
      monthlyData,
      venueConfig,
      hostInfo,
    });

    setRecentSearches(getRecentSearches());
    router.push(`/report?hostId=${entry.hostId}&from=${dateFrom}&to=${dateTo}&platform=${entry.platform}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingVenueId, isLoading, allSessions.length]);

  async function handleFetch() {
    if (!selectedVenueId || loadingVenueId || !dateRange.from || !dateRange.to) return;
    setFetchError(null);

    // Hit the cache first
    const key = getCacheKey(selectedVenueId, 'momence', dateFrom, dateTo);
    const cached = getCachedEntry(key);
    if (cached) {
      router.push(`/report?hostId=${selectedVenueId}&from=${dateFrom}&to=${dateTo}&platform=momence`);
      return;
    }

    setLoadingVenueId(selectedVenueId);
    await hook.fetchData({
      hostId: selectedVenueId,
      startsAtFrom: dateRange.from.toISOString(),
      startsAtTo:   dateRange.to.toISOString(),
    });
  }

  function handleSelectCached(entry: CachedVenueEntry) {
    router.push(
      `/report?hostId=${entry.hostId}&from=${entry.dateRange.from}&to=${entry.dateRange.to}&platform=${entry.platform}`,
    );
  }

  const isLoadingNow = loadingVenueId !== null && isLoading;

  return (
    <main className="min-h-screen bg-background">
      <div className="page-container">

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Capacity Report</h1>
        </div>

        {/* ── Query bar ── */}
        <div className="flex flex-col sm:flex-row sm:gap-3 mb-8 gap-8">
          {/* Venue dropdown */}
          <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Select venue" />
            </SelectTrigger>
            <SelectContent>
              {VENUES.map(v => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date + period picker */}
          <DatePeriodPicker
            period={activePeriod}
            range={dateRange}
            onPeriodChange={(p) => {
              setActivePeriod(p);
              const r = getSearchRange(p);
              setDateRange({ from: r.from, to: r.to });
            }}
            onRangeChange={(r) => {
              setDateRange(r);
              setActivePeriod(null);
            }}
          />

          {/* Fetch button */}
          <Button
            onClick={handleFetch}
            disabled={isLoadingNow || !selectedVenueId || !dateRange.from || !dateRange.to}
            className="h-10 w-full sm:w-auto sm:ml-auto px-6 bg-black text-white"
          >
            {isLoadingNow ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                {fetchingCount > 0 ? `${fetchingCount.toLocaleString()} sessions…` : 'Loading…'}
              </>
            ) : (
              'Search'
            )}
          </Button>
        </div>

        {fetchError && (
          <p className="mb-6 text-base text-destructive">{fetchError}</p>
        )}

        {/* ── Recent searches ── */}
        {recentSearches.length > 0 && (
            <RecentSearches
              entries={recentSearches}
              onSelect={handleSelectCached}
            />
        )}

      </div>
    </main>
  );
}
