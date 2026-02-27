"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { VenueHeader } from '@/components/VenueHeader';
import { PerformanceScorecard } from '@/components/PerformanceScorecard';
import { OperationalBlueprint } from '@/components/OperationalBlueprint';
import { SessionAnalysis } from '@/components/SessionAnalysis';
import { DemandIntelligence } from '@/components/DemandIntelligence';
import { GrowthStory } from '@/components/GrowthStory';
import { UtilisationTrend } from '@/components/UtilisationTrend';
import { CapacityUtilisation } from '@/components/CapacityUtilisation';
import { MonthlyTable } from '@/components/MonthlyTable';
import { calculateBenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { getCachedEntry, getCacheKey, getRecentSearches } from '@/lib/venueCache';
import { VENUES } from '@/config/api';
import { useVenueInfo } from '@/hooks/useVenueInfo';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  getPeriodRange,
  formatPeriodDateRange,
  inferPeriodFromDates,
  PERIOD_OPTIONS,
  type PeriodOption,
} from '@/components/ui/period-selector';
import type { CachedVenueEntry } from '@/lib/venueCache';
import type { MonthlyData, MomenceSession } from '@/types/momence';

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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
        {children}
      </h2>
      <Separator className="flex-1" />
    </div>
  );
}

export function ReportClient() {
  const [entry, setEntry] = useState<CachedVenueEntry | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodOption>('1m');

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
    if (from && to) setPeriod(inferPeriodFromDates(from, to));
  }, []);

  const apiVenueConfig = VENUES.find(v => v.id === (hostId ?? entry?.hostId));
  const { info: placeInfo } = useVenueInfo(apiVenueConfig?.mapsQuery);

  // --- All-time data: merge every cached search for this venue ---

  /** All sessions from all cache entries for this venue, deduplicated by id. */
  const allCachedSessions = useMemo<MomenceSession[]>(() => {
    if (!entry?.hostId) return entry?.sessions ?? [];
    const searches = getRecentSearches().filter(s => s.hostId === entry.hostId);
    const seen = new Set<string>();
    const result: MomenceSession[] = [];
    searches.forEach(search => {
      search.sessions.forEach(s => {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          result.push(s);
        }
      });
    });
    return result;
  }, [entry?.hostId, entry?.sessions]);

  /** All monthly data merged from every cached search (highest ticketsSold wins per month). */
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

  /** Opening date — earliest operatingSince across all cached searches. */
  const openingDate = useMemo(() => {
    if (!entry?.hostId) return entry?.metrics?.operatingSince ?? null;
    const searches = getRecentSearches().filter(s => s.hostId === entry.hostId);
    let earliest: string | null = null;
    searches.forEach(search => {
      const since = search.metrics?.operatingSince;
      if (!since || since === '-') return;
      if (!earliest) { earliest = since; return; }
      const a = new Date(earliest);
      const b = new Date(since);
      if (!isNaN(b.getTime()) && b < a) earliest = since;
    });
    return earliest ?? entry?.metrics?.operatingSince ?? null;
  }, [entry?.hostId, entry?.metrics?.operatingSince]);

  // --- Available data span ---

  /** Months of real data available, derived from the earliest session to today. */
  const availableMonths = useMemo<number | null>(() => {
    if (allCachedSessions.length === 0) return null;
    let minTs = Infinity;
    for (const s of allCachedSessions) {
      const t = new Date(s.startsAt).getTime();
      if (t < minTs) minTs = t;
    }
    return (Date.now() - minTs) / (1000 * 60 * 60 * 24 * 30.44);
  }, [allCachedSessions]);

  // Auto-correct period if it exceeds the available data span
  useEffect(() => {
    if (availableMonths === null) return;
    const opt = PERIOD_OPTIONS.find(o => o.value === period);
    if (!opt || opt.months === null || opt.months <= availableMonths) return;
    // Clamp to the largest valid months-based option, or 'all' as final fallback
    const valid = PERIOD_OPTIONS.filter(o => o.months !== null && o.months <= availableMonths);
    setPeriod(valid.length > 0 ? valid[valid.length - 1].value : 'all');
  }, [availableMonths, period]);

  // --- Period-filtered data ---

  const periodRange = useMemo(() => getPeriodRange(period), [period]);

  /** Sessions filtered to the selected period. */
  const filteredSessions = useMemo(() => {
    if (period === 'all') return allCachedSessions;
    return allCachedSessions.filter(s => new Date(s.startsAt) >= periodRange.from);
  }, [allCachedSessions, period, periodRange.from]);

  /** Monthly data filtered to the selected period. */
  const filteredMonthlyData = useMemo(() => {
    if (period === 'all') return allVenueMonthlyData;
    return allVenueMonthlyData.filter(m => {
      const monthDate = new Date(`${m.month} 1, ${m.year}`);
      return monthDate >= periodRange.from;
    });
  }, [allVenueMonthlyData, period, periodRange.from]);

  /** Benchmark metrics recomputed from the filtered session set. */
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

  /** Earliest session date within the filtered window (for accurate date-range label). */
  const actualFromDate = useMemo(() => {
    if (filteredSessions.length === 0) return undefined;
    const sorted = [...filteredSessions].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    return new Date(sorted[0].startsAt);
  }, [filteredSessions]);

  const dateRangeLabel = formatPeriodDateRange(periodRange, actualFromDate);

  if (!entry) {
    return (
      <main className="notion-page">
        <h1 className="notion-title">Report</h1>
        <p className="notion-text">No cached venue found for this URL.</p>
        <p className="notion-muted">
          Start by fetching a venue on the home screen (or open a report link with hostId/from/to).
        </p>
        <div className="mt-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (!benchmarkMetrics) {
    return (
      <main className="notion-page">
        <h1 className="notion-title">Report</h1>
        <p className="notion-text">No active sessions in this dataset.</p>
        <div className="mt-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back</Link>
          </Button>
        </div>
      </main>
    );
  }

  const locationOverride = placeInfo?.suburb ?? apiVenueConfig?.location ?? undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="notion-page">

        {/* X close / back button — top right */}
        <div className="flex justify-end mb-6">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href="/">
              <X className="h-5 w-5" />
            </Link>
          </Button>
        </div>

        <div className="space-y-10">
          <VenueHeader
            metrics={benchmarkMetrics}
            venueConfig={entry.venueConfig}
            hostInfo={entry.hostInfo}
            hostId={hostId ?? undefined}
            locationOverride={locationOverride}
            placeInfo={placeInfo}
            period={period}
            onPeriodChange={setPeriod}
            dateRangeLabel={dateRangeLabel}
            availableMonths={availableMonths}
          />

          {/* Performance */}
          <section>
            <SectionHeading>Performance</SectionHeading>
            <PerformanceScorecard metrics={benchmarkMetrics} />
          </section>

          {/* Operations */}
          {entry.venueConfig && (
            <section>
              <SectionHeading>Operations</SectionHeading>
              <div className="space-y-4">
                <OperationalBlueprint
                  metrics={benchmarkMetrics}
                  venueConfig={entry.venueConfig}
                />
                <SessionAnalysis
                  sessions={filteredSessions}
                  metrics={benchmarkMetrics}
                />
              </div>
            </section>
          )}

          {/* Visitors */}
          {filteredMonthlyData.length > 0 && (
            <section>
              <SectionHeading>Visitors</SectionHeading>
              <CapacityUtilisation
                metrics={benchmarkMetrics}
                monthlyData={filteredMonthlyData}
              />
            </section>
          )}

          {/* Demand */}
          {filteredSessions.length > 0 && (
            <section>
              <SectionHeading>Demand</SectionHeading>
              <DemandIntelligence sessions={filteredSessions} metrics={benchmarkMetrics} />
            </section>
          )}

          {/* Growth & Trajectory — always uses all-time data for trajectory value */}
          {allVenueMonthlyData.length >= 2 && (
            <section>
              <SectionHeading>Growth</SectionHeading>
              {openingDate && openingDate !== '-' && (
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  First session on record:{' '}
                  <span className="font-medium text-foreground">{openingDate}</span>
                  {allVenueMonthlyData.length !== entry.monthlyData.length && (
                    <span className="text-muted-foreground/60">
                      · using {allVenueMonthlyData.length} months from cache
                    </span>
                  )}
                </div>
              )}
              <div className="space-y-6">
                <GrowthStory monthlyData={allVenueMonthlyData} />
                <UtilisationTrend monthlyData={allVenueMonthlyData} />
              </div>
            </section>
          )}

          {/* Monthly breakdown table */}
          {filteredMonthlyData.length > 0 && (
            <section>
              <MonthlyTable data={filteredMonthlyData} sessions={filteredSessions} collapsible />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
