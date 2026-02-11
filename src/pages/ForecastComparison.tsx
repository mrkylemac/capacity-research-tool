import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useSessions } from '@/hooks/useSessions';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import forecastData from '@/data/forecast.json';

interface ForecastData {
  pricingBreakeven: Record<string, number | string>;
  venueCapacity: Record<string, number | string>;
  cashFlow: Array<{ month: string; forecast: number }>;
  lastUpdated: string;
}

function ComparisonCard({ 
  title, 
  actual, 
  forecast, 
  format = 'number' 
}: { 
  title: string; 
  actual: number; 
  forecast: number; 
  format?: 'number' | 'currency' | 'percent';
}) {
  const variance = actual - forecast;
  const percentDiff = forecast !== 0 ? (variance / forecast) * 100 : 0;
  
  const formatValue = (val: number) => {
    if (format === 'currency') return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (format === 'percent') return `${val.toFixed(1)}%`;
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };
  
  const Icon = percentDiff > 2 ? TrendingUp : percentDiff < -2 ? TrendingDown : Minus;
  const colorClass = percentDiff > 2 ? 'text-green-600' : percentDiff < -2 ? 'text-red-600' : 'text-gray-500';
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{formatValue(actual)}</div>
            <div className="text-xs text-muted-foreground">Actual</div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-lg font-semibold text-muted-foreground">{formatValue(forecast)}</div>
            <div className="text-xs text-muted-foreground">Forecast</div>
          </div>
        </div>
        <div className={`flex items-center gap-1 mt-3 text-sm ${colorClass}`}>
          <Icon className="h-4 w-4" />
          <span className="font-medium">
            {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
          </span>
          <span className="text-muted-foreground text-xs">vs forecast</span>
        </div>
      </CardContent>
    </Card>
  );
}

const ForecastComparison = () => {
  const { allSessions, metrics, monthlyData, isLoading, fetchData } = useSessions();
  const [hasLoadedData, setHasLoadedData] = useState(false);

  useEffect(() => {
    if (!hasLoadedData) {
      // Load last 6 months of actual data
      const to = new Date();
      const from = new Date();
      from.setMonth(from.getMonth() - 6);
      
      fetchData({
        hostId: '60', // Default to Slow Folk
        startsAtFrom: from.toISOString(),
        startsAtTo: to.toISOString(),
      });
      
      setHasLoadedData(true);
    }
  }, [hasLoadedData, fetchData]);

  const isLoaded = !isLoading && metrics && forecastData;
  
  // Calculate actual values from data
  const actualRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const actualCapacityUtilization = metrics?.capacityUtilization || 0;
  const actualAvgTicketPrice = metrics?.avgTicketPrice || 0;
  const actualSessionsPerWeek = (allSessions.length / 26) || 0; // Assuming 6 months
  
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
            <h1 className="text-2xl font-bold">Forecast vs Actual</h1>
            <p className="text-sm text-muted-foreground">
              Compare your forecasts with actual performance
            </p>
          </div>
          {forecastData.lastUpdated && (
            <div className="text-xs text-muted-foreground">
              Forecast updated: {new Date(forecastData.lastUpdated).toLocaleDateString()}
            </div>
          )}
        </div>

        {!hasForecastData && (
          <Alert className="mb-6">
            <AlertDescription>
              No forecast data found. Run <code className="text-xs bg-muted px-1 py-0.5 rounded">yarn fetch-forecast [SPREADSHEET_ID]</code> to import your Google Sheets data.
            </AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {isLoaded && (
          <div className="space-y-8">
            {/* Pricing & Revenue */}
            <section>
              <h2 className="notion-h1">Pricing & Revenue</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ComparisonCard
                  title="Total Revenue"
                  actual={actualRevenue}
                  forecast={forecastRevenue}
                  format="currency"
                />
                <ComparisonCard
                  title="Avg Ticket Price"
                  actual={actualAvgTicketPrice}
                  forecast={forecastAvgPrice}
                  format="currency"
                />
              </div>
            </section>

            {/* Venue Capacity */}
            <section>
              <h2 className="notion-h1">Venue Capacity</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ComparisonCard
                  title="Capacity Utilization"
                  actual={actualCapacityUtilization}
                  forecast={forecastCapacity}
                  format="percent"
                />
                <ComparisonCard
                  title="Sessions Per Week"
                  actual={actualSessionsPerWeek}
                  forecast={forecastSessions}
                  format="number"
                />
              </div>
            </section>

            {/* Cash Flow */}
            {forecastData?.cashFlow?.length > 0 && (
              <section>
                <h2 className="notion-h1">Monthly Cash Flow</h2>
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Month</CardTitle>
                    <CardDescription>Forecasted vs actual monthly performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {forecastData.cashFlow.slice(0, 6).map((item: any) => {
                        const actualMonth = monthlyData.find(m => 
                          m.month.toLowerCase().includes(item.month.toLowerCase().slice(0, 3))
                        );
                        const actualValue = actualMonth?.revenue || 0;
                        const variance = actualValue - item.forecast;
                        const percentDiff = item.forecast !== 0 ? (variance / item.forecast) * 100 : 0;
                        
                        return (
                          <div key={item.month} className="flex items-center justify-between border-b pb-2">
                            <div className="font-medium">{item.month}</div>
                            <div className="flex items-center gap-4">
                              <div className="text-sm">
                                <span className="text-muted-foreground">Forecast: </span>
                                <span className="font-semibold">${item.forecast.toLocaleString()}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Actual: </span>
                                <span className="font-semibold">${actualValue.toLocaleString()}</span>
                              </div>
                              <div className={`text-sm font-medium ${percentDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
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
      </div>
    </div>
  );
};

export default ForecastComparison;
