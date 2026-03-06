"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronRight, ChevronsUpDown, RefreshCw } from 'lucide-react';
import { ReportSections } from '@/components/ReportSections';
import { ReportSkeleton, ReportCardsSkeleton } from '@/components/ReportSkeleton';
import { DinoLoader } from '@/components/DinoLoader';
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

/**
 * Normalise session names so near-duplicates collapse into a single filter option.
 * Handles weekday/weekend qualifiers, inconsistent minute formats, trailing whitespace,
 * vinyl-set / time-of-day suffixes, and common prefix groupings.
 */
function normalizeSessionName(raw: string): string {
  let n = raw.trim();

  // ── Strip scheduling noise ──────────────────────────────────────────────
  // Remove (Weekday), (Weekend), (Weekday - Dry Only), etc.
  n = n.replace(/\s*\((?:Weekday|Weekend)(?:\s*-\s*[^)]+)?\)\s*/gi, ' ');
  // Remove trailing "- Weekday" / "- Weekend"
  n = n.replace(/\s*[-–]\s*(?:Weekday|Weekend)\s*$/i, '');

  // ── Strip vinyl set / live music / time-of-day suffixes ─────────────────
  // "(with Live Vinyl Set)", "with Live Vinyl Set until 4.30pm", etc.
  n = n.replace(/\s*\(with\s+live\s+vinyl\s+set\)\s*/i, '');
  n = n.replace(/[:\s]*(?:with\s+)?live\s+vinyl\s+set\b[^)]*$/i, '');
  // "Session starts 3pm with Live Vinyl Set until 3.30pm"
  n = n.replace(/[:\s]*session\s+starts\s+\d{1,2}(?::\d{2})?\s*[ap]m\b.*$/i, '');
  // "powered by Lululemon (AEST)" and similar promo tails
  n = n.replace(/\s+powered\s+by\s+.+$/i, '');
  // "Tickets available through humanitix (AEST)"
  n = n.replace(/\s*[-–]?\s*tickets?\s+available\b.*$/i, '');

  // ── Fix broken parentheses ──────────────────────────────────────────────
  // "Open Sauna & Plunge (Non Guided" → add closing paren
  if (/\([^)]*$/.test(n)) n += ')';
  // Remove stray trailing paren not preceded by an opening paren, e.g. "Access)"
  n = n.replace(/^([^(]*)\)/, '$1');

  // ── Normalise minute labels: "45 Minute" → "45-min" ────────────────────
  n = n.replace(/(\d+)[\s-]+(?:minutes?|min)\b/gi, '$1-min');

  // ── Collapse multiple spaces / trailing junk ────────────────────────────
  n = n.replace(/\s{2,}/g, ' ').replace(/[\s\-:]+$/, '');

  // ── Group well-known prefix families ────────────────────────────────────
  if (/^Wom[ae]n-Only/i.test(n)) return 'Women-Only';
  if (/^EQ First Birthday/i.test(n)) return 'EQ First Birthday';
  if (/^Fire & Ice/i.test(n)) return 'Fire & Ice';
  if (/^Post-Race Recovery/i.test(n)) return 'Post-Race Recovery';
  if (/^Influencer/i.test(n)) return 'Influencer Session';

  // ── Collapse "Class Only | X" into "X | Class+" ────────────────────────
  const classOnlyMatch = n.match(/^class\s+only\s*\|\s*(.+)$/i);
  if (classOnlyMatch) return `${classOnlyMatch[1].trim()} | Class+`;

  // ── Skip non-session entries ────────────────────────────────────────────
  if (/^studio\s+closed$/i.test(n)) return '';

  return n;
}

/** Names the normalizer returns as empty — excluded from filter lists and data. */
function isExcludedSession(normalizedName: string): boolean {
  return normalizedName === '';
}

/** Patterns that identify core bathing sessions — everything else is a "class". */
const BATHING_PATTERNS = /\b(bathhouse|social bathing|sauna|plunge)\b/i;

