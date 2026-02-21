import { useMemo } from 'react';
import { parseISO, getDay, format, startOfWeek, getWeek } from 'date-fns';
import type { MomenceSession, MonthlyData } from '@/types/momence';
import type { OperatingHours } from '@/lib/benchmarkMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { MonthlyTable } from '@/components/MonthlyTable';
import { DemandPatterns } from '@/components/DemandPatterns';

interface VisitationSectionProps {
  sessions: MomenceSession[];
  monthlyData: MonthlyData[];
  operatingHours: OperatingHours;
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Ordered Mon → Sun for display
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0];

interface DayOfWeekRow {
  day: string;
  isWeekend: boolean;
  sessions: number;
  visitors: number;
  capacity: number;
  occupancy: number;
  avgVisitorsPerSession: number;
}

function buildDayOfWeekData(sessions: MomenceSession[]): DayOfWeekRow[] {
  // Aggregate raw counts by day of week
  const map = new Map<number, { sessions: number; visitors: number; capacity: number }>();
  ORDERED_DAYS.forEach(d => map.set(d, { sessions: 0, visitors: 0, capacity: 0 }));

  sessions.forEach(s => {
    const dow = getDay(parseISO(s.startsAt));
    const row = map.get(dow)!;
    row.sessions += 1;
    row.visitors += s.ticketsSold;
    row.capacity += s.capacity;
  });

  return ORDERED_DAYS.map(dow => {
    const row = map.get(dow)!;
    const occupancy = row.capacity > 0 ? (row.visitors / row.capacity) * 100 : 0;
    const avgVisitorsPerSession = row.sessions > 0 ? row.visitors / row.sessions : 0;
    return {
      day: DAY_LABELS[dow],
      isWeekend: dow === 0 || dow === 6,
      sessions: row.sessions,
      visitors: row.visitors,
      capacity: row.capacity,
      occupancy,
      avgVisitorsPerSession,
    };
  });
}

// Build weekly summary: each calendar week → total visitors + sessions
interface WeeklyRow {
  weekLabel: string;
  weekStart: Date;
  sessions: number;
  visitors: number;
  capacity: number;
  occupancy: number;
}

function buildWeeklySummary(sessions: MomenceSession[]): WeeklyRow[] {
  const map = new Map<string, { weekStart: Date; sessions: MomenceSession[] }>();

  sessions.forEach(s => {
    const date = parseISO(s.startsAt);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const key = format(weekStart, 'yyyy-ww');
    if (!map.has(key)) {
      map.set(key, { weekStart, sessions: [] });
    }
    map.get(key)!.sessions.push(s);
  });

  const rows: WeeklyRow[] = [];
  map.forEach((data, _key) => {
    const visitors = data.sessions.reduce((sum, s) => sum + s.ticketsSold, 0);
    const capacity = data.sessions.reduce((sum, s) => sum + s.capacity, 0);
    const occupancy = capacity > 0 ? (visitors / capacity) * 100 : 0;
    rows.push({
      weekLabel: `W${getWeek(data.weekStart, { weekStartsOn: 1 })} – ${format(data.weekStart, 'MMM d, yyyy')}`,
      weekStart: data.weekStart,
      sessions: data.sessions.length,
      visitors,
      capacity,
      occupancy,
    });
  });

  return rows.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

function getOccupancyClass(pct: number) {
  if (pct >= 70) return 'text-green-600 font-medium';
  if (pct >= 40) return 'text-amber-600';
  return 'text-red-600';
}

export function VisitationSection({ sessions, monthlyData, operatingHours }: VisitationSectionProps) {
  const dayOfWeekData = useMemo(() => buildDayOfWeekData(sessions), [sessions]);
  const weeklySummary = useMemo(() => buildWeeklySummary(sessions), [sessions]);

  const totalVisitors = sessions.reduce((sum, s) => sum + s.ticketsSold, 0);
  const totalCapacity = sessions.reduce((sum, s) => sum + s.capacity, 0);

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-10">
      {/* Monthly */}
      {monthlyData.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            By Month
          </h3>
          <MonthlyTable data={monthlyData} sessions={sessions} />
        </div>
      )}

      {/* Weekly summary */}
      {weeklySummary.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            By Week
          </h3>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="notion-table min-w-full">
                  <thead>
                    <tr className="bg-muted/30">
                      <th>Week</th>
                      <th className="text-right">Sessions</th>
                      <th className="text-right">Visitors</th>
                      <th className="text-right">Total Seats</th>
                      <th className="text-right">Occupancy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklySummary.map((row, i) => (
                      <tr key={i}>
                        <td className="font-medium text-sm">{row.weekLabel}</td>
                        <td className="text-right text-sm">{row.sessions}</td>
                        <td className="text-right text-sm font-medium">{row.visitors.toLocaleString()}</td>
                        <td className="text-right text-sm text-muted-foreground">{row.capacity.toLocaleString()}</td>
                        <td className={`text-right text-sm ${getOccupancyClass(row.occupancy)}`}>
                          {row.occupancy.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 font-semibold">
                      <td>Total</td>
                      <td className="text-right">{sessions.length.toLocaleString()}</td>
                      <td className="text-right">{totalVisitors.toLocaleString()}</td>
                      <td className="text-right text-muted-foreground">{totalCapacity.toLocaleString()}</td>
                      <td className={`text-right ${getOccupancyClass(totalCapacity > 0 ? (totalVisitors / totalCapacity) * 100 : 0)}`}>
                        {totalCapacity > 0 ? ((totalVisitors / totalCapacity) * 100).toFixed(1) : '—'}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Day of week */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          By Day of Week
        </h3>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="notion-table min-w-full">
                <thead>
                  <tr className="bg-muted/30">
                    <th>Day</th>
                    <th className="text-right">Sessions</th>
                    <th className="text-right">Total Visitors</th>
                    <th className="text-right">Total Seats</th>
                    <th className="text-right">Avg Visitors / Session</th>
                    <th className="text-right">Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {dayOfWeekData.map((row, i) => (
                    <tr key={i} className={row.isWeekend ? 'bg-muted/10' : ''}>
                      <td className="font-medium text-sm">
                        {row.day}
                        {row.isWeekend && (
                          <span className="ml-2 text-xs text-muted-foreground">Weekend</span>
                        )}
                      </td>
                      <td className="text-right text-sm">{row.sessions > 0 ? row.sessions : '—'}</td>
                      <td className="text-right text-sm font-medium">
                        {row.visitors > 0 ? row.visitors.toLocaleString() : '—'}
                      </td>
                      <td className="text-right text-sm text-muted-foreground">
                        {row.capacity > 0 ? row.capacity.toLocaleString() : '—'}
                      </td>
                      <td className="text-right text-sm text-muted-foreground">
                        {row.sessions > 0 ? row.avgVisitorsPerSession.toFixed(1) : '—'}
                      </td>
                      <td className={`text-right text-sm ${row.sessions > 0 ? getOccupancyClass(row.occupancy) : 'text-muted-foreground'}`}>
                        {row.sessions > 0 ? `${row.occupancy.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground mt-2">
          All figures are cumulative totals for the selected date range, sourced directly from Momence session data.
        </p>
      </div>

      {/* Time slots */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          By Time Slot
        </h3>
        <DemandPatterns sessions={sessions} operatingHours={operatingHours} />
      </div>
    </div>
  );
}
