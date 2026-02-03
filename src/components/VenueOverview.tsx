import type { VenueConfig } from '@/types/momence';
import { Building2, Clock, DollarSign, Users, Calendar, Sun } from 'lucide-react';

interface VenueOverviewProps {
  config: VenueConfig | null;
}

export function VenueOverview({ config }: VenueOverviewProps) {
  if (!config) {
    return (
      <div className="stat-card">
        <h3 className="section-title">
          <Building2 className="w-5 h-5 text-primary" />
          Venue Configuration
        </h3>
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  const items = [
    { icon: Building2, label: 'Session Type', value: config.sessionType },
    { icon: Clock, label: 'Duration', value: `${config.duration} min` },
    { icon: DollarSign, label: 'Price', value: `$${config.price} AUD` },
    { icon: Users, label: 'Capacity', value: `${config.capacity} guests` },
    { icon: Calendar, label: 'Sessions/Day', value: config.sessionsPerDay.toFixed(1) },
    { icon: Sun, label: 'Operating Hours', value: config.operatingHours },
  ];

  return (
    <div className="stat-card">
      <h3 className="section-title">
        <Building2 className="w-5 h-5 text-primary" />
        Venue Configuration
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</div>
                <div className="text-foreground font-medium">{item.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
