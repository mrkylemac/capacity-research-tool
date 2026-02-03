import type { TimeSlotData } from '@/types/momence';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DemandPatternsProps {
  data: TimeSlotData[];
}

export function DemandPatterns({ data }: DemandPatternsProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 text-center text-muted-foreground">
          No data available. Fetch sessions to see demand patterns.
        </CardContent>
      </Card>
    );
  }

  const maxUtil = Math.max(...data.map(d => d.utilisation));

  return (
    <Card>
      <CardContent className="p-5">
        {/* Table View */}
        <div className="overflow-x-auto mb-6">
          <table className="notion-table">
            <thead>
              <tr>
                <th>Time Slot</th>
                <th className="text-right">Avg Tickets</th>
                <th className="text-right">Capacity</th>
                <th className="text-right">Utilisation</th>
                <th className="text-center">Demand</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  <td className="font-medium">{row.slot}</td>
                  <td className="text-right">{row.avgTickets}</td>
                  <td className="text-right">{row.capacity}</td>
                  <td className="text-right">{row.utilisation.toFixed(1)}%</td>
                  <td className="text-center">
                    <Badge variant={getBadgeVariant(row.utilisationBand)}>
                      {row.utilisationBand}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bar Chart */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            Utilisation by Time Slot
          </p>
          {data.map((row, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-24 text-xs text-muted-foreground truncate">{row.slot}</div>
              <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarClass(row.utilisationBand)}`}
                  style={{ width: `${(row.utilisation / maxUtil) * 100}%` }}
                />
              </div>
              <div className="w-10 text-xs text-right text-muted-foreground">
                {row.utilisation.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function getBadgeVariant(band: 'High' | 'Medium' | 'Low'): 'default' | 'secondary' | 'destructive' {
  switch (band) {
    case 'High': return 'default';
    case 'Medium': return 'secondary';
    case 'Low': return 'destructive';
  }
}

function getBarClass(band: 'High' | 'Medium' | 'Low'): string {
  switch (band) {
    case 'High': return 'bg-green-500';
    case 'Medium': return 'bg-amber-500';
    case 'Low': return 'bg-red-500';
  }
}
