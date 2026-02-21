import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VenueSummary } from '@/components/VenueSummary';
import { VisitationSection } from '@/components/VisitationSection';
import { calculateBenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { getCachedEntry, getCacheKey } from '@/lib/venueCache';
import type { CachedVenueEntry } from '@/lib/venueCache';

const Report = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const handleRefresh = () => {
    if (!hostId || !from || !to) return;
    setIsRefreshing(true);
    navigate(`/?refresh=true&hostId=${hostId}&from=${from}&to=${to}&platform=${platform || 'momence'}`, { replace: true });
  };

  // Active sessions only (those with at least one visitor) for the visitation section
  const activeSessions = entry.sessions.filter(s => s.ticketsSold > 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="notion-page">
        {/* Navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/investor-report', { state: { entry } })}
              >
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Report</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/slow-folk-research', { state: { entry } })}
              >
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Research</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <span className="sm:hidden">Refresh</span>
                <span className="hidden sm:inline">Refresh Data</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          {/* Section 1: Venue profile + 6 insight cards */}
          <section>
            <VenueSummary
              metrics={benchmarkMetrics}
              venueConfig={entry.venueConfig}
              monthlyData={entry.monthlyData}
              hostInfo={entry.hostInfo}
              dateRange={entry.dateRange}
            />
          </section>

          {/* Section 2: Visitation data — raw aggregates from Momence */}
          {activeSessions.length > 0 && (
            <section>
              <div className="mb-6">
                <h2 className="notion-h1">Visitation</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  All figures are sourced directly from Momence session records with no augmentation.
                  Visitors = tickets sold per session. Occupancy = tickets sold ÷ capacity.
                </p>
              </div>
              <VisitationSection
                sessions={activeSessions}
                monthlyData={entry.monthlyData}
                operatingHours={benchmarkMetrics.operatingHours}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default Report;
