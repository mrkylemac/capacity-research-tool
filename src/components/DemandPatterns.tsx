import type { TimeSlotData } from '@/types/momence';
import { Clock } from 'lucide-react';

interface DemandPatternsProps {
  data: TimeSlotData[];
}

export function DemandPatterns({ data }: DemandPatternsProps) {
  if (data.length === 0) {
    return (
      <div className="stat-card">
        <h3 className="section-title">
          <Clock className="w-5 h-5 text-secondary" />
          Demand by Time Slot
        </h3>
        <div className="text-center py-8 text-muted-foreground">
          No data available. Fetch sessions to see demand patterns.
        </div>
      </div>
    );
  }

  const maxUtil = Math.max(...data.map(d => d.utilisation));

  return (
    <div className="stat-card">
      <h3 className="section-title">
        <Clock className="w-5 h-5 text-secondary" />
        Demand by Time Slot
      </h3>
      
      {/* Table View */}
      <div className="overflow-x-auto mb-6">
        <table className="table-dashboard">
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
                  <span className={`badge badge-sm ${getBandClass(row.utilisationBand)}`}>
                    {row.utilisationBand}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bar Chart */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
          Utilisation by Time Slot
        </div>
        {data.map((row, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-28 text-xs text-muted-foreground truncate">{row.slot}</div>
            <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getBarClass(row.utilisationBand)}`}
                style={{ width: `${(row.utilisation / maxUtil) * 100}%` }}
              />
            </div>
            <div className="w-12 text-xs text-right text-muted-foreground">
              {row.utilisation.toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getBandClass(band: 'High' | 'Medium' | 'Low'): string {
  switch (band) {
    case 'High': return 'badge-success';
    case 'Medium': return 'badge-warning';
    case 'Low': return 'badge-error';
  }
}

function getBarClass(band: 'High' | 'Medium' | 'Low'): string {
  switch (band) {
    case 'High': return 'bg-success';
    case 'Medium': return 'bg-warning';
    case 'Low': return 'bg-error';
  }
}
