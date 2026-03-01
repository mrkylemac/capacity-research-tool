import type { MomenceSession } from '@/types/momence';
import { Card, CardContent } from '@/components/ui/card';

interface PricingAnalysisProps {
  sessions: MomenceSession[];
}

interface PricePoint {
  price: number;
  sessionCount: number;
  classNames: string[];
  avgDuration: number;
  avgCapacity: number;
  avgOccupancy: number;
}

interface Offering {
  name: string;
  sessionCount: number;
  price: number;
  duration: number;
  capacity: number;
  avgVisitors: number;
  occupancyRate: number;
}

export function PricingAnalysis({ sessions }: PricingAnalysisProps) {
  if (sessions.length === 0 || !sessions.some(s => s.fixedTicketPrice > 0)) return null;

  // Analyze price points
  const priceMap = new Map<number, MomenceSession[]>();
  sessions.forEach(s => {
    const price = s.fixedTicketPrice;
    if (!priceMap.has(price)) priceMap.set(price, []);
    priceMap.get(price)!.push(s);
  });

  const pricePoints: PricePoint[] = [];
  priceMap.forEach((priceSessions, price) => {
    const classNames = [...new Set(priceSessions.map(s => s.sessionName))];
    const avgDuration = priceSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / priceSessions.length;
    const avgCapacity = priceSessions.reduce((sum, s) => sum + s.capacity, 0) / priceSessions.length;
    const totalVisitors = priceSessions.reduce((sum, s) => sum + s.ticketsSold, 0);
    const totalCapacity = priceSessions.reduce((sum, s) => sum + s.capacity, 0);
    const avgOccupancy = totalCapacity > 0 ? (totalVisitors / totalCapacity) * 100 : 0;

    pricePoints.push({
      price,
      sessionCount: priceSessions.length,
      classNames,
      avgDuration: Math.round(avgDuration),
      avgCapacity: Math.round(avgCapacity),
      avgOccupancy,
    });
  });

  pricePoints.sort((a, b) => b.sessionCount - a.sessionCount);

  // Analyze offerings by class name
  const offeringMap = new Map<string, MomenceSession[]>();
  sessions.forEach(s => {
    const name = s.sessionName;
    if (!offeringMap.has(name)) offeringMap.set(name, []);
    offeringMap.get(name)!.push(s);
  });

  const offerings: Offering[] = [];
  offeringMap.forEach((offeringSessions, name) => {
    const totalVisitors = offeringSessions.reduce((sum, s) => sum + s.ticketsSold, 0);
    const totalCapacity = offeringSessions.reduce((sum, s) => sum + s.capacity, 0);
    
    offerings.push({
      name,
      sessionCount: offeringSessions.length,
      price: offeringSessions[0].fixedTicketPrice,
      duration: offeringSessions[0].durationMinutes,
      capacity: offeringSessions[0].capacity,
      avgVisitors: offeringSessions.length > 0 ? totalVisitors / offeringSessions.length : 0,
      occupancyRate: totalCapacity > 0 ? (totalVisitors / totalCapacity) * 100 : 0,
    });
  });

  offerings.sort((a, b) => b.sessionCount - a.sessionCount);

  // Calculate insights
  const uniquePrices = pricePoints.length;
  const priceRange = pricePoints.length > 0
    ? { min: Math.min(...pricePoints.map(p => p.price)), max: Math.max(...pricePoints.map(p => p.price)) }
    : { min: 0, max: 0 };
  const mostPopularOffering = offerings[0];
  const highestOccupancy = offerings.length > 0
    ? offerings.reduce((best, curr) => curr.occupancyRate > best.occupancyRate ? curr : best)
    : null;

  return (
    <div className="space-y-6">
      {/* Insights Summary */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-md text-muted-foreground mb-1">Unique Offerings</p>
              <p className="text-xl font-semibold">{offerings.length}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-md text-muted-foreground mb-1">Price Range</p>
              <p className="text-xl font-semibold">
                ${priceRange.min} – ${priceRange.max}
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-md text-muted-foreground mb-1">Most Offered</p>
              <p className="text-lg font-semibold truncate" title={mostPopularOffering?.name}>
                {mostPopularOffering?.name || '-'}
              </p>
              <p className="text-md text-muted-foreground">{mostPopularOffering?.sessionCount} sessions</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-md text-muted-foreground mb-1">Highest Occupancy</p>
              <p className="text-lg font-semibold truncate" title={highestOccupancy?.name}>
                {highestOccupancy?.name || '-'}
              </p>
              <p className="text-md text-muted-foreground">{highestOccupancy?.occupancyRate.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offerings Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm">Class Offerings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="notion-table min-w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th>Class Name</th>
                  <th className="text-right">Sessions</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Duration</th>
                  <th className="text-right">Capacity</th>
                  <th className="text-right">Avg Visitors</th>
                  <th className="text-right">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {offerings.slice(0, 15).map((offering, index) => (
                  <tr key={index}>
                    <td className="font-medium max-w-[200px] truncate" title={offering.name}>
                      {offering.name}
                    </td>
                    <td className="text-right">{offering.sessionCount}</td>
                    <td className="text-right">${offering.price}</td>
                    <td className="text-right">{offering.duration}min</td>
                    <td className="text-right">{offering.capacity}</td>
                    <td className="text-right">{offering.avgVisitors.toFixed(1)}</td>
                    <td className={`text-right ${getOccupancyClass(offering.occupancyRate)}`}>
                      {offering.occupancyRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {offerings.length > 15 && (
            <div className="p-3 text-center text-md text-muted-foreground border-t">
              Showing top 15 of {offerings.length} offerings
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Points */}
      {uniquePrices > 1 && (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm">Price Point Analysis</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="notion-table min-w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-right">Price</th>
                    <th className="text-right">Sessions</th>
                    <th className="text-right">Avg Duration</th>
                    <th className="text-right">Avg Capacity</th>
                    <th className="text-right">Occupancy</th>
                    <th>Classes at this price</th>
                  </tr>
                </thead>
                <tbody>
                  {pricePoints.map((pp, index) => (
                    <tr key={index}>
                      <td className="text-right font-medium">${pp.price}</td>
                      <td className="text-right">{pp.sessionCount}</td>
                      <td className="text-right">{pp.avgDuration}min</td>
                      <td className="text-right">{pp.avgCapacity}</td>
                      <td className={`text-right ${getOccupancyClass(pp.avgOccupancy)}`}>
                        {pp.avgOccupancy.toFixed(1)}%
                      </td>
                      <td className="text-md text-muted-foreground max-w-[300px] truncate">
                        {pp.classNames.slice(0, 3).join(', ')}
                        {pp.classNames.length > 3 && ` +${pp.classNames.length - 3} more`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getOccupancyClass(rate: number): string {
  if (rate >= 70) return 'text-green-600 font-medium';
  if (rate >= 40) return 'text-amber-600';
  return 'text-red-600';
}
