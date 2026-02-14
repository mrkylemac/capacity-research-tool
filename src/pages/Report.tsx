import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VenueSummary } from '@/components/VenueSummary';
import { MonthlyTable } from '@/components/MonthlyTable';
import { DemandPatterns } from '@/components/DemandPatterns';
import { CapacityUtilisation } from '@/components/CapacityUtilisation';
import { PricingAnalysis } from '@/components/PricingAnalysis';
import { RevenueInsights } from '@/components/RevenueInsights';
import { calculateBenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { getCachedEntry, getCacheKey } from '@/lib/venueCache';
import type { CachedVenueEntry } from '@/lib/venueCache';

const Report = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hostId = searchParams.get('hostId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const platform = searchParams.get('platform') as CachedVenueEntry['platform'] | null;

  const entry = useMemo(() => {
    const stateEntry = (location.state as { entry?: CachedVenueEntry })?.entry;
    if (stateEntry) return stateEntry;
    if (hostId && from && to && platform) {
      const key = getCacheKey(hostId, platform, from, to);
      return getCachedEntry(key);
    }
    return null;
  }, [location.state, hostId, from, to, platform]);

  useEffect(() => {
    if (!entry) {
      navigate('/', { replace: true });
    }
  }, [entry, navigate]);

  if (!entry) return null;

  const benchmarkMetrics = useMemo(() => {
    const activeSessions = entry.sessions.filter(s => s.ticketsSold > 0);
    if (activeSessions.length === 0) return null;
    const sorted = [...activeSessions].sort((a, b) =>
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
    return calculateBenchmarkMetrics(
      activeSessions,
      sorted[0].startsAt,
      sorted[sorted.length - 1].startsAt
    );
  }, [entry.sessions]);

  if (!benchmarkMetrics) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="notion-page">
        <div className="mb-6">
          <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/investor-report', { state: { entry } })}
          >
            <FileText className="mr-2 h-4 w-4" />
            Report
          </Button>
        </div>
        </div>

        <div className="space-y-10">
          <section>
            <VenueSummary
              metrics={benchmarkMetrics}
              venueConfig={entry.venueConfig}
              monthlyData={entry.monthlyData}
              hostInfo={entry.hostInfo}
              dateRange={entry.dateRange}
            />
          </section>

          {entry.monthlyData.length > 0 && (
            <section>
              <h2 className="notion-h1">Monthly Performance</h2>
              <MonthlyTable data={entry.monthlyData} sessions={entry.sessions} />
            </section>
          )}

          {entry.sessions.length > 0 && (
            <section>
              <h2 className="notion-h1">Demand Patterns</h2>
              <DemandPatterns
                sessions={entry.sessions}
                operatingHours={benchmarkMetrics.operatingHours}
              />
            </section>
          )}

          {entry.sessions.some(s => s.fixedTicketPrice > 0) && (
            <section>
              <h2 className="notion-h1">Revenue Insights</h2>
              <RevenueInsights
                sessions={entry.sessions}
                monthlyData={entry.monthlyData}
                benchmarkMetrics={benchmarkMetrics}
              />
            </section>
          )}

          {entry.metrics && entry.monthlyData.length > 0 && (
            <section>
              <h2 className="notion-h1">Capacity Trend</h2>
              <CapacityUtilisation metrics={entry.metrics} monthlyData={entry.monthlyData} />
            </section>
          )}

          {entry.sessions.length > 0 && entry.sessions.some(s => s.fixedTicketPrice > 0) && (
            <section>
              <h2 className="notion-h1">Pricing & Offerings</h2>
              <PricingAnalysis sessions={entry.sessions} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default Report;
