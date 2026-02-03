import { useState, useEffect } from 'react';
import { Flame, Snowflake } from 'lucide-react';
import { FiltersPanel } from '@/components/FiltersPanel';
import { SummaryCards } from '@/components/SummaryCards';
import { VenueOverview } from '@/components/VenueOverview';
import { MonthlyTable } from '@/components/MonthlyTable';
import { DemandPatterns } from '@/components/DemandPatterns';
import { CapacityUtilisation } from '@/components/CapacityUtilisation';
import { RevenueSection } from '@/components/RevenueSection';
import { DataStatus } from '@/components/DataStatus';
import { useSessions } from '@/hooks/useSessions';

const Index = () => {
  const {
    allSessions,
    totalCount,
    totalPages,
    page,
    metrics,
    monthlyData,
    demandPatterns,
    venueConfig,
    isLoading,
    error,
    fetchData,
  } = useSessions({ useMockData: true });

  const [hasQueried, setHasQueried] = useState(false);

  const handleFetchData = (hostId: string, fromDate: string, toDate: string, pageSize: number) => {
    setHasQueried(true);
    fetchData({
      hostId,
      startsAtFrom: new Date(fromDate).toISOString(),
      startsAtTo: new Date(toDate).toISOString(),
      pageSize,
    });
  };

  return (
    <div className="min-h-screen bg-background" data-theme="saunaice">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Flame className="w-6 h-6 text-primary" />
              <Snowflake className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Momence Explorer</h1>
              <p className="text-xs text-muted-foreground">Sauna & Ice Session Analytics</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <FiltersPanel onFetchData={handleFetchData} isLoading={isLoading} />

        {/* Data Status */}
        <DataStatus
          isLoading={isLoading}
          error={error as Error | null}
          totalCount={totalCount}
          totalPages={totalPages}
          currentPage={page}
        />

        {/* Dashboard Content */}
        {hasQueried && !isLoading && (
          <>
            {/* Summary Cards */}
            <SummaryCards 
              metrics={metrics} 
              venueConfig={venueConfig}
              monthlyData={monthlyData}
            />

            {/* Venue Overview */}
            <div className="mb-6">
              <VenueOverview config={venueConfig} />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Monthly Performance */}
              <MonthlyTable data={monthlyData} />
              
              {/* Demand Patterns */}
              <DemandPatterns data={demandPatterns} />
            </div>

            {/* Capacity & Revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CapacityUtilisation metrics={metrics} monthlyData={monthlyData} />
              <RevenueSection metrics={metrics} monthlyData={monthlyData} />
            </div>
          </>
        )}

        {/* Empty State */}
        {!hasQueried && !isLoading && (
          <div className="text-center py-20">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Flame className="w-10 h-10 text-primary/50" />
              <Snowflake className="w-10 h-10 text-secondary/50" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Ready to Explore
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Configure your query parameters above and click "Fetch Data" to load session data and view analytics.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          Momence API Explorer • Using mock data for development
        </div>
      </footer>
    </div>
  );
};

export default Index;
