import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { MonthlyData, SessionMetrics } from '@/types/momence';
import { Card, CardContent } from '@/components/ui/card';

interface CapacityUtilisationProps {
  metrics: SessionMetrics | null;
  monthlyData: MonthlyData[];
}

export function CapacityUtilisation({ metrics, monthlyData }: CapacityUtilisationProps) {
  if (!metrics || monthlyData.length === 0) {
    return (
      <Card>
        <CardContent className="p-5 text-center text-muted-foreground">
          No data available. Fetch sessions to see capacity metrics.
        </CardContent>
      </Card>
    );
  }

  const chartData = monthlyData.map(m => ({
    name: `${m.month.slice(0, 3)} ${m.year}`,
    utilisation: Math.round(m.utilisation),
  }));

  const avgPerDay = metrics.sessionsPerDay;
  const avgPerWeek = metrics.sessionsPerWeek;
  const avgPerMonth = avgPerWeek * 4.33;

  // Calculate weekly visitation
  const totalVisitors = monthlyData.reduce((sum, m) => sum + m.ticketsSold, 0);
  const totalWeeks = monthlyData.length > 0 
    ? monthlyData.reduce((sum, m) => sum + m.sessions, 0) / (avgPerWeek || 1)
    : 1;
  const weeklyVisitors = totalWeeks > 0 ? totalVisitors / totalWeeks : 0;
  const dailyVisitors = weeklyVisitors / 7;

  return (
    <Card>
      <CardContent className="p-5">
        {/* Frequency Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-xl font-semibold text-foreground">{avgPerDay.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Sessions/Day</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-xl font-semibold text-foreground">{avgPerWeek.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Sessions/Week</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-xl font-semibold text-foreground">{Math.round(dailyVisitors)}</div>
            <div className="text-xs text-muted-foreground">Visitors/Day</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-xl font-semibold text-foreground">{Math.round(weeklyVisitors)}</div>
            <div className="text-xs text-muted-foreground">Visitors/Week</div>
          </div>
        </div>

        {/* Utilisation Chart */}
        <p className="text-xs text-muted-foreground mb-3">
          Monthly Utilisation %
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(0 0% 100%)', 
                  border: '1px solid hsl(0 0% 90%)',
                  borderRadius: '6px',
                  color: 'hsl(0 0% 9%)'
                }}
                formatter={(value: number) => [`${value}%`, 'Utilisation']}
              />
              <Bar dataKey="utilisation" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={index} 
                    fill={getBarColor(entry.utilisation)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function getBarColor(util: number): string {
  if (util >= 70) return 'hsl(142 71% 45%)';
  if (util >= 40) return 'hsl(38 92% 50%)';
  return 'hsl(0 84% 60%)';
}
