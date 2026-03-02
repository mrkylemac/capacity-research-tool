import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiltersPanel } from '@/components/FiltersPanel';
import { RecentSearches } from '@/components/RecentSearches';
import { DataStatus } from '@/components/DataStatus';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { useSessions } from '@/hooks/useSessions';
import { getRecentSearches, setCachedEntry, removeFromRecent, type CachedVenueEntry } from '@/lib/venueCache';
import { VENUES } from '@/config/api';
import type { Platform } from '@/config/api';

const Index = () => {
  const navigate = useNavigate();
  const momenceHook = useSessions();
  const [recentSearches, setRecentSearches] = useState<CachedVenueEntry[]>(() => getRecentSearches());
  const [refreshingKey, setRefreshingKey] = useState<string | null>(null);
  const [lastLoadSource, setLastLoadSource] = useState<'fetch' | 'cache' | null>(null);
  const [currentHostId, setCurrentHostId] = useState('');
  const [hasQueried, setHasQueried] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const { allSessions, metrics, monthlyData, venueConfig, hostInfo, dataRange: fetchedDataRange, isLoading, fetchPhase, error, totalPages } = momenceHook;

  useEffect(() => {
    if (lastLoadSource !== 'fetch' || !hasQueried || isLoading || allSessions.length === 0 || !currentHostId || !dateRange.from || !dateRange.to) return;
    const venueName = VENUES.find(v => v.id === currentHostId)?.name || hostInfo?.name || `Host ${currentHostId}`;
    const entry = setCachedEntry({
      hostId: currentHostId,
      platform: 'momence',
      venueName,
      dateRange,
      sessions: allSessions,
      metrics,
      monthlyData,
      venueConfig,
      hostInfo,
    });
    setRecentSearches(getRecentSearches());
    navigate(`/report?hostId=${currentHostId}&from=${dateRange.from}&to=${dateRange.to}&platform=momence`, { state: { entry } });
  }, [lastLoadSource, hasQueried, isLoading, allSessions.length, currentHostId, dateRange.from, dateRange.to, navigate]);

  const handleLoadFromCache = (entry: CachedVenueEntry) => {
    setLastLoadSource('cache');
    navigate(`/report?hostId=${entry.hostId}&from=${entry.dateRange.from}&to=${entry.dateRange.to}&platform=${entry.platform}`, { state: { entry } });
  };

  const handleFetchData = async (hostId: string, fromDate: string, toDate: string, _platform: Platform) => {
    setLastLoadSource('fetch');
    setHasQueried(true);
    setCurrentHostId(hostId);
    setDateRange({ from: fromDate, to: toDate });

    await momenceHook.fetchData({
      hostId,
      startsAtFrom: new Date(fromDate).toISOString(),
      startsAtTo: new Date(toDate).toISOString(),
    });
  };

  const handleRefresh = async (entry: CachedVenueEntry) => {
    setRefreshingKey(entry.key);
    await handleFetchData(entry.hostId, entry.dateRange.from, entry.dateRange.to, entry.platform);
    setRefreshingKey(null);
  };

  const handleDelete = (key: string) => {
    removeFromRecent(key);
    setRecentSearches(getRecentSearches());
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="page-container">
        <FiltersPanel onFetchData={handleFetchData} isLoading={isLoading} />

        {/* Recent Searches */}
        <div className="mb-6">
          <RecentSearches
            entries={recentSearches}
            onSelect={handleLoadFromCache}
            onRefresh={handleRefresh}
            onDelete={handleDelete}
            refreshingKey={refreshingKey}
          />
        </div>

        {/* Data Status & Skeleton when loading */}
        {hasQueried && isLoading && (
          <>
            <DataStatus
              isLoading={isLoading}
              fetchPhase={fetchPhase}
              error={error as Error | null}
              sessionCount={momenceHook.fetchingCount}
              pageCount={totalPages}
              dataRange={fetchedDataRange}
            />
            <DashboardSkeleton />
          </>
        )}
      </div>
    </div>
  );
};

export default Index;

// Opt out of static pre-rendering — page uses browser APIs and router hooks
export async function getServerSideProps() {
  return { props: {} };
}
