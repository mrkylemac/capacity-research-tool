import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { MonthlyData, SessionMetrics } from '@/types/momence';
import { Activity } from 'lucide-react';

interface CapacityUtilisationProps {
  metrics: SessionMetrics | null;
  monthlyData: MonthlyData[];
}

export function CapacityUtilisation({ metrics, monthlyData }: CapacityUtilisationProps) {
  if (!metrics || monthlyData.length === 0) {
    return (
      <div className="stat-card">
        <h3 className="section-title">
          <Activity className="w-5 h-5 text-primary" />
          Capacity & Utilisation
        </h3>
        <div className="text-center py-8 text-muted-foreground">
          No data available. Fetch sessions to see capacity metrics.
        </div>
      </div>
    );
  }

  const chartData = monthlyData.map(m => ({
    name: `${m.month.slice(0, 3)} ${m.year}`,
    utilisation: Math.round(m.utilisation),
  }));

  const avgPerDay = metrics.sessionsPerDay;
  const avgPerWeek = metrics.sessionsPerWeek;
  const avgPerMonth = avgPerWeek * 4.33;

  return (
    <div className="stat-card">
      <h3 className="section-title">
        <Activity className="w-5 h-5 text-primary" />
        Capacity & Utilisation
      </h3>

      {/* Session Frequency */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-foreground">{avgPerDay.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Sessions/Day</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-foreground">{avgPerWeek.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Sessions/Week</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl font-bold text-foreground">{avgPerMonth.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Sessions/Month</div>
        </div>
      </div>

      {/* Utilisation Chart */}
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
        Monthly Utilisation %
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(217 33% 17%)', 
                border: '1px solid hsl(217 33% 25%)',
                borderRadius: '8px',
                color: 'hsl(210 40% 96%)'
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
    </div>
  );
}

function getBarColor(util: number): string {
  if (util >= 70) return 'hsl(142 71% 45%)'; // success
  if (util >= 40) return 'hsl(38 92% 50%)'; // warning
  return 'hsl(0 84% 60%)'; // error
}
