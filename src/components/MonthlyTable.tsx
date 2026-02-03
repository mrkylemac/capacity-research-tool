import type { MonthlyData } from '@/types/momence';
import { Card, CardContent } from '@/components/ui/card';

interface MonthlyTableProps {
  data: MonthlyData[];
}

export function MonthlyTable({ data }: MonthlyTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 text-center text-muted-foreground">
          No data available. Fetch sessions to see monthly performance.
        </CardContent>
      </Card>
    );
  }

  const totals = data.reduce(
    (acc, row) => ({
      sessions: acc.sessions + row.sessions,
      ticketsSold: acc.ticketsSold + row.ticketsSold,
      capacity: acc.capacity + row.capacity,
      revenue: acc.revenue + row.revenue,
    }),
    { sessions: 0, ticketsSold: 0, capacity: 0, revenue: 0 }
  );

  const avgUtilisation = totals.capacity > 0 
    ? (totals.ticketsSold / totals.capacity) * 100 
    : 0;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="notion-table min-w-full">
            <thead>
              <tr className="bg-muted/30">
                <th>Month</th>
                <th className="text-right">Sessions</th>
                <th className="text-right">Tickets</th>
                <th className="text-right">Capacity</th>
                <th className="text-right">Utilisation</th>
                <th className="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  <td className="font-medium">
                    {row.month} {row.year}
                  </td>
                  <td className="text-right">{row.sessions}</td>
                  <td className="text-right">{row.ticketsSold}</td>
                  <td className="text-right">{row.capacity}</td>
                  <td className={`text-right ${getUtilisationClass(row.utilisation)}`}>
                    {row.utilisation.toFixed(1)}%
                  </td>
                  <td className="text-right text-green-600 font-medium">
                    ${row.revenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold">
                <td>Total / Average</td>
                <td className="text-right">{totals.sessions}</td>
                <td className="text-right">{totals.ticketsSold}</td>
                <td className="text-right">{totals.capacity}</td>
                <td className={`text-right ${getUtilisationClass(avgUtilisation)}`}>
                  {avgUtilisation.toFixed(1)}%
                </td>
                <td className="text-right text-green-600">
                  ${totals.revenue.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function getUtilisationClass(util: number): string {
  if (util >= 70) return 'utilisation-high';
  if (util >= 40) return 'utilisation-medium';
  return 'utilisation-low';
}
