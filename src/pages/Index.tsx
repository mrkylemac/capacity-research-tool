import { useState, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { FiltersPanel } from '@/components/FiltersPanel';
import { VenueSummary } from '@/components/VenueSummary';
import { MonthlyTable } from '@/components/MonthlyTable';
import { DemandPatterns } from '@/components/DemandPatterns';
import { CapacityUtilisation } from '@/components/CapacityUtilisation';
import { PricingAnalysis } from '@/components/PricingAnalysis';
import { DataStatus } from '@/components/DataStatus';
import { SaveReportButton } from '@/components/SavedReports';
import { useSessions } from '@/hooks/useSessions';
import { calculateBenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { glofoxClient } from '@/lib/glofoxClient';
import { GLOFOX_CONFIG, type Platform } from '@/config/api';
import type { MomenceSession } from '@/types/momence';

const Index = () => {
  const momenceHook = useSessions();
  
  // Glofox state (parallel to Momence hook)
  const [glofoxSessions, setGlofoxSessions] = useState<MomenceSession[]>([]);
  const [glofoxLoading, setGlofoxLoading] = useState(false);
  const [glofoxError, setGlofoxError] = useState<Error | null>(null);
  const [activePlatform, setActivePlatform] = useState<Platform>('momence');

  // Unified data based on active platform
  const allSessions = activePlatform === 'glofox' ? glofoxSessions : momenceHook.allSessions;
  const totalPages = activePlatform === 'glofox' ? 1 : momenceHook.totalPages;
  const metrics = momenceHook.metrics; // Reuse metrics calculation
  const monthlyData = momenceHook.monthlyData;
  const venueConfig = momenceHook.venueConfig;
  const hostInfo = activePlatform === 'glofox' 
    ? { id: 0, name: 'Lore Bathing Club', currency: 'usd', countryCode: 'US', timeZone: 'America/New_York', industry: 'Wellness', profileImage: null }
    : momenceHook.hostInfo;
  const fetchedDataRange = momenceHook.dataRange;
  const isLoading = activePlatform === 'glofox' ? glofoxLoading : momenceHook.isLoading;
  const error = activePlatform === 'glofox' ? glofoxError : momenceHook.error;

  const [hasQueried, setHasQueried] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const handleFetchData = async (hostId: string, fromDate: string, toDate: string, platform: Platform) => {
    setHasQueried(true);
    setDateRange({ from: fromDate, to: toDate });
    setActivePlatform(platform);

    if (platform === 'glofox') {
      // Use Glofox client
      setGlofoxLoading(true);
      setGlofoxError(null);
      try {
        const config = GLOFOX_CONFIG.loreBathingClub;
        const sessions = await glofoxClient.fetchSessions({
          branchId: config.branchId,
          token: config.token,
          timezone: config.timezone,
          startDate: new Date(fromDate),
          endDate: new Date(toDate),
        });
        // Transform to MomenceSession format for compatibility
        setGlofoxSessions(sessions as unknown as MomenceSession[]);
      } catch (err) {
        setGlofoxError(err instanceof Error ? err : new Error('Failed to fetch Glofox data'));
      } finally {
        setGlofoxLoading(false);
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
          sessionCount={allSessions.length}
          pageCount={totalPages}
          dataRange={fetchedDataRange}
        />

        {/* Dashboard Content */}
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

            {/* Monthly Performance */}
            <section>
              <h2 className="notion-h1">Monthly Performance</h2>
              <MonthlyTable data={monthlyData} sessions={allSessions} />
            </section>

            {/* Demand Patterns */}
            <section>
              <h2 className="notion-h1">Demand Patterns</h2>
              <DemandPatterns sessions={allSessions} />
            </section>

            {/* Capacity Trend */}
            <section>
              <h2 className="notion-h1">Capacity Trend</h2>
              <CapacityUtilisation metrics={metrics} monthlyData={monthlyData} />
            </section>

            {/* Pricing & Offerings */}
            <section>
              <h2 className="notion-h1">Pricing & Offerings</h2>
              <PricingAnalysis sessions={allSessions} />
            </section>
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