function isClassSession(normalizedName: string): boolean {
  return !BATHING_PATTERNS.test(normalizedName);
}

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
  platform,
}: {
  hostId: string | null;
  platform: CachedVenueEntry['platform'] | null;
}): CachedVenueEntry | null {
  if (hostId && platform) {
    const key = getCacheKey(hostId, platform);
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

// ── Session count ticker (lightweight number animation, no deps) ─────────────

function SessionTicker({ count }: { count: number }) {
  const [displayed, setDisplayed] = useState(0);
  const displayedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (count <= displayedRef.current) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const target = count;
    const STEP = 10;
    const diff = target - displayedRef.current;
    const frames = Math.max(10, Math.ceil(diff / STEP));
    const delay = Math.max(16, Math.round(300 / frames));

    timerRef.current = setInterval(() => {
      const next = displayedRef.current + STEP;
      if (next >= target) {
        displayedRef.current = target;
        setDisplayed(target);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        displayedRef.current = next;
        setDisplayed(next);
      }
    }, delay);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count]);

  return <>{displayed.toLocaleString()}</>;
}

// ── Streaming fetch helper for non-Momence venues ───────────────────────────

/**
 * Fetch venue data via the streaming NDJSON endpoint.
 * Calls `onProgress` with session counts as they arrive.
 */
async function fetchVenueWithProgress(
  hostId: string,
  platform: string,
  onProgress?: (count: number) => void,
): Promise<void> {
  const res = await fetch('/api/fetch-venue', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hostId, platform }),
  });

  // Non-200 responses are regular JSON error responses (validation / token expired)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  // Read NDJSON stream for progress events
  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;
    for (const line of lines) {
      if (!line.trim()) continue;
      const msg = JSON.parse(line);
      if (msg.type === 'progress') onProgress?.(msg.sessionCount);
      if (msg.type === 'error') throw new Error(msg.error);
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    const msg = JSON.parse(buffer);
    if (msg.type === 'error') throw new Error(msg.error);
  }
}

// ── Non-Momence no-data state (glofox / marianatek) ─────────────────────────────

interface NonMomenceNoDataProps {
  hostId: string;
  platform: CachedVenueEntry['platform'];
  onFetched: (data: CachedVenueEntry) => void;
}

