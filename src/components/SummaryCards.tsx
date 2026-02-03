import type { SessionMetrics, VenueConfig, MonthlyData } from '@/types/momence';
import { Card, CardContent } from '@/components/ui/card';

interface SummaryCardsProps {
  metrics: SessionMetrics | null;
  venueConfig: VenueConfig | null;
  monthlyData: MonthlyData[];
}

export function SummaryCards({ metrics, venueConfig, monthlyData }: SummaryCardsProps) {
  if (!metrics || !venueConfig) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-3 bg-muted rounded w-20 mb-2"></div>
              <div className="h-6 bg-muted rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const avgMonthlyVisitors = monthlyData.length > 0
    ? Math.round(monthlyData.reduce((sum, m) => sum + m.ticketsSold, 0) / monthlyData.length)
    : 0;

  const avgWeeklyVisitors = Math.round(avgMonthlyVisitors / 4.33);
  
  const avgMonthlyRevenue = monthlyData.length > 0
    ? monthlyData.reduce((sum, m) => sum + m.revenue, 0) / monthlyData.length
    : 0;

  const cards = [
    {
      label: 'Monthly Visitors',
      value: avgMonthlyVisitors.toLocaleString(),
      sublabel: 'avg',
    },
    {
      label: 'Weekly Visitors',
      value: avgWeeklyVisitors.toLocaleString(),
      sublabel: 'avg',
    },
    {
      label: 'Ticket Price',
      value: `$${venueConfig.price}`,
      sublabel: 'AUD',
    },
    {
      label: 'Session Capacity',
      value: venueConfig.capacity.toString(),
      sublabel: 'per session',
    },
    {
      label: 'Avg Utilisation',
      value: `${metrics.avgUtilisation.toFixed(1)}%`,
      sublabel: 'of capacity',
      highlight: metrics.avgUtilisation >= 70 ? 'high' : metrics.avgUtilisation >= 40 ? 'medium' : 'low',
    },
    {
      label: 'Monthly Revenue',
      value: `$${Math.round(avgMonthlyRevenue).toLocaleString()}`,
      sublabel: 'avg',
    },
    {
      label: 'Operating Since',
      value: metrics.operatingSince,
      sublabel: 'first session',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <p className={`text-xl font-semibold ${
              card.highlight === 'high' ? 'text-green-600' :
              card.highlight === 'medium' ? 'text-amber-600' :
              card.highlight === 'low' ? 'text-red-600' :
              'text-foreground'
            }`}>
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground">{card.sublabel}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
