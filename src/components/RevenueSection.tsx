import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MonthlyData, SessionMetrics } from '@/types/momence';
import { DollarSign, TrendingUp } from 'lucide-react';

interface RevenueSectionProps {
  metrics: SessionMetrics | null;
  monthlyData: MonthlyData[];
}

export function RevenueSection({ metrics, monthlyData }: RevenueSectionProps) {
  if (!metrics || monthlyData.length === 0) {
    return (
      <div className="stat-card">
        <h3 className="section-title">
          <DollarSign className="w-5 h-5 text-success" />
          Revenue Analysis
        </h3>
        <div className="text-center py-8 text-muted-foreground">
          No data available. Fetch sessions to see revenue metrics.
        </div>
      </div>
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
    <div className="stat-card">
      <h3 className="section-title">
        <DollarSign className="w-5 h-5 text-success" />
        Revenue Analysis
      </h3>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 bg-success/10 rounded-lg border border-success/20">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Revenue</div>
          <div className="text-xl font-bold text-success">${totalRevenue.toLocaleString()}</div>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg Monthly</div>
          <div className="text-xl font-bold text-foreground">${Math.round(avgMonthlyRevenue).toLocaleString()}</div>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg Weekly</div>
          <div className="text-xl font-bold text-foreground">${Math.round(avgWeeklyRevenue).toLocaleString()}</div>
        </div>
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Per Visit</div>
          <div className="text-xl font-bold text-foreground">${metrics.avgRevenuePerVisit.toFixed(2)}</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <TrendingUp className="w-3 h-3" />
        Monthly Revenue Trend
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 25%)" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(217 33% 25%)' }}
              tickLine={{ stroke: 'hsl(217 33% 25%)' }}
            />
            <YAxis 
              tick={{ fill: 'hsl(215 20% 65%)', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(217 33% 25%)' }}
              tickLine={{ stroke: 'hsl(217 33% 25%)' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(217 33% 17%)', 
                border: '1px solid hsl(217 33% 25%)',
                borderRadius: '8px',
                color: 'hsl(210 40% 96%)'
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
        <table className="table-dashboard">
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
                <td className="text-right text-success font-medium">${row.revenue.toLocaleString()}</td>
                <td className="text-right text-muted-foreground">
                  ${row.sessions > 0 ? Math.round(row.revenue / row.sessions) : 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
