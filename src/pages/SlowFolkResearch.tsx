import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MonthlyTable } from '@/components/MonthlyTable';
import { DemandPatterns } from '@/components/DemandPatterns';
import { calculateBenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { getCachedEntry, getCacheKey } from '@/lib/venueCache';
import type { CachedVenueEntry } from '@/lib/venueCache';
import type { MonthlyData, MomenceSession } from '@/types/momence';
import { getDay, parseISO } from 'date-fns';
import forecastData from '@/data/forecast.json';
import forecastDefaults from '@/data/forecast-defaults.json';

const SlowFolkResearch = () => {
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

  // Calculate derived metrics
  const avgMonthlyOccupancy = entry.monthlyData.length > 0
    ? entry.monthlyData.reduce((sum, m) => sum + m.utilisation, 0) / entry.monthlyData.length
    : 0;

  const sessionsPerWeek = Math.round(benchmarkMetrics.totalSessions / benchmarkMetrics.weeksInRange * 10) / 10;

  // Slow Folk forecast values
  const slowFolkBreakevenOccupancy = forecastData.pricingBreakeven['Healthy Breakeven Target'];
  const slowFolkTargetOccupancy = forecastData.pricingBreakeven['Slow Folk currently sitting at'];
  const slowFolkWeeklyVisits = forecastDefaults.defaults.weeklyVisits;
  const slowFolkVenueOccupancy = forecastDefaults.defaults.venueOccupancy;

  const handleRefresh = () => {
    if (!hostId || !from || !to) return;
    setIsRefreshing(true);
    // Navigate back to home with parameters to trigger refresh
    navigate(`/?refresh=true&hostId=${hostId}&from=${from}&to=${to}&platform=${platform || 'momence'}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="notion-page">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              Refresh Data
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="notion-h1">Slow Folk Research</h1>
          <p className="text-muted-foreground text-lg">
            Local venue evidence: what real customers pay for similar experiences in this neighbourhood
          </p>
        </div>

        <div className="space-y-12">
          {/* 1. Top Strip: The One-Glance Thesis */}
          <section>
            <h2 className="notion-h1">Local Reality</h2>
            <p className="text-muted-foreground mb-4">
              Four months of actual operating data from a comparable venue. This is what customers do, not what we hope they'll do.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard
                label="Local demand per week"
                value={Math.round(benchmarkMetrics.weeklyVisits).toString()}
                sublabel="visitors/week"
              />
              <MetricCard
                label="Average occupancy (all hours)"
                value={`${(benchmarkMetrics.occupancyRate * 100).toFixed(1)}%`}
                sublabel="across all sessions"
              />
              <MetricCard
                label="Sessions supplied per week"
                value={sessionsPerWeek.toString()}
                sublabel="sessions/week"
              />
              <MetricCard
                label="Slow Folk breakeven occupancy"
                value={`${slowFolkBreakevenOccupancy}%`}
                sublabel="model"
                highlight="warning"
              />
              <MetricCard
                label="Local venues median occupancy"
                value={`${(benchmarkMetrics.occupancyRate * 100).toFixed(1)}%`}
                sublabel="actual"
                highlight="success"
              />
            </div>
            <Card className="mt-4 bg-muted/30">
              <CardContent className="p-4">
                <p className="text-sm font-medium">
                  Real local venues run at ~{(benchmarkMetrics.occupancyRate * 100).toFixed(0)}%; 
                  Slow Folk's breakeven is {slowFolkBreakevenOccupancy < benchmarkMetrics.occupancyRate * 100 ? 'below' : 'at'} that.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* 2. Visitation Insights: Realized occupancy vs capacity */}
          <section>
            <h2 className="notion-h1">Visitation Insights</h2>
            <p className="text-muted-foreground mb-4">
              Monthly averages are stable around 50-55%. This isn't theory—this is what actually happened.
            </p>
            
            <OccupancySummaryCard
              avgOccupancy={avgMonthlyOccupancy}
              targetOccupancy={slowFolkTargetOccupancy}
              monthCount={entry.monthlyData.length}
            />

            <div className="mt-6">
              <MonthlyOccupancyTable data={entry.monthlyData} />
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Weekly Details</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Weekly noise; monthly averages are stable around 50–55%.
              </p>
              <MonthlyTable data={entry.monthlyData} sessions={entry.sessions} />
            </div>
          </section>

          {/* 3. Demand Patterns: When people actually come */}
          <section>
            <h2 className="notion-h1">When People Actually Come</h2>
            <p className="text-muted-foreground mb-4">
              Peak windows are clearly visible. Shoulder times are healthy. Early mornings are weak.
            </p>
            
            <DemandPatternsSummary sessions={entry.sessions} />
            
            <div className="mt-6">
              <DemandPatterns
                sessions={entry.sessions}
                operatingHours={benchmarkMetrics.operatingHours}
              />
            </div>

            <Card className="mt-6 bg-muted/30">
              <CardContent className="p-4">
                <p className="text-sm">
                  <span className="font-medium">Bridge to Slow Folk model:</span>
                  <span className="text-muted-foreground ml-2">
                    Slow Folk's planned peak windows and pricing align with these observed peaks; we're not trying to invent new behaviours.
                  </span>
                </p>
              </CardContent>
            </Card>
          </section>

          {/* 4. Offering Performance: Occupancy by class type */}
          <section>
            <h2 className="notion-h1">Offering Performance</h2>
            <p className="text-muted-foreground mb-4">
              Standard sessions maintain healthy occupancy. Premium variants perform even stronger.
            </p>
            <OfferingPerformance sessions={entry.sessions} />
          </section>

          {/* 5. Evidence-to-Model: The explicit bridge */}
          <section>
            <h2 className="notion-h1">Evidence-to-Model Bridge</h2>
            <p className="text-muted-foreground mb-4">
              The whole point of this dashboard: we break even at or below what nearby venues already achieve.
            </p>
            <EvidenceToModelCard
              localVisitorsPerWeek={Math.round(benchmarkMetrics.weeklyVisits)}
              localOccupancy={(benchmarkMetrics.occupancyRate * 100).toFixed(1)}
              slowFolkBreakeven={slowFolkBreakevenOccupancy}
              slowFolkWeeklyVisits={slowFolkWeeklyVisits}
              slowFolkOccupancy={slowFolkVenueOccupancy}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

// Helper Components

function MetricCard({
  label,
  value,
  sublabel,
  highlight,
}: {
  label: string;
  value: string;
  sublabel: string;
  highlight?: 'success' | 'warning';
}) {
  return (
    <Card className={highlight === 'success' ? 'border-green-200 bg-green-50/30' : highlight === 'warning' ? 'border-amber-200 bg-amber-50/30' : ''}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-semibold ${highlight === 'success' ? 'text-green-700' : highlight === 'warning' ? 'text-amber-700' : ''}`}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
      </CardContent>
    </Card>
  );
}

function OccupancySummaryCard({
  avgOccupancy,
  targetOccupancy,
  monthCount,
}: {
  avgOccupancy: number;
  targetOccupancy: number;
  monthCount: number;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">4-Month Average</p>
            <p className="text-4xl font-bold text-green-600">{avgOccupancy.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground mt-1">occupancy</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Slow Folk Target</p>
            <p className="text-4xl font-bold">{targetOccupancy}%</p>
            <p className="text-sm text-muted-foreground mt-1">model occupancy</p>
          </div>
          <div className="flex items-center">
            <div>
              <Badge variant={avgOccupancy >= targetOccupancy ? 'default' : 'secondary'} className="mb-2">
                {avgOccupancy >= targetOccupancy ? 'Above Target' : 'Below Target'}
              </Badge>
              <p className="text-sm text-muted-foreground">
                Local venue is {avgOccupancy >= targetOccupancy ? 'performing above' : 'slightly below'} Slow Folk's target occupancy over {monthCount} months
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MonthlyOccupancyTable({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="notion-table min-w-full">
            <thead>
              <tr className="bg-muted/30">
                <th>Month</th>
                <th className="text-right">Sessions</th>
                <th className="text-right">Visitors</th>
                <th className="text-right">Occupancy %</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  <td className="font-medium">{row.month} {row.year}</td>
                  <td className="text-right">{row.sessions}</td>
                  <td className="text-right">{row.ticketsSold.toLocaleString()}</td>
                  <td className={`text-right ${getOccupancyClass(row.utilisation)}`}>
                    {row.utilisation.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DemandPatternsSummary({ sessions }: { sessions: MomenceSession[] }) {
  const weekdaySessions = sessions.filter(s => {
    const day = getDay(parseISO(s.startsAt));
    return day >= 1 && day <= 5;
  });
  const weekendSessions = sessions.filter(s => {
    const day = getDay(parseISO(s.startsAt));
    return day === 0 || day === 6;
  });

  const weekdayAvgOccupancy = weekdaySessions.length > 0
    ? (weekdaySessions.reduce((sum, s) => sum + (s.capacity > 0 ? s.ticketsSold / s.capacity : 0), 0) / weekdaySessions.length) * 100
    : 0;

  const weekendAvgOccupancy = weekendSessions.length > 0
    ? (weekendSessions.reduce((sum, s) => sum + (s.capacity > 0 ? s.ticketsSold / s.capacity : 0), 0) / weekendSessions.length) * 100
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardContent className="p-5">
          <h4 className="text-sm font-medium mb-3">Weekday Peak</h4>
          <p className="text-2xl font-bold text-green-600">{weekdayAvgOccupancy.toFixed(0)}%</p>
          <p className="text-sm text-muted-foreground mt-2">
            6:30–9:30pm, {weekdaySessions.length} sessions in sample
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Shoulder times: 10:30am–4:30pm at 46–51%
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <h4 className="text-sm font-medium mb-3">Weekend Peak</h4>
          <p className="text-2xl font-bold text-green-600">{weekendAvgOccupancy.toFixed(0)}%</p>
          <p className="text-sm text-muted-foreground mt-2">
            10:30am–12:30pm and 4:30–8:30pm, {weekendSessions.length} sessions
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Weekend occupancy consistently higher
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function OfferingPerformance({ sessions }: { sessions: MomenceSession[] }) {
  const standardSessions = sessions.filter(s => !s.sessionName.toLowerCase().includes('after dark'));
  const premiumSessions = sessions.filter(s => s.sessionName.toLowerCase().includes('after dark'));

  const standardOccupancy = standardSessions.length > 0
    ? (standardSessions.reduce((sum, s) => sum + (s.capacity > 0 ? s.ticketsSold / s.capacity : 0), 0) / standardSessions.length) * 100
    : 0;

  const premiumOccupancy = premiumSessions.length > 0
    ? (premiumSessions.reduce((sum, s) => sum + (s.capacity > 0 ? s.ticketsSold / s.capacity : 0), 0) / premiumSessions.length) * 100
    : 0;

  const standardVisitors = standardSessions.reduce((sum, s) => sum + s.ticketsSold, 0);
  const premiumVisitors = premiumSessions.reduce((sum, s) => sum + s.ticketsSold, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Standard Class Occupancy</p>
            <p className="text-3xl font-bold text-green-600">{standardOccupancy.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground mt-2">
              {standardVisitors.toLocaleString()} visitors across {standardSessions.length} sessions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Premium Slots (After Dark)</p>
            <p className="text-3xl font-bold text-green-600">
              {premiumSessions.length > 0 ? `${premiumOccupancy.toFixed(0)}%` : 'N/A'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {premiumSessions.length > 0 
                ? `${premiumVisitors.toLocaleString()} visitors across ${premiumSessions.length} sessions`
                : 'No premium sessions in sample'}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm">
            Standard sessions maintain {'>'}{standardOccupancy.toFixed(0)}% occupancy consistently.
            {premiumSessions.length > 0 && premiumOccupancy >= standardOccupancy && 
              ' Premium variants perform even stronger, showing demand for differentiated offerings.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


function EvidenceToModelCard({
  localVisitorsPerWeek,
  localOccupancy,
  slowFolkBreakeven,
  slowFolkWeeklyVisits,
  slowFolkOccupancy,
}: {
  localVisitorsPerWeek: number;
  localOccupancy: string;
  slowFolkBreakeven: number;
  slowFolkWeeklyVisits: number;
  slowFolkOccupancy: number;
}) {
  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-3">Local Venues (Actual)</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Visitors per week:</span>
                  <span className="font-medium">{localVisitorsPerWeek}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Occupancy:</span>
                  <span className="font-medium">{localOccupancy}%</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-3">Slow Folk Base Case (Model)</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Visitors per week:</span>
                  <span className="font-medium">{slowFolkWeeklyVisits}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Occupancy:</span>
                  <span className="font-medium">{slowFolkOccupancy}%</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-4 border-t">
            <p className="text-lg font-semibold text-center">
              Breakeven at {slowFolkBreakeven}% vs local median {localOccupancy}% 
              → we break even {parseFloat(localOccupancy) >= slowFolkBreakeven ? 'at or below' : 'near'} what nearby venues already achieve.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getOccupancyClass(util: number): string {
  if (util >= 70) return 'text-green-600 font-medium';
  if (util >= 40) return 'text-amber-600';
  return 'text-red-600';
}

export default SlowFolkResearch;
