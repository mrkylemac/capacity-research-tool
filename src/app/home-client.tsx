"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, subYears } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useSessions } from '@/hooks/useSessions';
import { VENUES, GLOFOX_CONFIG, MARIANATEK_CONFIG, type Platform } from '@/config/api';
import {
  getRecentSearches,
  getCacheKey,
  getCachedEntry,
  setCachedEntry,
  type CachedVenueEntry,
} from '@/lib/venueCache';
import { glofoxClient } from '@/lib/glofoxClient';
import { fetchMarianaTekSessions } from '@/lib/marianatekClient';
import { RecentSearches } from '@/components/RecentSearches';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { MomenceSession } from '@/types/momence';

// Fetch all data from 2 years back so the report period selector has full coverage
const DATA_WINDOW_YEARS = 2;

function getDateWindow(): { from: Date; to: Date; fromStr: string; toStr: string } {
  const to = new Date();
  const from = subYears(to, DATA_WINDOW_YEARS);
  return {
    from,
    to,
    fromStr: format(from, 'yyyy-MM-dd'),
    toStr: format(to, 'yyyy-MM-dd'),
  };
}

// ── Main component ──────────────────────────────────────────────

export function HomeClient() {
  const router = useRouter();
  const hook = useSessions();
  const { allSessions, metrics, monthlyData, venueConfig, hostInfo, isLoading, fetchingCount } = hook;

  const [selectedVenueId, setSelectedVenueId] = useState(VENUES[0]?.id ?? '');
  const [loadingVenueId, setLoadingVenueId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<CachedVenueEntry[]>([]);

  // Glofox / MarianaTek loading state
  const [glofoxLoading, setGlofoxLoading] = useState(false);
  const [marianatekLoading, setMarianatekLoading] = useState(false);
  const [activePlatform, setActivePlatform] = useState<Platform>('momence');

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Once a Momence fetch completes → cache and navigate
  useEffect(() => {
    if (!loadingVenueId || activePlatform !== 'momence' || isLoading) return;

    if (allSessions.length === 0) {
      setFetchError('No sessions found for this venue.');
      setLoadingVenueId(null);
      return;
    }

    const { fromStr, toStr } = getDateWindow();
    const venueName =
      VENUES.find(v => v.id === loadingVenueId)?.name ||
      hostInfo?.name ||
      `Host ${loadingVenueId}`;

    const entry = setCachedEntry({
      hostId: loadingVenueId,
      platform: 'momence',
      venueName,
      dateRange: { from: fromStr, to: toStr },
      sessions: allSessions,
      metrics,
      monthlyData,
      venueConfig,
      hostInfo,
    });

    setRecentSearches(getRecentSearches());
    router.push(`/report?hostId=${entry.hostId}&from=${fromStr}&to=${toStr}&platform=momence`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingVenueId, activePlatform, isLoading, allSessions.length]);

  async function handleFetch() {
    if (!selectedVenueId || loadingVenueId || glofoxLoading || marianatekLoading) return;
    setFetchError(null);

    const venue = VENUES.find(v => v.id === selectedVenueId);
    const platform: Platform = venue?.platform ?? 'momence';
    const { from, to, fromStr, toStr } = getDateWindow();

    // Hit the cache first
    const key = getCacheKey(selectedVenueId, platform, fromStr, toStr);
    const cached = getCachedEntry(key);
    if (cached) {
      router.push(`/report?hostId=${selectedVenueId}&from=${fromStr}&to=${toStr}&platform=${platform}`);
      return;
    }

    setActivePlatform(platform);
    setLoadingVenueId(selectedVenueId);

    if (platform === 'glofox') {
      setGlofoxLoading(true);
      try {
        const config = GLOFOX_CONFIG.loreBathingClub;
        // Fetch from venue opening date to today
        const glofoxFrom = new Date(config.operatingSince);
        const sessions = await glofoxClient.fetchSessions({
          startDate: glofoxFrom,
          endDate: to,
          token: config.token,
          branchId: config.branchId,
          timezone: config.timezone,
        });

        if (sessions.length === 0) {
          setFetchError('No sessions found for this venue.');
          setLoadingVenueId(null);
          return;
        }

        const venueName = venue?.name ?? 'Lore Bathing Club';
        const entry = setCachedEntry({
          hostId: selectedVenueId,
          platform: 'glofox',
          venueName,
          dateRange: { from: fromStr, to: toStr },
          sessions: sessions as MomenceSession[],
          metrics: null,
          monthlyData: [],
          venueConfig: null,
          hostInfo: { id: 0, name: venueName, currency: 'usd', countryCode: 'US', timeZone: config.timezone, industry: 'Wellness', profileImage: null },
        });
        setRecentSearches(getRecentSearches());
        router.push(`/report?hostId=${entry.hostId}&from=${fromStr}&to=${toStr}&platform=glofox`);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to fetch Glofox data.');
        setLoadingVenueId(null);
      } finally {
        setGlofoxLoading(false);
      }
      return;
    }

    if (platform === 'marianatek') {
      setMarianatekLoading(true);
      try {
        const configKey = selectedVenueId === 'aerth' ? 'aerthSaunas' : 'projectMood';
        const config = MARIANATEK_CONFIG[configKey];

        const sessions = await fetchMarianaTekSessions({
          baseUrl: config.baseUrl,
          locationId: config.locationId,
          regionId: config.regionId,
          fromDate: fromStr,
          toDate: toStr,
          venueName: config.name,
          classTypeFilter: config.classTypeFilter,
        });

        if (sessions.length === 0) {
          setFetchError('No sessions found for this venue.');
          setLoadingVenueId(null);
          return;
        }

        const venueName = venue?.name ?? config.name;
        const entry = setCachedEntry({
          hostId: selectedVenueId,
          platform: 'marianatek',
          venueName,
          dateRange: { from: fromStr, to: toStr },
          sessions,
          metrics: null,
          monthlyData: [],
          venueConfig: null,
          hostInfo: { id: 0, name: venueName, currency: 'aud', countryCode: 'AU', timeZone: config.timezone, industry: 'Wellness', profileImage: null },
        });
        setRecentSearches(getRecentSearches());
        router.push(`/report?hostId=${entry.hostId}&from=${fromStr}&to=${toStr}&platform=marianatek`);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Failed to fetch Mariana Tek data.');
        setLoadingVenueId(null);
      } finally {
        setMarianatekLoading(false);
      }
      return;
    }

    // Momence — fetch a 2-year window; the hook fetches all pages anyway
    await hook.fetchData({
      hostId: selectedVenueId,
      startsAtFrom: from.toISOString(),
      startsAtTo: to.toISOString(),
    });
  }

  function handleSelectCached(entry: CachedVenueEntry) {
    router.push(
      `/report?hostId=${entry.hostId}&from=${entry.dateRange.from}&to=${entry.dateRange.to}&platform=${entry.platform}`,
    );
  }

  const isLoadingNow =
    (loadingVenueId !== null && isLoading) ||
    glofoxLoading ||
    marianatekLoading;

  const loadingLabel = glofoxLoading || marianatekLoading
    ? 'Loading…'
    : fetchingCount > 0
    ? `${fetchingCount.toLocaleString()} sessions…`
    : 'Loading…';

  return (
    <main className="min-h-screen">
      <div className="page-container">

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Capacity Report</h1>
        </div>

        {/* ── Query bar ── */}
        <div className="flex flex-col sm:flex-row sm:gap-3 mb-8 gap-4">
          <Select value={selectedVenueId} onValueChange={setSelectedVenueId}>
            <SelectTrigger className="h-10 w-full rounded-2xl shadow-2 border-0 cursor-pointer focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="Select venue" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-2">
              {VENUES.map(v => (
                <SelectItem key={v.id} value={v.id} className="cursor-pointer hover:opacity-80 transition-opacity">
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleFetch}
            disabled={isLoadingNow || !selectedVenueId}
            className="h-10 w-full sm:w-auto sm:ml-auto px-6 bg-black text-white rounded-2xl border-0 shadow-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            {isLoadingNow ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                {loadingLabel}
              </>
            ) : (
              'Search'
            )}
          </Button>
        </div>

        {fetchError && (
          <p className="mb-6 text-base text-destructive">{fetchError}</p>
        )}

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
