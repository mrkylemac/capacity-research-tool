import { useState, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { FiltersPanel } from '@/components/FiltersPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSessions } from '@/hooks/useSessions';
import { calculateMetrics, calculateMonthlyData, calculateVenueConfig } from '@/lib/metricsCalculator';
import { glofoxClient } from '@/lib/glofoxClient';
import { fetchMarianaTekSessions } from '@/lib/marianatekClient';
import { VENUES, GLOFOX_CONFIG, MARIANATEK_CONFIG, type Platform } from '@/config/api';
import { TrendingUp, TrendingDown, Minus, Calendar, Building2 } from 'lucide-react';
import forecastData from '@/data/forecast.json';
import type { MomenceSession } from '@/types/momence';

interface ForecastData {
  pricingBreakeven: Record<string, number | string>;
  venueCapacity: Record<string, number | string>;
  cashFlow: Array<{ month: string; forecast: number }>;
  lastUpdated: string;
}

function ComparisonCard({ 
  title, 
  benchmarkValue, 
  slowFolkEstimate, 
  format = 'number',
  benchmarkLabel
}: { 
  title: string; 
  benchmarkValue: number; 
  slowFolkEstimate: number; 
  format?: 'number' | 'currency' | 'percent';
  benchmarkLabel: string;
}) {
  const variance = benchmarkValue - slowFolkEstimate;
  const percentDiff = slowFolkEstimate !== 0 ? (variance / slowFolkEstimate) * 100 : 0;
  
  const formatValue = (val: number) => {
    if (format === 'currency') return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (format === 'percent') return `${val.toFixed(1)}%`;
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };
  
  // For validation: green if benchmark is higher (proving concept), yellow if close, red if benchmark is lower
  const Icon = percentDiff > 10 ? TrendingUp : percentDiff < -10 ? TrendingDown : Minus;
  const colorClass = percentDiff > 10 ? 'text-green-600' : percentDiff < -10 ? 'text-amber-600' : 'text-gray-500';
  const interpretation = percentDiff > 10 
    ? 'Benchmark exceeds estimate' 
    : percentDiff < -10 
      ? 'Estimate may be optimistic'
      : 'Estimates aligned';
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{formatValue(benchmarkValue)}</div>
            <div className="text-xs text-muted-foreground">{benchmarkLabel} (Actual)</div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-lg font-semibold text-muted-foreground">{formatValue(slowFolkEstimate)}</div>
            <div className="text-xs text-muted-foreground">Slow Folk (Est.)</div>
          </div>
        </div>
        <div className={`flex items-center gap-1 mt-3 text-sm ${colorClass}`}>
          <Icon className="h-4 w-4" />
          <span className="font-medium">
            {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
          </span>
          <span className="text-muted-foreground text-xs">{interpretation}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const ForecastComparison = () => {
  const momenceHook = useSessions();
  
  // Glofox state
  const [glofoxSessions, setGlofoxSessions] = useState<MomenceSession[]>([]);
  const [glofoxLoading, setGlofoxLoading] = useState(false);
  const [glofoxError, setGlofoxError] = useState<Error | null>(null);
  
  // Mariana Tek state
  const [marianatekSessions, setMarianatekSessions] = useState<MomenceSession[]>([]);
  const [marianatekLoading, setMarianatekLoading] = useState(false);
  const [marianatekError, setMarianatekError] = useState<Error | null>(null);
  
  const [activePlatform, setActivePlatform] = useState<Platform>('momence');
  const [hasQueried, setHasQueried] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [currentVenue, setCurrentVenue] = useState<string>('');

  const platformSessions = activePlatform === 'glofox' ? glofoxSessions : activePlatform === 'marianatek' ? marianatekSessions : momenceHook.allSessions;
  const allSessions = platformSessions;

  const isNonMomence = activePlatform === 'glofox' || activePlatform === 'marianatek';
  const derivedMetrics = useMemo(() => 
    isNonMomence && dateRange.from && dateRange.to && allSessions.length
      ? calculateMetrics(allSessions, dateRange.from, dateRange.to)
      : null
  , [isNonMomence, dateRange.from, dateRange.to, allSessions]);
  const derivedMonthlyData = useMemo(() => (isNonMomence ? calculateMonthlyData(allSessions) : []), [isNonMomence, allSessions]);

  const metrics = isNonMomence ? derivedMetrics : momenceHook.metrics;
  const monthlyData = isNonMomence ? derivedMonthlyData : momenceHook.monthlyData;
  const isLoading = activePlatform === 'glofox' ? glofoxLoading : activePlatform === 'marianatek' ? marianatekLoading : momenceHook.isLoading;
  const error = activePlatform === 'glofox' ? glofoxError : activePlatform === 'marianatek' ? marianatekError : momenceHook.error;

  const handleFetchData = async (hostId: string, fromDate: string, toDate: string, platform: Platform) => {
    setHasQueried(true);
    setDateRange({ from: fromDate, to: toDate });
    setActivePlatform(platform);
    setCurrentVenue(hostId);

    if (platform === 'glofox') {
      setGlofoxLoading(true);
      setGlofoxError(null);
      try {
        const config = GLOFOX_CONFIG.loreBathingClub;
        const sessions = await glofoxClient.fetchSessions({
          startDate: new Date(fromDate),
          endDate: new Date(toDate),
          token: config.token,
          branchId: config.branchId,
          timezone: config.timezone,
        });
        setGlofoxSessions(sessions as MomenceSession[]);
      } catch (err) {
        setGlofoxError(err instanceof Error ? err : new Error('Failed to fetch Glofox data'));
      } finally {
        setGlofoxLoading(false);
      }
    } else if (platform === 'marianatek') {
      setMarianatekLoading(true);
      setMarianatekError(null);
      try {
        const config = MARIANATEK_CONFIG.projectMood;
        const sessions = await fetchMarianaTekSessions({
          baseUrl: config.baseUrl,
          locationId: config.locationId,
          regionId: config.regionId,
          fromDate,
          toDate,
          onProgress: () => {},
        });
        setMarianatekSessions(sessions);
      } catch (err) {
        setMarianatekError(err instanceof Error ? err : new Error('Failed to fetch Mariana Tek data'));
      } finally {
        setMarianatekLoading(false);
      }
    } else {
      momenceHook.fetchData({
        hostId,
        startsAtFrom: new Date(fromDate).toISOString(),
        startsAtTo: new Date(toDate).toISOString(),
      });
    }
  };

  const venueName = VENUES.find(v => v.id === currentVenue)?.name || `Host ${currentVenue}`;
  const isLoaded = !isLoading && metrics && forecastData && hasQueried;
  
  // Calculate benchmark venue actual values (normalized per visitor/session where applicable)
  const benchmarkTotalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const benchmarkTotalVisitors = metrics?.totalTicketsSold || 0;
  const benchmarkTotalSessions = metrics?.totalSessions || 0;
  const benchmarkCapacityUtilization = metrics?.avgUtilisation || 0;
  const benchmarkAvgTicketPrice = metrics?.avgRevenuePerVisit || 0;
  const benchmarkRevenuePerSession = metrics?.avgRevenuePerSession || 0;
  const benchmarkSessionsPerWeek = metrics?.sessionsPerWeek || 0;
  const benchmarkRevenuePerVisitor = benchmarkTotalVisitors > 0 ? benchmarkTotalRevenue / benchmarkTotalVisitors : 0;
  
  // Calculate average session capacity for the benchmark venue
  const benchmarkAvgCapacity = benchmarkTotalSessions > 0 
    ? allSessions.reduce((sum, s) => sum + s.capacity, 0) / benchmarkTotalSessions 
    : 0;
  
  // Extract forecast values
  const forecastRevenue = forecastData?.pricingBreakeven?.['Total Revenue'] || 0;
  const forecastCapacity = forecastData?.venueCapacity?.['Target Utilization'] || 0;
  const forecastAvgPrice = forecastData?.pricingBreakeven?.['Avg Ticket Price'] || 0;
  const forecastSessions = forecastData?.venueCapacity?.['Sessions Per Week'] || 0;

  const hasForecastData = forecastData.cashFlow.length > 0 || 
    Object.keys(forecastData.pricingBreakeven).length > 0 ||
    Object.keys(forecastData.venueCapacity).length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="notion-page">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Forecast Validation</h1>
            <p className="text-sm text-muted-foreground">
              Validate Slow Folk estimates against real venue performance
            </p>
          </div>
          {forecastData.lastUpdated && (
            <div className="text-xs text-muted-foreground">
              Slow Folk estimates: {new Date(forecastData.lastUpdated).toLocaleDateString()}
            </div>
          )}
        </div>

        {!hasForecastData && (
          <Alert className="mb-6">
            <AlertDescription>
              No Slow Folk estimates found. Run <code className="text-xs bg-muted px-1 py-0.5 rounded">yarn fetch-forecast [SPREADSHEET_ID]</code> to import your business plan from Google Sheets.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <FiltersPanel onFetchData={handleFetchData} isLoading={isLoading} />

        {/* Current Comparison Info */}
        {hasQueried && isLoaded && (
          <div className="space-y-4 mb-6">
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium text-sm">Validation Benchmark:</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="gap-1.5">
                      <Building2 className="h-3 w-3" />
                      {venueName}
                    </Badge>
                    <Badge variant="secondary" className="gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {dateRange.from} to {dateRange.to}
                    </Badge>
                    <Badge variant="outline" className="gap-1.5">
                      {allSessions.length} sessions analyzed
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Comparing <strong>{venueName}'s</strong> actual performance against your <strong>Slow Folk</strong> business plan estimates
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {/* Venue Context - Important for Interpretation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Venue Context</CardTitle>
                <CardDescription className="text-xs">
                  Understanding scale differences helps interpret the comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Session Size</div>
                    <div className="text-lg font-semibold">{benchmarkAvgCapacity.toFixed(0)} people</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Sessions/Week</div>
                    <div className="text-lg font-semibold">{benchmarkSessionsPerWeek.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total Visitors</div>
                    <div className="text-lg font-semibold">{benchmarkTotalVisitors.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Capacity Used</div>
                    <div className="text-lg font-semibold">{benchmarkCapacityUtilization.toFixed(0)}%</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  💡 Metrics below are normalized (per-visitor, per-session) to account for scale differences
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {isLoaded && (
          <div className="space-y-8">
            {/* Per-Visitor Economics (Normalized) */}
            <section>
              <h2 className="notion-h1">Per-Visitor Economics</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Normalized per-visitor metrics — comparable regardless of venue size
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ComparisonCard
                  title="Revenue Per Visitor"
                  benchmarkValue={benchmarkRevenuePerVisitor}
                  slowFolkEstimate={forecastAvgPrice}
                  format="currency"
                  benchmarkLabel={venueName}
                />
                <ComparisonCard
                  title="Avg Ticket Price"
                  benchmarkValue={benchmarkAvgTicketPrice}
                  slowFolkEstimate={forecastAvgPrice}
                  format="currency"
                  benchmarkLabel={venueName}
                />
              </div>
            </section>

            {/* Per-Session Economics (Normalized) */}
            <section>
              <h2 className="notion-h1">Per-Session Economics</h2>
              <p className="text-sm text-muted-foreground mb-4">
                How much revenue per session? Accounts for different session sizes
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ComparisonCard
                  title="Revenue Per Session"
                  benchmarkValue={benchmarkRevenuePerSession}
                  slowFolkEstimate={(forecastRevenue / (forecastSessions * 52 / 12)) || 0}
                  format="currency"
                  benchmarkLabel={venueName}
                />
              </div>
            </section>

            {/* Operational Efficiency */}
            <section>
              <h2 className="notion-h1">Operational Efficiency</h2>
              <p className="text-sm text-muted-foreground mb-4">
                These rates are naturally comparable across venues
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ComparisonCard
                  title="Capacity Utilization"
                  benchmarkValue={benchmarkCapacityUtilization}
                  slowFolkEstimate={forecastCapacity}
                  format="percent"
                  benchmarkLabel={venueName}
                />
                <ComparisonCard
                  title="Sessions Per Week"
                  benchmarkValue={benchmarkSessionsPerWeek}
                  slowFolkEstimate={forecastSessions}
                  format="number"
                  benchmarkLabel={venueName}
                />
              </div>
            </section>

            {/* Scale Context (Raw Numbers) */}
            <section>
              <h2 className="notion-h1">Scale Context</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Raw numbers for context — not directly comparable due to different venue sizes
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-muted-foreground">{venueName}</div>
                        <div className="text-2xl font-bold">${benchmarkTotalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Slow Folk Est.</div>
                        <div className="text-lg font-semibold text-muted-foreground">${forecastRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div>
                      </div>
                      <div className="text-xs text-muted-foreground pt-1 border-t">
                        ⚠️ Not comparable - different venue scales
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-muted-foreground">{venueName}</div>
                        <div className="text-2xl font-bold">{benchmarkTotalVisitors.toLocaleString()}</div>
                      </div>
                      <div className="text-xs text-muted-foreground pt-1 border-t">
                        Use "per-visitor" metrics above for comparison
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Monthly Revenue Pattern */}
            {forecastData?.cashFlow?.length > 0 && monthlyData.length > 0 && (
              <section>
                <h2 className="notion-h1">Monthly Revenue Pattern</h2>
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Cash Flow Comparison</CardTitle>
                    <CardDescription>
                      Pattern analysis — absolute numbers vary due to scale, but trends are comparable
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                      💡 Use this to validate if your monthly projections show realistic growth/seasonality patterns, not absolute values
                    </div>
                    <div className="space-y-3">
                      {monthlyData.slice(-6).map((actualMonth, idx) => {
                        const monthName = actualMonth.month;
                        const forecastMonth = forecastData.cashFlow.find(f => 
                          f.month.toLowerCase().includes(monthName.toLowerCase().slice(0, 3))
                        );
                        const slowFolkEstimate = forecastMonth?.forecast || 0;
                        const benchmarkActual = actualMonth.revenue;
                        
                        // Calculate per-session revenue for fair comparison
                        const benchmarkSessionsThisMonth = actualMonth.sessions;
                        const benchmarkRevenuePerSession = benchmarkSessionsThisMonth > 0 
                          ? benchmarkActual / benchmarkSessionsThisMonth 
                          : 0;
                        
                        const variance = benchmarkActual - slowFolkEstimate;
                        const percentDiff = slowFolkEstimate !== 0 ? (variance / slowFolkEstimate) * 100 : 0;
                        
                        return (
                          <div key={idx} className="border-b pb-3 last:border-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{monthName}</div>
                              <div className="text-xs text-muted-foreground">
                                {benchmarkSessionsThisMonth} sessions
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-sm">
                                <div className="text-muted-foreground text-xs">{venueName}</div>
                                <div className="font-semibold">${benchmarkActual.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">
                                  ${benchmarkRevenuePerSession.toFixed(0)}/session
                                </div>
                              </div>
                              <div className="text-sm">
                                <div className="text-muted-foreground text-xs">Slow Folk</div>
                                <div className="font-semibold text-muted-foreground">${slowFolkEstimate.toLocaleString()}</div>
                              </div>
                              <div className="text-sm text-right">
                                <div className={`font-medium ${Math.abs(percentDiff) < 20 ? 'text-gray-500' : percentDiff > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                  {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(0)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {Math.abs(percentDiff) < 20 ? 'Similar' : percentDiff > 0 ? 'Higher' : 'Lower'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        )}

        {/* Empty State */}
        {!hasQueried && !isLoading && (
          <div className="text-center py-20">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Validate Your Assumptions
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Select a successful venue to use as a validation benchmark for your Slow Folk business plan.
            </p>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto">
              Choose venues with similar models (e.g., Inner Studio, Lore Bathing Club) to see if their actual performance validates your revenue estimates, capacity assumptions, and breakeven targets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForecastComparison;
