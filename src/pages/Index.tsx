import { useState, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { FiltersPanel } from '@/components/FiltersPanel';
import { VenueSummary } from '@/components/VenueSummary';
import { MonthlyTable } from '@/components/MonthlyTable';
import { DemandPatterns } from '@/components/DemandPatterns';
import { CapacityUtilisation } from '@/components/CapacityUtilisation';
import { PricingAnalysis } from '@/components/PricingAnalysis';
import { RevenueInsights } from '@/components/RevenueInsights';
import { DataStatus } from '@/components/DataStatus';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { SaveReportButton } from '@/components/SavedReports';
import { useSessions } from '@/hooks/useSessions';
import { calculateBenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { calculateMetrics, calculateMonthlyData, calculateVenueConfig } from '@/lib/metricsCalculator';
import { glofoxClient } from '@/lib/glofoxClient';
import { fetchMarianaTekSessions } from '@/lib/marianatekClient';
import { GLOFOX_CONFIG, MARIANATEK_CONFIG, type Platform } from '@/config/api';
import type { MomenceSession } from '@/types/momence';

const Index = () => {
  const momenceHook = useSessions();
  
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
  const fetchProgress = activePlatform === 'glofox' ? glofoxProgress : activePlatform === 'marianatek' ? marianatekProgress : momenceHook.fetchingCount;

  const handleFetchData = async (hostId: string, fromDate: string, toDate: string, platform: Platform) => {
    setHasQueried(true);
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
      // Use Momence client
      momenceHook.fetchData({
        hostId,
        startsAtFrom: new Date(fromDate).toISOString(),
        startsAtTo: new Date(toDate).toISOString(),
      });
    }
  };

  const benchmarkMetrics = useMemo(() => {
    if (allSessions.length === 0 || !dateRange.from || !dateRange.to) return null;
    
    // Filter to only sessions with visitors for accurate metrics
    const activeSessions = allSessions.filter(s => s.ticketsSold > 0);
    if (activeSessions.length === 0) return null;
    
    // Use the actual trading period for metrics
    const sortedActive = [...activeSessions].sort((a, b) => 
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
    const firstActiveDate = sortedActive[0].startsAt;
    const lastActiveDate = sortedActive[sortedActive.length - 1].startsAt;
    
    return calculateBenchmarkMetrics(
      activeSessions,
      firstActiveDate,
      lastActiveDate
    );
  }, [allSessions, dateRange]);

  const canSaveReport = hasQueried && !isLoading && allSessions.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="notion-page">
        {/* Header with Save Button */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Benchmark</h1>
            <p className="text-sm text-muted-foreground">
              Analyse booking data and performance metrics
            </p>
          </div>
          {canSaveReport && (
            <SaveReportButton
              currentData={{
                sessions: allSessions,
                metrics,
                monthlyData,
                venueConfig,
                hostInfo,
                dateRange,
              }}
            />
          )}
        </div>

        {/* Filters */}
        <FiltersPanel onFetchData={handleFetchData} isLoading={isLoading} />

        {/* Data Status */}
        <DataStatus
          isLoading={isLoading}
          error={error as Error | null}
          sessionCount={isLoading
            ? (activePlatform === 'glofox' ? glofoxProgress.sessionsFetched : activePlatform === 'marianatek' ? marianatekProgress.sessionsFetched : momenceHook.fetchingCount)
            : allSessions.length}
          pageCount={totalPages}
          dataRange={fetchedDataRange}
          fetchProgress={fetchProgress}
          loadingLabel={activePlatform === 'marianatek' && isLoading ? 'Fetching Project Mood data...' : undefined}
        />

        {/* Skeleton Loader */}
        {hasQueried && isLoading && <DashboardSkeleton />}

        {/* Dashboard Content — hide sections with no data */}
        {hasQueried && !isLoading && benchmarkMetrics && (
          <div className="space-y-10 mt-8">
            {/* Venue Summary */}
            <section>
              <h2 className="notion-h1">Venue Summary</h2>
              <VenueSummary
                metrics={benchmarkMetrics}
                venueConfig={venueConfig}
                monthlyData={monthlyData}
                hostInfo={hostInfo}
              />
            </section>

            {monthlyData.length > 0 && (
              <section>
                <h2 className="notion-h1">Monthly Performance</h2>
                <MonthlyTable data={monthlyData} sessions={allSessions} />
              </section>
            )}

            {allSessions.length > 0 && (
              <section>
                <h2 className="notion-h1">Demand Patterns</h2>
                <DemandPatterns sessions={allSessions} />
              </section>
            )}

            {allSessions.some(s => s.fixedTicketPrice > 0) && (
              <section>
                <h2 className="notion-h1">Revenue Insights</h2>
                <RevenueInsights
                  sessions={allSessions}
                  monthlyData={monthlyData}
                  benchmarkMetrics={benchmarkMetrics}
                />
              </section>
            )}

            {metrics && monthlyData.length > 0 && (
              <section>
                <h2 className="notion-h1">Capacity Trend</h2>
                <CapacityUtilisation metrics={metrics} monthlyData={monthlyData} />
              </section>
            )}

            {allSessions.length > 0 && allSessions.some(s => s.fixedTicketPrice > 0) && (
              <section>
                <h2 className="notion-h1">Pricing & Offerings</h2>
                <PricingAnalysis sessions={allSessions} />
              </section>
            )}
          </div>
        )}

        {/* Empty State */}
        {!hasQueried && !isLoading && (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Ready to Analyse
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Select a venue and date range to load data and view performance metrics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