function NonMomenceNoData({ hostId, platform, onFetched }: NonMomenceNoDataProps) {
  const [isFetching, setIsFetching] = useState(false);
  const [fetchingCount, setFetchingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = useCallback(async () => {
    setIsFetching(true);
    setFetchingCount(0);
    setError(null);
    try {
      await fetchVenueWithProgress(hostId, platform, setFetchingCount);

      const cacheRes = await fetch(`/api/venue-data?hostId=${hostId}&platform=${platform}`);
      if (!cacheRes.ok) throw new Error('Failed to load cached data');
      const fresh: CachedVenueEntry = await cacheRes.json();
      onFetched(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsFetching(false);
    }
  }, [hostId, platform, onFetched]);

  const platformLabel = platform === 'glofox' ? 'Glofox' : 'Mariana Tek';
  const venueLabel = VENUES.find(v => v.id === hostId)?.name?.split(',')[0] ?? 'this venue';

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 gap-8">

      <DinoLoader />

      {isFetching && fetchingCount > 0 && (
        <div className="text-center">
          <div className="text-5xl font-semibold tabular-nums tracking-tight text-foreground">
            <SessionTicker count={fetchingCount} />
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">sessions retrieved</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleFetch}
        disabled={isFetching}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-background shadow-2 font-medium text-foreground hover:bg-gray-2 disabled:opacity-50 transition-colors ${isFetching ? '' : 'loading-pulse'}`}
      >
        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        {isFetching ? 'Fetching…' : 'Fetch data'}
      </button>

      {error && (
        <p className="text-sm text-destructive text-center max-w-md">{error}</p>
      )}
    </div>
  );
}

// ── Main client ───────────────────────────────────────────────────────────────

export function ReportClient() {
  const [entry, setEntry] = useState<CachedVenueEntry | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<CachedVenueEntry['platform']>('momence');
  const [period, setPeriod] = useState<PeriodOption>('all');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [classesExpanded, setClassesExpanded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isSyncInProgress, setIsSyncInProgress] = useState(false);
  const [nonMomenceFetchCount, setNonMomenceFetchCount] = useState(0);
  const [entryLoadAttempted, setEntryLoadAttempted] = useState(false);
  const [isTransitioning, startTransition] = useTransition();
  const syncStarted = useRef(false);
  const autoFetchStarted = useRef(false);

  // Hook for live re-fetching
  const syncHook = useSessions();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const hId = sp.get('hostId');
    const plat = (sp.get('platform') as CachedVenueEntry['platform'] | null) ?? 'momence';
    setHostId(hId);
    setPlatform(plat);
    const found = pickEntry({ hostId: hId, platform: plat });
    if (found) {
      setEntry(found);
      setEntryLoadAttempted(true);
      return;
    }
    if (!hId || !plat) {
      setEntryLoadAttempted(true);
      return;
    }
    // Fall back to server-side JSON file if not in localStorage
    fetch(`/api/venue-data?hostId=${hId}&platform=${plat}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: CachedVenueEntry | null) => {
        if (data) {
          setCachedEntry(data);
          setEntry(data);
        }
      })
      .catch(() => {})
      .finally(() => setEntryLoadAttempted(true));
  }, []);

  // ── Re-fetch / Sync ──────────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    if (!hostId || !entry || isSyncInProgress) return;

    if (platform !== 'momence') {
      // Non-Momence venues: re-fetch via server-side route with streaming progress
      setIsSyncInProgress(true);
      setNonMomenceFetchCount(0);
      try {
        await fetchVenueWithProgress(hostId, platform, setNonMomenceFetchCount);
        const cacheRes = await fetch(`/api/venue-data?hostId=${hostId}&platform=${platform}`);
        if (cacheRes.ok) {
          const fresh: CachedVenueEntry = await cacheRes.json();
          setCachedEntry(fresh);
          setEntry(fresh);
        }
      } catch {
        // swallow — spinner will stop
      } finally {
        setIsSyncInProgress(false);
      }
      return;
    }

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
  }, [hostId, entry, isSyncInProgress, platform, syncHook]);

  // When sync or auto-fetch completes, persist fresh data and update local state
  useEffect(() => {
    const isActive = syncStarted.current || autoFetchStarted.current;
    if (!isActive || syncHook.isLoading) return;
    if (!hostId) return;

    if (syncHook.allSessions.length > 0) {
      const dateRange = entry?.dateRange ?? {
        from: syncHook.dataRange.from?.toISOString() ?? new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(),
        to: syncHook.dataRange.to?.toISOString() ?? new Date().toISOString(),
      };
      const venueName = syncHook.hostInfo?.name ?? entry?.venueName ?? VENUES.find(v => v.id === hostId)?.name ?? hostId;
      const saved = setCachedEntry({
        hostId,
        platform: entry?.platform ?? platform,
        venueName,
        dateRange,
        sessions: syncHook.allSessions,
        metrics: syncHook.metrics,
        monthlyData: syncHook.monthlyData,
        venueConfig: syncHook.venueConfig,
        hostInfo: syncHook.hostInfo,
      });
      setEntry(saved);
      // Persist to server-side JSON file
      fetch('/api/venue-data', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ entry: saved }),
      }).catch(() => {/* fire-and-forget */});
    }

    setIsSyncInProgress(false);
    syncStarted.current = false;
    autoFetchStarted.current = false;
  }, [syncHook.isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch live data when no cached entry is found after the initial resolution attempt.
  // Only supported for Momence — glofox/marianatek venues require a pre-built cache file.
  useEffect(() => {
    if (!entryLoadAttempted || !hostId || entry || autoFetchStarted.current || isSyncInProgress) return;
    if (platform !== 'momence') return;
    autoFetchStarted.current = true;
    setIsSyncInProgress(true);
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 2);
    syncHook.fetchData({
      hostId,
      startsAtFrom: from.toISOString(),
      startsAtTo: to.toISOString(),
    }).catch(() => {
      setIsSyncInProgress(false);
      autoFetchStarted.current = false;
    });
  }, [entryLoadAttempted, hostId, entry, isSyncInProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Venue info from Google Maps ──────────────────────────────────────────
  const apiVenueConfig = VENUES.find(v => v.id === (hostId ?? entry?.hostId));
  const { info: placeInfo } = useVenueInfo(apiVenueConfig?.mapsQuery);

  // ── All-time data: merge every cached search for this venue ─────────────
  const allCachedSessions = useMemo<MomenceSession[]>(() => {
    if (!entry?.hostId) return entry?.sessions ?? [];
    const searches = getRecentSearches().filter(s => s.hostId === entry.hostId);
    // Fall back to the in-memory entry when localStorage is empty (e.g. quota exceeded)
    if (searches.length === 0) return entry?.sessions ?? [];
    const seen = new Set<string>();
    const result: MomenceSession[] = [];
    searches.forEach(search => {
      search.sessions.forEach(s => {
        if (!seen.has(s.id)) { seen.add(s.id); result.push(s); }
      });
    });
    return result;
  }, [entry?.hostId, entry?.sessions]);

  // Pre-compute normalised names once — avoids running regex chains on 18K+ sessions
  // repeatedly across allSessionTypes / sessionTypes / filteredSessions / benchmarkMetrics.
  const normalizedNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allCachedSessions) {
      if (!map.has(s.id)) map.set(s.id, normalizeSessionName(s.sessionName));
    }
    return map;
  }, [allCachedSessions]);

  /** Fast lookup — uses the pre-computed map, falls back to live normalisation. */
  const getNorm = useCallback(
    (s: MomenceSession) => normalizedNameMap.get(s.id) ?? normalizeSessionName(s.sessionName),
    [normalizedNameMap],
  );

  const allVenueMonthlyData = useMemo<MonthlyData[]>(() => {
    if (!entry?.hostId) return entry?.monthlyData ?? [];
    const searches = getRecentSearches().filter(s => s.hostId === entry.hostId);
    // Fall back to the in-memory entry when localStorage is empty (e.g. quota exceeded)
    if (searches.length === 0) return entry?.monthlyData ?? [];
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
    const fromMs = periodRange.from.getTime();
    const toMs = periodRange.to.getTime();
    return allCachedSessions.filter(s => {
      const ts = new Date(s.startsAt).getTime();
      return ts >= fromMs && ts <= toMs;
    });
  }, [allCachedSessions, period, periodRange]);

  // ── Location filter (for multi-location venues like Portal) ──────────────
  const allLocations = useMemo(() => {
    const locs = new Set(allCachedSessions.map(s => s.location).filter(Boolean));
    return Array.from(locs).sort();
  }, [allCachedSessions]);

  const hasMultipleLocations = allLocations.length > 1;

  // Auto-select the location with the most sessions as default,
  // or reset if the selected location is no longer in the data.
  useEffect(() => {
    if (!hasMultipleLocations) return;
    if (selectedLocation !== null && allLocations.includes(selectedLocation)) return;
    const counts = new Map<string, number>();
    allCachedSessions.forEach(s => {
      if (s.location) counts.set(s.location, (counts.get(s.location) ?? 0) + 1);
    });
    let best = allLocations[0];
    let bestCount = 0;
    counts.forEach((count, loc) => {
      if (count > bestCount) { best = loc; bestCount = count; }
    });
    setSelectedLocation(best);
  }, [hasMultipleLocations, selectedLocation, allLocations, allCachedSessions]);

  const locationFilteredSessions = useMemo(() => {
    if (!hasMultipleLocations || !selectedLocation) return periodFilteredSessions;
    return periodFilteredSessions.filter(s => s.location === selectedLocation);
  }, [periodFilteredSessions, selectedLocation, hasMultipleLocations]);

  // All-time session types (normalised, used to keep the filter visible across period changes).
  // Scoped to the selected location so multi-location venues only show relevant session types.
  const allSessionTypes = useMemo(() => {
    const source = hasMultipleLocations && selectedLocation
      ? allCachedSessions.filter(s => s.location === selectedLocation)
      : allCachedSessions;
    const names = new Set(source.map(s => getNorm(s)).filter(Boolean));
    return Array.from(names).sort();
  }, [allCachedSessions, hasMultipleLocations, selectedLocation, getNorm]);

  // Period-scoped session types (normalised, used as dropdown options).
  const sessionTypes = useMemo(() => {
    const names = new Set(locationFilteredSessions.map(s => getNorm(s)).filter(Boolean));
    return Array.from(names).sort();
  }, [locationFilteredSessions, getNorm]);

  const filteredSessions = useMemo(() => {
    if (selectedTypes.size === 0) {
      // Exclude sessions with empty normalized names (e.g. "STUDIO CLOSED")
      return locationFilteredSessions.filter(s => getNorm(s) !== '');
    }
    return locationFilteredSessions.filter(s => selectedTypes.has(getNorm(s)));
  }, [locationFilteredSessions, selectedTypes, getNorm]);

  const filteredMonthlyData = useMemo(() => {
    if (period === 'all') return allVenueMonthlyData;
    return allVenueMonthlyData.filter(m => {
      const monthDate = new Date(`${m.month} 1, ${m.year}`);
      return monthDate >= periodRange.from && monthDate <= periodRange.to;
    });
  }, [allVenueMonthlyData, period, periodRange]);

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

  // Periods that have no active sessions — disable in the selector to prevent empty reports.
  // Only check short periods (today, yesterday, 1w) since longer ones almost always have data.
  const disabledPeriods = useMemo<Set<PeriodOption>>(() => {
    const shortPeriods: PeriodOption[] = ['today', 'yesterday', '1w'];
    const disabled = new Set<PeriodOption>();
    shortPeriods.forEach(p => {
      const range = getPeriodRange(p);
      const fromMs = range.from.getTime();
      const toMs = range.to.getTime();
      const hasActive = allCachedSessions.some(s => {
        const ts = new Date(s.startsAt).getTime();
        return ts >= fromMs && ts <= toMs && s.ticketsSold > 0;
      });
      if (!hasActive) disabled.add(p);
    });
    return disabled;
  }, [allCachedSessions]);

  // ── Empty / loading states ────────────────────────────────────────────────
  if (!entry) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 print:hidden">
          <div className="mx-auto px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/"
                className="cursor-pointer hover:opacity-70 py-1.5 px-1.5 shadow-2 bg-background rounded-md"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <p className="text-lg font-semibold text-foreground leading-none text-shimmer">
                {apiVenueConfig?.name?.split(',')[0] ?? 'Loading…'}
              </p>
            </div>
            {isSyncInProgress && (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </header>
        {isSyncInProgress ? (
          <div className="max-w-[760px] mx-auto px-4 pt-5 pb-12 sm:px-5 sm:pt-12">
            <ReportSkeleton />
          </div>
        ) : platform !== 'momence' ? (
          <NonMomenceNoData
            hostId={hostId ?? ''}
            platform={platform}
            onFetched={(data) => {
              setCachedEntry(data);
              setEntry(data);
            }}
          />
        ) : null}
      </div>
    );
  }

  const venueName = apiVenueConfig?.name?.split(',')[0] ?? entry.hostInfo?.name ?? entry.venueName;
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
            <span className="text-sm text-muted-foreground hidden sm:block">
              {isSyncInProgress ? 'Fetching session data…' : entry.cachedAt ? formatRelativeTime(entry.cachedAt) : ''}
            </span>
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

        {isSyncInProgress ? (
          <ReportSkeleton />
        ) : <>

        {/* ── Filter row ── */}
        <div className="grid sm:grid-cols-2 gap-3 items-center justify-center grid-cols-1">
          <div className="flex flex-col sm:flex-row sm:gap-3 gap-2 w-full">

            <PeriodSelector
              value={period}
              onChange={(p) => { startTransition(() => { setPeriod(p); setSelectedTypes(new Set()); }); }}
              availableMonths={availableMonths}
              disabledValues={disabledPeriods}
              className="bg-background rounded-2xl shadow-2 flex gap-2 cursor-pointer items-center justify-between px-3.5 py-2 text-base font-medium text-foreground transition-colors hover:bg-gray-2 hover:shadow-1 border-0 h-auto whitespace-nowrap shrink-0"
            />

            {/* Location filter — shown when venue has multiple locations (e.g. Portal) */}
            {hasMultipleLocations && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="bg-background rounded-2xl shadow-2 flex gap-2 cursor-pointer items-center justify-between px-3.5 py-2 text-base font-medium text-foreground transition-colors hover:bg-gray-2 hover:shadow-1 border-0 h-auto whitespace-nowrap shrink-0"
                  >
                    <span className="truncate overflow-hidden w-full text-left">
                      {selectedLocation ?? 'All locations'}
                    </span>
                    <ChevronsUpDown className="h-4.5 w-4.5 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" sideOffset={6} className="bg-background p-1.5 rounded-2xl shadow-2">
                  {allLocations.map(loc => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => { startTransition(() => { setSelectedLocation(loc); setSelectedTypes(new Set()); }); }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-base transition-colors hover:bg-muted',
                        selectedLocation === loc ? 'font-medium' : 'text-muted-foreground',
                      )}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {selectedLocation === loc && <Check className="h-full w-full" />}
                      </span>
                      <span className="truncate">{loc}</span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            )}

            {/* Session type filter — shown whenever the venue has multiple session types
                across all time, so it persists through narrow period selections. */}
            {allSessionTypes.length > 1 && (
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

                <PopoverContent align="start" sideOffset={6} className="bg-background p-1.5 rounded-2xl shadow-2 max-h-[70vh] overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => startTransition(() => setSelectedTypes(new Set()))}
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

                  {/* ── Bathing sessions (top-level) ── */}
                  {(() => {
                    const types = sessionTypes.length > 0 ? sessionTypes : allSessionTypes;
                    const bathingTypes = types.filter(t => !isClassSession(t));
                    const classTypes = types.filter(t => isClassSession(t));

                    return (
                      <>
                        {bathingTypes.map(t => {
                          const checked = selectedTypes.has(t);
                          const availableInPeriod = sessionTypes.includes(t);
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                if (!availableInPeriod) return;
                                startTransition(() => {
                                  setSelectedTypes(prev => {
                                    const next = new Set(prev);
                                    checked ? next.delete(t) : next.add(t);
                                    return next;
                                  });
                                });
                              }}
                              className={cn(
                                'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-base transition-colors hover:bg-muted',
                                !availableInPeriod && 'opacity-40 cursor-not-allowed hover:bg-transparent',
                              )}
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

                        {/* ── Classes sub-menu ── */}
                        {classTypes.length > 0 && (
                          <>
                            <div className="my-1 h-px bg-border" />
                            <button
                              type="button"
                              onClick={() => setClassesExpanded(prev => !prev)}
                              className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-muted"
                            >
                              <ChevronRight className={cn('h-4 w-4 transition-transform', classesExpanded && 'rotate-90')} />
                              <span>Classes & Events</span>
                              <span className="ml-auto text-xs text-muted-foreground">{classTypes.length}</span>
                            </button>
                            {classesExpanded && classTypes.map(t => {
                              const checked = selectedTypes.has(t);
                              const availableInPeriod = sessionTypes.includes(t);
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => {
                                    if (!availableInPeriod) return;
                                    startTransition(() => {
                                      setSelectedTypes(prev => {
                                        const next = new Set(prev);
                                        checked ? next.delete(t) : next.add(t);
                                        return next;
                                      });
                                    });
                                  }}
                                  className={cn(
                                    'flex w-full items-center gap-2 rounded-sm pl-7 pr-2.5 py-2 text-base transition-colors hover:bg-muted',
                                    !availableInPeriod && 'opacity-40 cursor-not-allowed hover:bg-transparent',
                                  )}
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
                          </>
                        )}
                      </>
                    );
                  })()}
                </PopoverContent>
              </Popover>
            )}
          </div>
          <span className="text-base font-medium sm:block ml-auto sm:text-right w-full text-center">{dateRangeLabel}</span>
        </div>

        {/* ── Report sections or period-empty state ── */}
        {isTransitioning ? (
          <ReportCardsSkeleton />
        ) : benchmarkMetrics ? (
          <ReportSections
            sessions={filteredSessions}
            metrics={benchmarkMetrics}
            monthlyData={filteredMonthlyData}
            allMonthlyData={allVenueMonthlyData}
            period={period}
            platform={platform}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-base font-medium text-foreground">No sessions found for this period</p>
            <p className="text-sm text-muted-foreground mt-1">Try selecting a wider time range above.</p>
          </div>
        )}

        </>}

      </div>
    </div>
  );
}
