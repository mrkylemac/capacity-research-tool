"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronsUpDown, RefreshCw } from 'lucide-react';
import { ReportSections } from '@/components/ReportSections';
import { calculateBenchmarkMetrics } from '@/lib/benchmarkMetrics';
import {
  getCachedEntry,
  getCacheKey,
  getRecentSearches,
  setCachedEntry,
} from '@/lib/venueCache';
import { VENUES } from '@/config/api';
import { useVenueInfo } from '@/hooks/useVenueInfo';
import { useSessions } from '@/hooks/useSessions';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  PeriodSelector,
  getPeriodRange,
  PERIOD_OPTIONS,
  type PeriodOption,
} from '@/components/ui/period-selector';
import { format, parseISO } from 'date-fns';
import type { CachedVenueEntry } from '@/lib/venueCache';
import type { MonthlyData, MomenceSession } from '@/types/momence';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Format the exact computation window, e.g. "15 Oct – 28 Feb 2026" */
function formatComputedRange(from: string, to: string): string {
  try {
    const f = parseISO(from);
    const t = parseISO(to);
    if (f.getFullYear() === t.getFullYear()) {
      return `${format(f, 'd MMM')} – ${format(t, 'd MMM yyyy')}`;
    }
    return `${format(f, 'd MMM yyyy')} – ${format(t, 'd MMM yyyy')}`;
  } catch {
    return `${from} – ${to}`;
  }
}

