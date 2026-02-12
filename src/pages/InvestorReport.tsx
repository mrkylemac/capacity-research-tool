import { useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';
import { ArrowLeft, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { forecastTargets, hasForecastData, forecastLastUpdated } from '@/lib/forecastUtils';
import { getCachedEntry, getCacheKey, type CachedVenueEntry } from '@/lib/venueCache';
import { calculateMetrics, calculateMonthlyData } from '@/lib/metricsCalculator';
import type { MomenceSession } from '@/types/momence';

interface BenchmarkInput {
  venueName: string;
  hostId: string;
  platform: string;
  dateRange: { from: string; to: string };
  sessions: MomenceSession[];
}

const InvestorReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const hostId = searchParams.get('hostId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const platform = searchParams.get('platform') as CachedVenueEntry['platform'] | null;

  const benchmark = useMemo((): BenchmarkInput | null => {
    const state = location.state as { entry?: CachedVenueEntry; benchmark?: BenchmarkInput } | null;
    const stateEntry = state?.entry;
    const stateBenchmark = state?.benchmark;
    if (stateBenchmark) return stateBenchmark;
    if (stateEntry) {
      return {
        venueName: stateEntry.venueName,
        hostId: stateEntry.hostId,
        platform: stateEntry.platform,
        dateRange: stateEntry.dateRange,
        sessions: stateEntry.sessions,
      };
    }
    if (hostId && from && to && platform) {
      const key = getCacheKey(hostId, platform, from, to);
      const entry = getCachedEntry(key);
      if (entry) {
        return {
          venueName: entry.venueName,
          hostId: entry.hostId,
          platform: entry.platform,
          dateRange: entry.dateRange,
          sessions: entry.sessions,
        };
      }
    }
    return null;
  }, [location.state, hostId, from, to, platform]);

  const metrics = useMemo(() => {
    if (!benchmark) return null;
    const active = benchmark.sessions.filter(s => s.ticketsSold > 0);
    if (active.length === 0) return null;
    return calculateMetrics(active, benchmark.dateRange.from, benchmark.dateRange.to);
  }, [benchmark]);

  const monthlyData = useMemo(() => (benchmark ? calculateMonthlyData(benchmark.sessions) : []), [benchmark]);

  const handlePrint = () => {
    window.print();
  };

  if (!hasForecastData()) {
    return (
      <div className="min-h-screen bg-background">
        <div className="notion-page">
          <Alert>
            <AlertDescription>
              No Slow Folk estimates found. Run <code className="text-xs bg-muted px-1 py-0.5 rounded">yarn fetch-forecast [SPREADSHEET_ID]</code> to import your business plan from Google Sheets.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!benchmark || !metrics) {
    return (
      <div className="min-h-screen bg-background">
        <div className="notion-page">
          <Button variant="ghost" size="sm" className="-ml-2 mb-6" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Alert>
            <AlertDescription>
              Select a benchmark venue first. Go to <button className="underline font-medium" onClick={() => navigate('/')}>Numbers</button> or{' '}
              <button className="underline font-medium" onClick={() => navigate('/forecast-comparison')}>Forecasts</button>, fetch data, then generate the report.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const daysInRange = differenceInDays(parseISO(benchmark.dateRange.to), parseISO(benchmark.dateRange.from)) + 1;
  const weeksInRange = Math.max(1, daysInRange / 7);
  const benchmarkWeeklyVisits = metrics.totalTicketsSold / weeksInRange;
  const benchmarkAvgMonthlyRevenue = monthlyData.length > 0
    ? monthlyData.reduce((s, m) => s + m.revenue, 0) / monthlyData.length
    : 0;
  const benchmarkMonthlyRevenue = monthlyData.length > 1
    ? monthlyData.reduce((s, m) => s + m.revenue, 0) / monthlyData.length
    : benchmarkAvgMonthlyRevenue;

  const narrative = generateNarrative(benchmark.venueName, benchmarkWeeklyVisits, metrics.avgUtilisation, metrics.avgRevenuePerVisit, benchmarkMonthlyRevenue);

  return (
    <div className="min-h-screen bg-background">
      <div className="investor-report notion-page" id="investor-report-content">
        <div className="flex items-start justify-between gap-4 mb-6 print:mb-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 mb-2 print:hidden"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Slow Folk Investor Report</h1>
            <p className="text-sm text-muted-foreground">
              Benchmark validation: {benchmark.venueName} • {benchmark.dateRange.from} to {benchmark.dateRange.to}
            </p>
          </div>
          <Button variant="outline" size="sm" className="print:hidden" onClick={handlePrint}>
            <FileDown className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>

        <div className="space-y-8">
          <section>
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg">Executive Summary</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-2">
                  {narrative}
                </CardDescription>
              </CardHeader>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Key Performance Metrics</h2>
            <Card>
              <CardContent className="pt-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 font-medium">Metric</th>
                      <th className="text-right py-2 font-medium">Benchmark (Actual)</th>
                      <th className="text-right py-2 font-medium">Slow Folk (Target)</th>
                      <th className="text-right py-2 font-medium">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ReportRow metric="Weekly Visits" benchmark={benchmarkWeeklyVisits} target={forecastTargets.weeklyVisits} />
                    <ReportRow metric="Venue Occupancy" benchmark={metrics.avgUtilisation} target={forecastTargets.venueOccupancy} unit="%" />
                    <ReportRow metric="ARPV" benchmark={metrics.avgRevenuePerVisit} target={forecastTargets.arpv} format="currency" />
                    <ReportRow metric="Monthly Revenue" benchmark={benchmarkMonthlyRevenue} target={forecastTargets.monthlyRevenue} format="currency" />
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Breakeven Validation</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Can {benchmark.venueName}&apos;s performance support Slow Folk&apos;s breakeven scenarios?
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <BreakevenCard
                title="Operating Only"
                desc="Operating costs"
                target={forecastTargets.breakeven.operating}
                actual={benchmarkMonthlyRevenue}
              />
              <BreakevenCard
                title="Combined"
                desc="Operating + debt"
                target={forecastTargets.breakeven.combined}
                actual={benchmarkMonthlyRevenue}
              />
              <BreakevenCard
                title="Combined + Profit"
                desc="Operating + debt + margin"
                target={forecastTargets.breakeven.profit}
                actual={benchmarkMonthlyRevenue}
              />
            </div>
          </section>

          <section className="text-xs text-muted-foreground print:mt-8">
            <p>Data from {benchmark.venueName}. Slow Folk estimates: {forecastLastUpdated ? new Date(forecastLastUpdated).toLocaleDateString() : '—'}. Generated {new Date().toLocaleDateString()}.</p>
          </section>
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { print-color-adjust: exact; }
          .investor-report { max-width: 100%; }
        }
      `}</style>
    </div>
  );
};

function ReportRow({
  metric,
  benchmark,
  target,
  unit = '',
  format,
}: {
  metric: string;
  benchmark: number;
  target: number;
  unit?: string;
  format?: 'currency';
}) {
  const variance = target !== 0 ? ((benchmark - target) / target) * 100 : 0;
  const fmt = (v: number) =>
    format === 'currency' ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `${v.toFixed(1)}${unit}`;
  return (
    <tr className="border-b">
      <td className="py-3 font-medium">{metric}</td>
      <td className="text-right py-3">{fmt(benchmark)}</td>
      <td className="text-right py-3 text-muted-foreground">{fmt(target)}</td>
      <td className={`text-right py-3 font-medium ${variance >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
        {variance >= 0 ? '+' : ''}{variance.toFixed(0)}%
      </td>
    </tr>
  );
}

function BreakevenCard({
  title,
  desc,
  target,
  actual,
}: {
  title: string;
  desc: string;
  target: number;
  actual: number;
}) {
  const meets = actual >= target;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription className="text-xs">{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${target.toLocaleString()}/mo</div>
        <div className="text-xs text-muted-foreground mt-1">Slow Folk requirement</div>
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-muted-foreground">Benchmark achieves:</div>
          <div className="text-lg font-semibold">${actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo</div>
          <div className={`text-xs font-medium mt-1 ${meets ? 'text-green-600' : 'text-amber-600'}`}>
            {meets ? '✓ Exceeds' : 'Below target'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function generateNarrative(
  venueName: string,
  weeklyVisits: number,
  occupancy: number,
  arpv: number,
  monthlyRevenue: number
): string {
  const sf = forecastTargets;
  const occupancyAlign = Math.abs(occupancy - sf.venueOccupancy) < 10;
  const visitsAbove = weeklyVisits >= sf.weeklyVisits * 0.9;

  if (occupancy > sf.venueOccupancy * 1.2) {
    return `${venueName} achieves ${occupancy.toFixed(0)}% utilization vs Slow Folk's ${sf.venueOccupancy}% target, suggesting projections are conservative. At ${sf.weeklyVisits} weekly visits and $${sf.arpv.toFixed(2)} ARPV, Slow Folk projects $${sf.monthlyRevenue.toLocaleString()}/month. This provides upside potential while maintaining downside protection for the $${sf.breakeven.profit.toLocaleString()}/month profit target.`;
  }
  if (occupancyAlign && visitsAbove) {
    return `Slow Folk's venue occupancy target (${sf.venueOccupancy}%) aligns with ${venueName}'s actual performance (${occupancy.toFixed(0)}%). At ${sf.weeklyVisits} weekly visits and $${sf.arpv.toFixed(2)} ARPV, Slow Folk projects $${sf.monthlyRevenue.toLocaleString()}/month. This validates that our assumptions are grounded in real market conditions.`;
  }
  return `Slow Folk targets ${sf.venueOccupancy}% venue occupancy compared to ${venueName}'s ${occupancy.toFixed(0)}%. At ${sf.weeklyVisits} weekly visits and $${sf.arpv.toFixed(2)} ARPV, Slow Folk projects $${sf.monthlyRevenue.toLocaleString()}/month. ${venueName}'s data (${weeklyVisits.toFixed(0)} visits/week, $${monthlyRevenue.toLocaleString()}/mo) provides a realistic floor for stress-testing our $${sf.breakeven.combined.toLocaleString()}/month breakeven scenario.`;
}

export default InvestorReport;
