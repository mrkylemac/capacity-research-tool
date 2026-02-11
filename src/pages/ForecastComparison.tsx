import { useState, useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
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
  
  // Extract Slow Folk forecast values from spreadsheet with flexible field matching
  const forecastMonthlyRevenue = Number(forecastData?.pricingBreakeven?.['Monthly Revenue']) || 
                                 Number(forecastData?.pricingBreakeven?.['Total Revenue']) ||
                                 Number(forecastData?.pricingBreakeven?.['Revenue']) || 
                                 51993.83; // Default from your model
  
  const forecastVenueOccupancy = Number(forecastData?.venueCapacity?.['Venue Occupancy %']) || 
                                 Number(forecastData?.venueCapacity?.['Target Utilization']) ||
                                 Number(forecastData?.venueCapacity?.['Guardrailed Occupancy']) ||
                                 35; // Default: 35%
  
  const forecastPeakOccupancy = Number(forecastData?.venueCapacity?.['Peak Occupancy %']) ||
                                Number(forecastData?.pricingBreakeven?.['Peak']) ||
                                59; // Default: 59%
  
  const forecastWeeklyVisits = Number(forecastData?.pricingBreakeven?.['Weekly Visits']) ||
                               Number(forecastData?.venueCapacity?.['Weekly Visits']) ||
                               Number(forecastData?.pricingBreakeven?.['1-2x Visits Weekly']) ||
                               345; // Default: 345 weekly visits
  
  const forecastARPV = Number(forecastData?.pricingBreakeven?.['ARPV']) ||
                       Number(forecastData?.pricingBreakeven?.['Avg Ticket Price']) ||
                       Number(forecastData?.pricingBreakeven?.['Price + type']) ||
                       34.81; // Default: $34.81
  
  const forecastSessions = Number(forecastData?.venueCapacity?.['Sessions Per Week']) ||
                          Number(forecastData?.venueCapacity?.['Session Per-Start Max']) ||
                          46.5; // Default: 46.5 sessions/week
  
  // Breakeven targets (monthly) with fallbacks to defaults from your model
  const forecastOperatingOnly = Number(forecastData?.pricingBreakeven?.['Operating Only']) ||
                                Number(forecastData?.pricingBreakeven?.['Targets Operating Only']) ||
                                27738; // Default: $27,738/mo
  
  const forecastCombined = Number(forecastData?.pricingBreakeven?.['Combined']) ||
                          Number(forecastData?.pricingBreakeven?.['Targets Combined']) ||
                          39251; // Default: $39,251/mo
  
  const forecastCombinedProfit = Number(forecastData?.pricingBreakeven?.['Combined + Profit']) ||
                                Number(forecastData?.pricingBreakeven?.['Targets Combined + Profit']) ||
                                45138; // Default: $45,138/mo

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
            {/* Executive Summary / Narrative */}
            <section>
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Benchmark Validation: Slow Folk vs Live Market Data</CardTitle>
                  <CardDescription className="text-sm leading-relaxed mt-2">
                    We've benchmarked Slow Folk's visitation and pricing assumptions against <strong>{venueName}</strong>, 
                    an operating venue with real market data. This analysis validates that our projections are grounded 
                    in proven economics, not wishful thinking.
                  </CardDescription>
                </CardHeader>
              </Card>
            </section>

            {/* Core Comparison Table */}
            <section>
              <h2 className="notion-h1">Key Performance Metrics</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Weekly Visitors */}
                    <div className="grid grid-cols-3 gap-4 py-3 border-b">
                      <div className="font-medium">Weekly Visitors</div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{((benchmarkTotalVisitors / (differenceInDays(parseISO(dateRange.to), parseISO(dateRange.from)) || 1)) * 7).toFixed(0)}</div>
                        <div className="text-xs text-muted-foreground">{venueName} Actual</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-muted-foreground">
                          {forecastWeeklyVisits ? forecastWeeklyVisits.toLocaleString() : '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">Slow Folk Target</div>
                      </div>
                    </div>

                    {/* Capacity Utilization (Venue Occupancy) */}
                    <div className="grid grid-cols-3 gap-4 py-3 border-b">
                      <div className="font-medium">Venue Occupancy</div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">{benchmarkCapacityUtilization.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">{venueName} Actual</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-muted-foreground">{forecastVenueOccupancy.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Slow Folk Target</div>
                      </div>
                    </div>

                    {/* Peak Occupancy (if available) */}
                    {forecastPeakOccupancy > 0 && (
                      <div className="grid grid-cols-3 gap-4 py-3 border-b">
                        <div className="font-medium">Peak Occupancy</div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">-</div>
                          <div className="text-xs text-muted-foreground">N/A</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-muted-foreground">{forecastPeakOccupancy.toFixed(1)}%</div>
                          <div className="text-xs text-muted-foreground">Slow Folk Target</div>
                        </div>
                      </div>
                    )}

                    {/* ARPV */}
                    <div className="grid grid-cols-3 gap-4 py-3 border-b">
                      <div className="font-medium">ARPV (Avg Price)</div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">${benchmarkAvgTicketPrice.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{venueName} Actual</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-muted-foreground">${forecastARPV.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Slow Folk Target</div>
                      </div>
                    </div>

                    {/* Monthly Revenue */}
                    <div className="grid grid-cols-3 gap-4 py-3">
                      <div className="font-medium">Monthly Revenue</div>
                      <div className="text-right">
                        <div className="text-lg font-semibold">
                          ${(benchmarkTotalRevenue / (monthlyData.length || 1)).toFixed(0).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">{venueName} Actual</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-muted-foreground">
                          ${forecastMonthlyRevenue.toFixed(0).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Slow Folk Target</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Key Takeaway */}
            <section>
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <AlertDescription>
                  <div className="font-medium mb-2">Key Takeaway</div>
                  <p className="text-sm leading-relaxed">
                    {benchmarkCapacityUtilization < forecastVenueOccupancy * 1.2 && benchmarkCapacityUtilization > forecastVenueOccupancy * 0.8 ? (
                      <>
                        Slow Folk's venue occupancy target ({forecastVenueOccupancy.toFixed(0)}%) aligns closely with {venueName}'s actual performance ({benchmarkCapacityUtilization.toFixed(0)}%), 
                        demonstrating that our assumptions are grounded in real market conditions. At {forecastWeeklyVisits} weekly visits and ${forecastARPV.toFixed(2)} ARPV,
                        Slow Folk projects ${forecastMonthlyRevenue.toLocaleString()}/month in revenue.
                      </>
                    ) : benchmarkCapacityUtilization > forecastVenueOccupancy * 1.2 ? (
                      <>
                        {venueName} achieves {benchmarkCapacityUtilization.toFixed(0)}% utilization vs our {forecastVenueOccupancy.toFixed(0)}% target, 
                        suggesting Slow Folk's projections are <strong>conservative</strong>. This provides significant upside potential 
                        while maintaining credible downside protection for our ${forecastCombinedProfit.toLocaleString()}/month profit target.
                      </>
                    ) : (
                      <>
                        Slow Folk targets {forecastVenueOccupancy.toFixed(0)}% venue occupancy compared to {venueName}'s {benchmarkCapacityUtilization.toFixed(0)}%. 
                        Our projections assume {forecastWeeklyVisits} weekly visits at ${forecastARPV.toFixed(2)} ARPV, with {venueName}'s data providing 
                        a realistic floor for stress-testing our ${forecastCombined.toLocaleString()}/month breakeven scenario.
                      </>
                    )}
                  </p>
                </AlertDescription>
              </Alert>
            </section>

            {/* Breakeven Validation */}
            {(forecastOperatingOnly > 0 || forecastCombined > 0 || forecastCombinedProfit > 0) && (
              <section>
                <h2 className="notion-h1">Breakeven Validation</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Can {venueName}'s performance support your breakeven scenarios?
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  {forecastOperatingOnly > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Operating Only</CardTitle>
                        <CardDescription className="text-xs">Operating costs only</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-semibold text-muted-foreground">
                          ${forecastOperatingOnly.toLocaleString()}/mo
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Slow Folk requirement</div>
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-muted-foreground">Benchmark achieves:</div>
                          <div className="text-2xl font-bold">
                            ${(benchmarkTotalRevenue / (monthlyData.length || 1)).toFixed(0).toLocaleString()}/mo
                          </div>
                          {(benchmarkTotalRevenue / (monthlyData.length || 1)) > forecastOperatingOnly ? (
                            <div className="text-xs text-green-600 mt-1 font-medium">✓ Exceeds breakeven</div>
                          ) : (
                            <div className="text-xs text-amber-600 mt-1 font-medium">Below breakeven target</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {forecastCombined > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Combined (Operating + Debt)</CardTitle>
                        <CardDescription className="text-xs">Operating + loan servicing</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-semibold text-muted-foreground">
                          ${forecastCombined.toLocaleString()}/mo
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Slow Folk requirement</div>
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-muted-foreground">Benchmark achieves:</div>
                          <div className="text-2xl font-bold">
                            ${(benchmarkTotalRevenue / (monthlyData.length || 1)).toFixed(0).toLocaleString()}/mo
                          </div>
                          {(benchmarkTotalRevenue / (monthlyData.length || 1)) > forecastCombined ? (
                            <div className="text-xs text-green-600 mt-1 font-medium">✓ Covers loan servicing</div>
                          ) : (
                            <div className="text-xs text-amber-600 mt-1 font-medium">Below loan threshold</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {forecastCombinedProfit > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Combined + Profit</CardTitle>
                        <CardDescription className="text-xs">Operating + debt + 15% margin</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-semibold text-muted-foreground">
                          ${forecastCombinedProfit.toLocaleString()}/mo
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Slow Folk target</div>
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-muted-foreground">Benchmark achieves:</div>
                          <div className="text-2xl font-bold">
                            ${(benchmarkTotalRevenue / (monthlyData.length || 1)).toFixed(0).toLocaleString()}/mo
                          </div>
                          {(benchmarkTotalRevenue / (monthlyData.length || 1)) > forecastCombinedProfit ? (
                            <div className="text-xs text-green-600 mt-1 font-medium">✓ Achieves profit target</div>
                          ) : (
                            <div className="text-xs text-amber-600 mt-1 font-medium">Below profit target</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </section>
            )}

            {/* Detailed Operational Metrics */}
            <section>
              <h2 className="notion-h1">Detailed Operational Metrics</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Session Capacity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{benchmarkAvgCapacity.toFixed(0)} guests</div>
                    <div className="text-xs text-muted-foreground mt-1">{venueName} avg</div>
                    <div className="mt-2 pt-2 border-t text-sm">
                      <div className="text-muted-foreground">Theoretical/week:</div>
                      <div className="font-semibold">
                        {(benchmarkAvgCapacity * benchmarkSessionsPerWeek).toFixed(0)} seats
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Revenue Per Session</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${benchmarkRevenuePerSession.toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{venueName} actual</div>
                    <div className="mt-2 pt-2 border-t text-sm">
                      <div className="text-muted-foreground">Slow Folk target:</div>
                      <div className="font-semibold text-muted-foreground">
                        ${(forecastMonthlyRevenue / (forecastSessions * 52 / 12) || 0).toFixed(0)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Daily Sessions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(benchmarkSessionsPerWeek / 7).toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{venueName} actual</div>
                    <div className="mt-2 pt-2 border-t text-sm">
                      <div className="text-muted-foreground">Slow Folk target:</div>
                      <div className="font-semibold text-muted-foreground">
                        {(forecastSessions / 7).toFixed(1)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
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