function pickEntry({
  hostId,
  from,
  to,
  platform,
}: {
  hostId: string | null;
  from: string | null;
  to: string | null;
  platform: CachedVenueEntry['platform'] | null;
}): CachedVenueEntry | null {
  if (hostId && from && to && platform) {
    const key = getCacheKey(hostId, platform, from, to);
    return getCachedEntry(key);
  }
  const recent = getRecentSearches();
  return recent[0] ?? null;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Main client ───────────────────────────────────────────────────────────────

export function ReportClient() {
  const [entry, setEntry] = useState<CachedVenueEntry | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodOption>('all');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [isSyncInProgress, setIsSyncInProgress] = useState(false);
  const syncStarted = useRef(false);

  // Hook for live re-fetching
  const syncHook = useSessions();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const hId = sp.get('hostId');
    const from = sp.get('from');
    const to = sp.get('to');
    const platform = (sp.get('platform') as CachedVenueEntry['platform'] | null) ?? 'momence';
    setHostId(hId);
    const found = pickEntry({ hostId: hId, from, to, platform });
    setEntry(found);
  }, []);

  // ── Re-fetch / Sync ──────────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    if (!hostId || !entry || isSyncInProgress) return;
    setIsSyncInProgress(true);
    syncStarted.current = true;
    try {
      await syncHook.fetchData({
        hostId,
        startsAtFrom: entry.dateRange.from,
        startsAtTo: entry.dateRange.to,
      });
    } catch {
      setIsSyncInProgress(false);
      syncStarted.current = false;
    }
  }, [hostId, entry, isSyncInProgress, syncHook]);

  // When sync completes, persist fresh data and update local state
  useEffect(() => {
    if (!syncStarted.current || syncHook.isLoading) return;
    if (!hostId || !entry) return;

    if (syncHook.allSessions.length > 0) {
      const saved = setCachedEntry({
        hostId,
        platform: entry.platform,
        venueName: syncHook.hostInfo?.name ?? entry.venueName,
        dateRange: entry.dateRange,
        sessions: syncHook.allSessions,
        metrics: syncHook.metrics,
        monthlyData: syncHook.monthlyData,
        venueConfig: syncHook.venueConfig,
        hostInfo: syncHook.hostInfo,
      });
      setEntry(saved);
    }

    setIsSyncInProgress(false);
    syncStarted.current = false;
  }, [syncHook.isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Venue info from Google Maps ──────────────────────────────────────────
  const apiVenueConfig = VENUES.find(v => v.id === (hostId ?? entry?.hostId));
  const { info: placeInfo } = useVenueInfo(apiVenueConfig?.mapsQuery);

  // ── All-time data: merge every cached search for this venue ─────────────
  const allCachedSessions = useMemo<MomenceSession[]>(() => {
    if (!entry?.hostId) return entry?.sessions ?? [];
    const searches = getRecentSearches().filter(s => s.hostId === entry.hostId);
    const seen = new Set<string>();
    const result: MomenceSession[] = [];
    searches.forEach(search => {
      search.sessions.forEach(s => {
        if (!seen.has(s.id)) { seen.add(s.id); result.push(s); }
      });
    });
    return result;
  }, [entry?.hostId, entry?.sessions]);

  const allVenueMonthlyData = useMemo<MonthlyData[]>(() => {
    if (!entry?.hostId) return entry?.monthlyData ?? [];
    const searches = getRecentSearches().filter(s => s.hostId === entry.hostId);
    const merged = new Map<string, MonthlyData>();
    searches.forEach(search => {
      search.monthlyData.forEach(m => {
        const key = `${m.year}-${m.month}`;
        const existing = merged.get(key);
        if (!existing || m.ticketsSold > existing.ticketsSold) merged.set(key, m);
      });
    });
    return Array.from(merged.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return new Date(`${a.month} 1`).getMonth() - new Date(`${b.month} 1`).getMonth();
    });
  }, [entry?.hostId, entry?.monthlyData]);

  // ── Available months span ────────────────────────────────────────────────
  const availableMonths = useMemo<number | null>(() => {
    if (allCachedSessions.length === 0) return null;
    let minTs = Infinity;
    for (const s of allCachedSessions) {
      const t = new Date(s.startsAt).getTime();
      if (t < minTs) minTs = t;
    }
    return (Date.now() - minTs) / (1000 * 60 * 60 * 24 * 30.44);
  }, [allCachedSessions]);

  // Auto-correct period if it exceeds available data
  useEffect(() => {
    if (availableMonths === null) return;
    const opt = PERIOD_OPTIONS.find(o => o.value === period);
    if (!opt || opt.months === null || opt.months <= availableMonths) return;
    const valid = PERIOD_OPTIONS.filter(o => o.months !== null && o.months <= availableMonths);
    setPeriod(valid.length > 0 ? valid[valid.length - 1].value : 'all');
  }, [availableMonths, period]);

  // ── Period-filtered data ─────────────────────────────────────────────────
  const periodRange = useMemo(() => getPeriodRange(period), [period]);

  const periodFilteredSessions = useMemo(() => {
    if (period === 'all') return allCachedSessions;
    return allCachedSessions.filter(s => new Date(s.startsAt) >= periodRange.from);
  }, [allCachedSessions, period, periodRange.from]);

  const sessionTypes = useMemo(() => {
    const names = new Set(periodFilteredSessions.map(s => s.sessionName).filter(Boolean));
    return Array.from(names).sort();
  }, [periodFilteredSessions]);

  const filteredSessions = useMemo(() => {
    if (selectedTypes.size === 0) return periodFilteredSessions;
    return periodFilteredSessions.filter(s => selectedTypes.has(s.sessionName));
  }, [periodFilteredSessions, selectedTypes]);

  const filteredMonthlyData = useMemo(() => {
    if (period === 'all') return allVenueMonthlyData;
    return allVenueMonthlyData.filter(m => {
      const monthDate = new Date(`${m.month} 1, ${m.year}`);
      return monthDate >= periodRange.from;
    });
  }, [allVenueMonthlyData, period, periodRange.from]);

  const benchmarkMetrics = useMemo(() => {
    const activeSessions = filteredSessions.filter(s => s.ticketsSold > 0);
    if (activeSessions.length === 0) return null;
    const sorted = [...activeSessions].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    return calculateBenchmarkMetrics(
      activeSessions,
      sorted[0].startsAt,
      sorted[sorted.length - 1].startsAt,
      undefined,
      apiVenueConfig?.timezone,
    );
  }, [filteredSessions, apiVenueConfig?.timezone]);

  // Derive label from the actual computation window (first → last active session),
  // not the filter range, so any reader can independently verify the displayed rates.
  const dateRangeLabel = benchmarkMetrics
    ? formatComputedRange(benchmarkMetrics.computedFrom, benchmarkMetrics.computedTo)
    : '';

  // ── Empty states ─────────────────────────────────────────────────────────
  if (!entry) {
    return (
      <main className="page-container">
        {/* <h1 className="text-4xl font-bold tracking-tight">Report</h1>
        <p className="text-base leading-relaxed">No cached venue found for this URL.</p>
        <p className="text-sm text-muted-foreground">Start by fetching a venue on the home screen.</p>
        <div className="mt-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back</Link>
          </Button>
        </div> */}
      </main>
    );
  }

  if (!benchmarkMetrics) {
    return (
      <main className="page-container">
        <h1 className="text-4xl font-bold tracking-tight">Report</h1>
        <p className="text-base leading-relaxed">No active sessions in this dataset.</p>
        <div className="mt-6">
          <Button asChild variant="ghost" size="icon" className="cursor-pointer hover:opacity-70 py-1.5 px-1.5 shadow-2 bg-background rounded-md">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  const venueName = entry.hostInfo?.name ?? entry.venueName;
  const venueAddress = placeInfo?.address ?? placeInfo?.suburb ?? apiVenueConfig?.location ?? null;

  return (
    <div className="min-h-screen">

      {/* ── Fixed header bar — Visitors style ── */}
      <header className="sticky top-0 z-10 backdrop-blur border-border print:hidden">
        <div className="mx-auto px-5 py-4 flex items-center justify-between">

          {/* Left: back + venue identity */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="cursor-pointer hover:opacity-70 py-1.5 px-1.5 shadow-2 bg-background rounded-md"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-foreground leading-none block">
                {venueName}
              </p>
            </div>
          </div>

          {/* Right: sync status + export CTA */}
          <div className="flex items-center gap-2 shrink-0">
            {entry.cachedAt && (
              <span className="text-sm text-muted-foreground hidden sm:block">
                {formatRelativeTime(entry.cachedAt)}
              </span>
            )}
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncInProgress}
              className="p-1.5 rounded-md cursor-pointer text-muted-foreground hover:text-foreground bg-background shadow-2 transition-colors disabled:opacity-40"
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncInProgress ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </div>
      </header>

      {/* Print-only header */}
      <div className="hidden print:block px-8 pt-6 pb-2">
        <p className="text-sm text-muted-foreground uppercase tracking-widest">
          Capacity Report
        </p>
        <h1 className="text-xl font-semibold mt-1">{venueName}</h1>
        {venueAddress && <p className="text-sm text-muted-foreground">{venueAddress}</p>}
        <p className="text-sm text-muted-foreground mt-1">{dateRangeLabel}</p>
      </div>

      {/* ── Page body ── */}
      <div className="max-w-[760px] mx-auto px-4 pt-5 pb-12 sm:px-5 sm:pt-12 space-y-5">

        {/* ── Filter row ── */}
        <div className="grid sm:grid-cols-2 gap-3 items-center justify-center grid-cols-1">
          <div className="flex flex-col sm:flex-row sm:gap-3 gap-2 w-full">

            <PeriodSelector
              value={period}
              onChange={(p) => { setPeriod(p); setSelectedTypes(new Set()); }}
              availableMonths={availableMonths}
              className="bg-background rounded-2xl shadow-2 flex gap-2 cursor-pointer items-center justify-between px-3.5 py-2 text-base font-medium text-foreground transition-colors hover:bg-gray-2 hover:shadow-1 border-0 h-auto whitespace-nowrap shrink-0"
            />

            {sessionTypes.length > 1 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="bg-background rounded-2xl shadow-2 flex gap-2 cursor-pointer items-center justify-between px-3.5 py-2 text-base font-medium text-foreground transition-colors hover:bg-gray-2 hover:shadow-1 border-0 h-auto whitespace-nowrap shrink-0"
                  >
                    <span className="truncate overflow-hidden w-full text-left">
                    {selectedTypes.size === 0
                      ? 'All sessions'
                      : selectedTypes.size === 1
                        ? [...selectedTypes][0]
                        : `${selectedTypes.size} session types`}
                    </span>
                    <ChevronsUpDown className="h-4.5 w-4.5 opacity-50" />
                  </button>
                </PopoverTrigger>
                
                <PopoverContent align="start" sideOffset={6} className="bg-background p-1.5 rounded-2xl shadow-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTypes(new Set())}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-sm transition-colors bg-background hover:bg-muted',
                      selectedTypes.size === 0 ? 'font-medium' : 'text-muted-foreground',
                    )}
                  >
                    <span className="flex items-center justify-center">
                      {selectedTypes.size === 0 && <Check className="h-4 w-4" />}
                    </span>
                    <span className="text-base font-medium">
                      All sessions
                    </span>
                  </button>
                  <div className="my-1 h-px bg-border" />
                  {sessionTypes.map(t => {
                    const checked = selectedTypes.has(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setSelectedTypes(prev => {
                            const next = new Set(prev);
                            checked ? next.delete(t) : next.add(t);
                            return next;
                          });
                        }}
                        className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-base transition-colors hover:bg-muted"
                      >
                        {checked &&
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                            <Check className="h-full w-full" />
                          </span>
                        }
                        <span className="truncate">{t}</span>
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
            )}
          </div>
          <span className="text-base font-medium sm:block ml-auto sm:text-right w-full text-center">{dateRangeLabel}</span>
        </div>

        {/* ── Report sections ── */}
        <ReportSections
          sessions={filteredSessions}
          metrics={benchmarkMetrics}
          monthlyData={filteredMonthlyData}
          allMonthlyData={allVenueMonthlyData}
          period={period}
        />

      </div>
    </div>
  );
}
