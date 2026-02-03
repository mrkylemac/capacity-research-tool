import type { VenueConfig } from '@/types/momence';
import { Card, CardContent } from '@/components/ui/card';

interface VenueOverviewProps {
  config: VenueConfig | null;
}

export function VenueOverview({ config }: VenueOverviewProps) {
  if (!config) {
    return (
      <Card>
        <CardContent className="p-5 animate-pulse space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 bg-muted rounded w-full"></div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const items = [
    { label: 'Session Type', value: config.sessionType },
    { label: 'Duration', value: `${config.duration} min` },
    { label: 'Price', value: `$${config.price} AUD` },
    { label: 'Capacity', value: `${config.capacity} guests` },
    { label: 'Sessions/Day', value: config.sessionsPerDay.toFixed(1) },
    { label: 'Operating Hours', value: config.operatingHours },
  ];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {items.map((item, index) => (
            <div key={index}>
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className="text-foreground font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
