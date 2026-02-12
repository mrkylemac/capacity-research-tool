import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiltersPanel } from '@/components/FiltersPanel';
import { RecentSearches } from '@/components/RecentSearches';
import { DataStatus } from '@/components/DataStatus';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { useSessions } from '@/hooks/useSessions';
import { getRecentSearches, setCachedEntry, type CachedVenueEntry } from '@/lib/venueCache';
import { VENUES } from '@/config/api';
import { calculateMetrics, calculateMonthlyData, calculateVenueConfig } from '@/lib/metricsCalculator';
import { glofoxClient } from '@/lib/glofoxClient';
import { fetchMarianaTekSessions } from '@/lib/marianatekClient';
import { GLOFOX_CONFIG, MARIANATEK_CONFIG, type Platform } from '@/config/api';
import type { MomenceSession } from '@/types/momence';

const Index = () => {
  const navigate = useNavigate();
  const momenceHook = useSessions();
  const [recentSearches, setRecentSearches] = useState<CachedVenueEntry[]>(() => getRecentSearches());
  const [refreshingKey, setRefreshingKey] = useState<string | null>(null);
  const [lastLoadSource, setLastLoadSource] = useState<'fetch' | 'cache' | null>(null);

  // Glofox state (parallel to Momence hook)
  const [glofoxSessions, setGlofoxSessions] = useState<MomenceSession[]>([]);
  const [glofoxLoading, setGlofoxLoading] = useState(false);
  const [glofoxError, setGlofoxError] = useState<Error | null>(null);
  const [glofoxProgress, setGlofoxProgress] = useState({ sessionsFetched: 0, pagesLoaded: 0 });
  // Mariana Tek state
  const [marianatekSessions, setMarianatekSessions] = useState<MomenceSession[]>([]);
  const [marianatekLoading, setMarianatekLoading] = useState(false);
  const [marianatekError, setMarianatekError] = useState<Error | null>(null);
  const [marianatekProgress, setMarianatekProgress] = useState({ sessionsFetched: 0, pagesLoaded: 0 });
  const [activePlatform, setActivePlatform] = useState<Platform>('momence');
  const [currentHostId, setCurrentHostId] = useState('');
  const [hasQueried, setHasQueried] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const platformSessions = activePlatform === 'glofox' ? glofoxSessions : activePlatform === 'marianatek' ? marianatekSessions : momenceHook.allSessions;
  const allSessions = platformSessions;
  const totalPages = activePlatform === 'glofox' ? 1 : activePlatform === 'marianatek' ? 1 : momenceHook.totalPages;

  const isNonMomence = activePlatform === 'glofox' || activePlatform === 'marianatek';
  const derivedMetrics = useMemo(() => 
    isNonMomence && dateRange.from && dateRange.to && allSessions.length
      ? calculateMetrics(allSessions, dateRange.from, dateRange.to)
      : null
  , [isNonMomence, dateRange.from, dateRange.to, allSessions]);
  const derivedMonthlyData = useMemo(() => (isNonMomence ? calculateMonthlyData(allSessions) : []), [isNonMomence, allSessions]);
  const derivedVenueConfig = useMemo(() =>
    isNonMomence && dateRange.from && dateRange.to && allSessions.length
      ? calculateVenueConfig(allSessions, dateRange.from, dateRange.to)
      : null
  , [isNonMomence, dateRange.from, dateRange.to, allSessions]);

  const metrics = isNonMomence ? derivedMetrics : momenceHook.metrics;
  const monthlyData = isNonMomence ? derivedMonthlyData : momenceHook.monthlyData;
  const venueConfig = isNonMomence ? derivedVenueConfig : momenceHook.venueConfig;
  const hostInfo = activePlatform === 'glofox'
    ? { id: 0, name: 'Lore Bathing Club', currency: 'usd', countryCode: 'US', timeZone: 'America/New_York', industry: 'Wellness', profileImage: null }
    : activePlatform === 'marianatek'
      ? { id: 0, name: MARIANATEK_CONFIG.projectMood.name, currency: 'aud', countryCode: 'AU', timeZone: MARIANATEK_CONFIG.projectMood.timezone, industry: 'Wellness', profileImage: null }
      : momenceHook.hostInfo;
  const fetchedDataRange = momenceHook.dataRange;
  const isLoading = activePlatform === 'glofox' ? glofoxLoading : activePlatform === 'marianatek' ? marianatekLoading : momenceHook.isLoading;
  const error = activePlatform === 'glofox' ? glofoxError : activePlatform === 'marianatek' ? marianatekError : momenceHook.error;

  useEffect(() => {
    if (lastLoadSource !== 'fetch' || !hasQueried || isLoading || allSessions.length === 0 || !currentHostId || !dateRange.from || !dateRange.to) return;
    const venueName = VENUES.find(v => v.id === currentHostId)?.name || hostInfo?.name || `Host ${currentHostId}`;
    const entry = setCachedEntry({
      hostId: currentHostId,
      platform: activePlatform,
      venueName,
      dateRange,
      sessions: allSessions,
      metrics,
      monthlyData,
      venueConfig,
      hostInfo,
    });
    setRecentSearches(getRecentSearches());
    navigate(`/report?hostId=${currentHostId}&from=${dateRange.from}&to=${dateRange.to}&platform=${activePlatform}`, { state: { entry } });
  }, [lastLoadSource, hasQueried, isLoading, allSessions.length, currentHostId, dateRange.from, dateRange.to, activePlatform, navigate]);

  const handleLoadFromCache = (entry: CachedVenueEntry) => {
    setLastLoadSource('cache');
    navigate(`/report?hostId=${entry.hostId}&from=${entry.dateRange.from}&to=${entry.dateRange.to}&platform=${entry.platform}`, { state: { entry } });
  };

  const handleFetchData = async (hostId: string, fromDate: string, toDate: string, platform: Platform) => {
    setLastLoadSource('fetch');
    setHasQueried(true);
    setCurrentHostId(hostId);
    setDateRange({ from: fromDate, to: toDate });
    setActivePlatform(platform);

    if (platform === 'glofox') {
      setGlofoxLoading(true);
      setGlofoxError(null);
      setGlofoxProgress({ sessionsFetched: 0, pagesLoaded: 0 });
      try {
        const config = GLOFOX_CONFIG.loreBathingClub;
        const sessions = await glofoxClient.fetchSessions({
          startDate: new Date(fromDate),
          endDate: new Date(toDate),
          token: config.token,
          branchId: config.branchId,
          timezone: config.timezone,
        });
        setGlofoxProgress({ sessionsFetched: sessions.length, pagesLoaded: 1 });
        setGlofoxSessions(sessions as MomenceSession[]);
      } catch (err) {
        setGlofoxError(err instanceof Error ? err : new Error('Failed to fetch Glofox data'));
      } finally {
        setGlofoxLoading(false);
      }
    } else if (platform === 'marianatek') {
      setMarianatekLoading(true);
      setMarianatekError(null);
      setMarianatekProgress({ sessionsFetched: 0, pagesLoaded: 0 });
      console.log('[Project Mood] Index: fetch started', { fromDate, toDate });
      try {
        const config = MARIANATEK_CONFIG.projectMood;
        const sessions = await fetchMarianaTekSessions({
          baseUrl: config.baseUrl,
          locationId: config.locationId,
          regionId: config.regionId,
          fromDate,
          toDate,
          onProgress: (sessionsFetched, pagesLoaded) => {
            setMarianatekProgress({ sessionsFetched, pagesLoaded });
          },
        });
        console.log('[Project Mood] Index: fetch complete', sessions.length, 'sessions');
        setMarianatekProgress({ sessionsFetched: sessions.length, pagesLoaded: 1 });
        setMarianatekSessions(sessions);
      } catch (err) {
        console.error('[Project Mood] Index: fetch error', err);
        setMarianatekError(err instanceof Error ? err : new Error('Failed to fetch Mariana Tek data'));
      } finally {
        setMarianatekLoading(false);
      }
    } else {
      await momenceHook.fetchData({
        hostId,
        startsAtFrom: new Date(fromDate).toISOString(),
        startsAtTo: new Date(toDate).toISOString(),
      });
    }
  };

  const handleRefresh = async (entry: CachedVenueEntry) => {
    setRefreshingKey(entry.key);
    await handleFetchData(entry.hostId, entry.dateRange.from, entry.dateRange.to, entry.platform);
    setRefreshingKey(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="notion-page">
        <FiltersPanel onFetchData={handleFetchData} isLoading={isLoading} />

        {/* Recent Searches */}
        <div className="mb-6">
          <RecentSearches
            entries={recentSearches}
            onSelect={handleLoadFromCache}
            onRefresh={handleRefresh}
            refreshingKey={refreshingKey}
          />
        </div>

        {/* Data Status & Skeleton when loading */}
        {hasQueried && isLoading && (
          <>
            <DataStatus
              isLoading={isLoading}
              error={error as Error | null}
              sessionCount={activePlatform === 'glofox' ? glofoxProgress.sessionsFetched : activePlatform === 'marianatek' ? marianatekProgress.sessionsFetched : momenceHook.fetchingCount}
              pageCount={totalPages}
              dataRange={fetchedDataRange}
              loadingLabel={activePlatform === 'marianatek' ? 'Fetching Project Mood data...' : undefined}
            />
            <DashboardSkeleton />
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
