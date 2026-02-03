import type { SessionMetrics, VenueConfig, MonthlyData } from '@/types/momence';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Target 
} from 'lucide-react';

interface SummaryCardsProps {
  metrics: SessionMetrics | null;
  venueConfig: VenueConfig | null;
  monthlyData: MonthlyData[];
}

export function SummaryCards({ metrics, venueConfig, monthlyData }: SummaryCardsProps) {
  if (!metrics || !venueConfig) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="stat-card animate-pulse">
            <div className="h-4 bg-muted rounded w-20 mb-2"></div>
            <div className="h-8 bg-muted rounded w-16"></div>
          </div>
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
      icon: Users,
      color: 'text-secondary',
    },
    {
      label: 'Weekly Visitors',
      value: avgWeeklyVisitors.toLocaleString(),
      sublabel: 'avg',
      icon: Users,
      color: 'text-secondary',
    },
    {
      label: 'Ticket Price',
      value: `$${venueConfig.price}`,
      sublabel: 'AUD',
      icon: DollarSign,
      color: 'text-success',
    },
    {
      label: 'Session Capacity',
      value: venueConfig.capacity.toString(),
      sublabel: 'per session',
      icon: Target,
      color: 'text-warning',
    },
    {
      label: 'Avg Utilisation',
      value: `${metrics.avgUtilisation.toFixed(1)}%`,
      sublabel: 'of capacity',
      icon: TrendingUp,
      color: metrics.avgUtilisation >= 70 ? 'text-success' : metrics.avgUtilisation >= 40 ? 'text-warning' : 'text-error',
    },
    {
      label: 'Monthly Revenue',
      value: `$${Math.round(avgMonthlyRevenue).toLocaleString()}`,
      sublabel: 'avg',
      icon: DollarSign,
      color: 'text-success',
    },
    {
      label: 'Operating Since',
      value: metrics.operatingSince,
      sublabel: 'first session',
      icon: Clock,
      color: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">{card.label}</span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className="stat-value">{card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.sublabel}</div>
          </div>
        );
      })}
    </div>
  );
}
