import { useMemo } from 'react';
import { AreaChart, Area } from '@/components/charts/area-chart';
import { Grid } from '@/components/charts/grid';
import { XAxis } from '@/components/charts/x-axis';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';
import type { MonthlyData, SessionMetrics } from '@/types/momence';
import { Card, CardContent } from '@/components/ui/card';

interface RevenueSectionProps {
  metrics: SessionMetrics | null;
  monthlyData: MonthlyData[];
}

export function RevenueSection({ metrics, monthlyData }: RevenueSectionProps) {
  if (!metrics || monthlyData.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 text-center text-muted-foreground">
          No data available. Fetch sessions to see revenue metrics.
        </CardContent>
      </Card>
    );
  }

  // bklit AreaChart uses Date objects on the x-axis
  const chartData = useMemo(() =>
    [...monthlyData]
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return new Date(`${a.month} 1, ${a.year}`).getMonth() -
               new Date(`${b.month} 1, ${b.year}`).getMonth();
      })
      .map(m => ({
        date: new Date(`${m.month} 1, ${m.year}`),
        revenue: m.revenue,
        revenuePerSession: m.sessions > 0 ? Math.round(m.revenue / m.sessions) : 0,
      })),
  [monthlyData]);

  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const avgMonthlyRevenue = totalRevenue / monthlyData.length;
  const avgWeeklyRevenue = avgMonthlyRevenue / 4.33;

  return (
    <Card>
      <CardContent className="p-5">
        {/* Revenue KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-md text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-xl font-semibold text-green-600">${totalRevenue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-md text-muted-foreground mb-1">Avg Monthly</p>
            <p className="text-xl font-semibold text-foreground">${Math.round(avgMonthlyRevenue).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-md text-muted-foreground mb-1">Avg Weekly</p>
            <p className="text-xl font-semibold text-foreground">${Math.round(avgWeeklyRevenue).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-md text-muted-foreground mb-1">Per Visit</p>
            <p className="text-xl font-semibold text-foreground">${metrics.avgRevenuePerVisit.toFixed(2)}</p>
          </div>
        </div>

        {/* Revenue Chart — monthly total + revenue-per-session trend */}
        <p className="text-md text-muted-foreground mb-1">Monthly Revenue Trend</p>
        <p className="text-md text-muted-foreground mb-3">
          Green = total revenue · Blue line = revenue per session
        </p>
        <AreaChart
          data={chartData}
          xDataKey="date"
          aspectRatio="3 / 1"
          margin={{ top: 20, right: 20, bottom: 36, left: 20 }}
        >
          <Grid horizontal />
          <Area
            dataKey="revenue"
            fill="var(--chart-revenue)"
            stroke="var(--chart-revenue)"
            fillOpacity={0.12}
            strokeWidth={2.5}
          />
          <XAxis numTicks={6} />
          <ChartTooltip
            rows={(point) => [
              {
                color: 'var(--chart-revenue)',
                label: 'Revenue',
                value: `$${(point.revenue as number).toLocaleString()}`,
              },
              {
                color: 'var(--chart-visitors)',
                label: 'Per session',
                value: `$${(point.revenuePerSession as number).toLocaleString()}`,
              },
            ]}
          />
        </AreaChart>

        {/* Monthly Revenue Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="notion-table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-right">Sessions</th>
                <th className="text-right">Visitors</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">Per Session</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row, index) => (
                <tr key={index}>
                  <td className="font-medium">{row.month} {row.year}</td>
                  <td className="text-right">{row.sessions}</td>
                  <td className="text-right">{row.ticketsSold}</td>
                  <td className="text-right text-green-600 font-medium">${row.revenue.toLocaleString()}</td>
                  <td className="text-right text-muted-foreground">
                    ${row.sessions > 0 ? Math.round(row.revenue / row.sessions) : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
