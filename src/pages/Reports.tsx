import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Navigation } from '@/components/Navigation';
import { VenueSummary } from '@/components/VenueSummary';
import { MonthlyTable } from '@/components/MonthlyTable';
import { DemandPatterns } from '@/components/DemandPatterns';
import { CapacityUtilisation } from '@/components/CapacityUtilisation';
import { PricingAnalysis } from '@/components/PricingAnalysis';
import { getSavedReports, deleteReport, type SavedReport } from '@/components/SavedReports';
import { calculateBenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Reports = () => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);

  useEffect(() => {
    setReports(getSavedReports());
  }, []);

  const handleDeleteReport = (id: string) => {
    const updated = deleteReport(id);
    setReports(updated);
    if (selectedReport?.id === id) {
      setSelectedReport(null);
    }
  };

  const handleSelectReport = (report: SavedReport) => {
    setSelectedReport(report);
  };

  const benchmarkMetrics = useMemo(() => {
    if (!selectedReport) return null;
    return calculateBenchmarkMetrics(
      selectedReport.sessions,
      new Date(selectedReport.dateRange.from).toISOString(),
      new Date(selectedReport.dateRange.to).toISOString()
    );
  }, [selectedReport]);

  const formatDateRange = (from: string, to: string) => {
    try {
      return `${format(parseISO(from), 'MMM d, yyyy')} – ${format(parseISO(to), 'MMM d, yyyy')}`;
    } catch {
      return `${from} – ${to}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="notion-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Saved Reports</h1>
          <p className="text-sm text-muted-foreground">
            View previously saved venue reports
          </p>
        </div>

        {/* Reports List */}
        {!selectedReport && (
          <>
            {reports.length === 0 ? (
              <div className="text-center py-20">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  No Saved Reports
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Fetch venue data from the Benchmark page and save reports to view them here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report) => (
                  <Card 
                    key={report.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => handleSelectReport(report)}
                  >
                    <CardContent className="p-5">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-semibold truncate">{report.name}</h3>
                          <p className="text-sm text-muted-foreground">{report.venueName}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {report.sessions.length} sessions
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {report.monthlyData.length} months
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>{formatDateRange(report.dateRange.from, report.dateRange.to)}</p>
                          <p>Saved {format(parseISO(report.savedAt), 'MMM d, yyyy h:mma')}</p>
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => { e.stopPropagation(); handleSelectReport(report); }}
                          >
                            View
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Selected Report View */}
        {selectedReport && benchmarkMetrics && (
          <>
            {/* Report Header */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedReport.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedReport.venueName} • {formatDateRange(selectedReport.dateRange.from, selectedReport.dateRange.to)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Saved {format(parseISO(selectedReport.savedAt), 'MMM d, yyyy h:mma')}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)}>
                  ← Back to List
                </Button>
              </div>
            </div>

            {/* Report Content */}
            <div className="space-y-10">
              <section>
                <h2 className="notion-h1">Venue Summary</h2>
                <VenueSummary
                  metrics={benchmarkMetrics}
                  venueConfig={selectedReport.venueConfig}
                  monthlyData={selectedReport.monthlyData}
                  hostInfo={selectedReport.hostInfo}
                />
              </section>

              <section>
                <h2 className="notion-h1">Monthly Performance</h2>
                <MonthlyTable data={selectedReport.monthlyData} sessions={selectedReport.sessions} />
              </section>

              <section>
                <h2 className="notion-h1">Demand Patterns</h2>
                <DemandPatterns sessions={selectedReport.sessions} />
              </section>

              <section>
                <h2 className="notion-h1">Capacity Trend</h2>
                <CapacityUtilisation metrics={selectedReport.metrics} monthlyData={selectedReport.monthlyData} />
              </section>

              <section>
                <h2 className="notion-h1">Pricing & Offerings</h2>
                <PricingAnalysis sessions={selectedReport.sessions} />
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
