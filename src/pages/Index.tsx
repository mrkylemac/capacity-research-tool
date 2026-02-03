import { useState } from 'react';
import { FiltersPanel } from '@/components/FiltersPanel';
import { SummaryCards } from '@/components/SummaryCards';
import { VenueOverview } from '@/components/VenueOverview';
import { MonthlyTable } from '@/components/MonthlyTable';
import { DemandPatterns } from '@/components/DemandPatterns';
import { CapacityUtilisation } from '@/components/CapacityUtilisation';
import { RevenueSection } from '@/components/RevenueSection';
import { DataStatus } from '@/components/DataStatus';
import { useSessions } from '@/hooks/useSessions';
import { Separator } from '@/components/ui/separator';

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
    <div className="min-h-screen bg-background">
      <div className="notion-page">
        {/* Header */}
        <header className="mb-8">
          <h1 className="notion-title">Momence Explorer</h1>
          <p className="notion-subtitle">Sauna & Ice Session Analytics Dashboard</p>
        </header>

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
            <Separator className="my-8" />

            {/* Summary Cards */}
            <section>
              <h2 className="notion-h1">Summary</h2>
              <SummaryCards 
                metrics={metrics} 
                venueConfig={venueConfig}
                monthlyData={monthlyData}
              />
            </section>

            {/* Venue Overview */}
            <section>
              <h2 className="notion-h1">Venue Configuration</h2>
              <VenueOverview config={venueConfig} />
            </section>

            <Separator className="my-8" />

            {/* Monthly Performance */}
            <section>
              <h2 className="notion-h1">Monthly Performance</h2>
              <MonthlyTable data={monthlyData} />
            </section>

            <Separator className="my-8" />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section>
                <h2 className="notion-h2">Demand Patterns</h2>
                <DemandPatterns data={demandPatterns} />
              </section>

              <section>
                <h2 className="notion-h2">Capacity & Utilisation</h2>
                <CapacityUtilisation metrics={metrics} monthlyData={monthlyData} />
              </section>
            </div>

            <Separator className="my-8" />

            {/* Revenue */}
            <section>
              <h2 className="notion-h1">Revenue Analysis</h2>
              <RevenueSection metrics={metrics} monthlyData={monthlyData} />
            </section>
          </>
        )}

        {/* Empty State */}
        {!hasQueried && !isLoading && (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Ready to Explore
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Configure your query parameters above and click "Fetch Data" to load session data and view analytics.
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-border py-6 mt-12 text-center text-sm text-muted-foreground">
          Momence API Explorer • Using mock data for development
        </footer>
      </div>
    </div>
  );
};

export default Index;
