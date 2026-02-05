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

const Index = () => {
  const {
    allSessions,
    totalPages,
    metrics,
    monthlyData,
    venueConfig,
    hostInfo,
    isLoading,
    error,
    fetchData,
  } = useSessions();

  const [hasQueried, setHasQueried] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const handleFetchData = (hostId: string, fromDate: string, toDate: string) => {
    setHasQueried(true);
    setDateRange({ from: fromDate, to: toDate });
    fetchData({
      hostId,
      startsAtFrom: new Date(fromDate).toISOString(),
      startsAtTo: new Date(toDate).toISOString(),
    });
  };

  const benchmarkMetrics = useMemo(() => {
    if (allSessions.length === 0 || !dateRange.from || !dateRange.to) return null;
    return calculateBenchmarkMetrics(
      allSessions,
      new Date(dateRange.from).toISOString(),
      new Date(dateRange.to).toISOString()
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
