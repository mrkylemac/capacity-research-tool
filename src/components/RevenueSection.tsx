import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

  const chartData = monthlyData.map(m => ({
    name: `${m.month.slice(0, 3)} ${m.year}`,
    revenue: m.revenue,
  }));

  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const avgMonthlyRevenue = totalRevenue / monthlyData.length;
  const avgWeeklyRevenue = avgMonthlyRevenue / 4.33;

  return (
    <Card>
      <CardContent className="p-5">
        {/* Revenue KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-xl font-semibold text-green-600">${totalRevenue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Avg Monthly</p>
            <p className="text-xl font-semibold text-foreground">${Math.round(avgMonthlyRevenue).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Avg Weekly</p>
            <p className="text-xl font-semibold text-foreground">${Math.round(avgWeeklyRevenue).toLocaleString()}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Per Visit</p>
            <p className="text-xl font-semibold text-foreground">${metrics.avgRevenuePerVisit.toFixed(2)}</p>
          </div>
        </div>

        {/* Revenue Chart */}
        <p className="text-xs text-muted-foreground mb-3">
          Monthly Revenue Trend
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(0 0% 45%)', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(0 0% 90%)' }}
                tickLine={{ stroke: 'hsl(0 0% 90%)' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(0 0% 45%)', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(0 0% 90%)' }}
                tickLine={{ stroke: 'hsl(0 0% 90%)' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(0 0% 100%)', 
                  border: '1px solid hsl(0 0% 90%)',
                  borderRadius: '6px',
                  color: 'hsl(0 0% 9%)'
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(142 71% 45%)" 
                strokeWidth={2}
                fill="url(#revenueGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

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
