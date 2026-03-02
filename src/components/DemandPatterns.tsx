import { useMemo } from 'react';
import { parseISO, getHours, getMinutes, getDay } from 'date-fns';
import type { MomenceSession } from '@/types/momence';
import type { OperatingHours } from '@/lib/benchmarkMetrics';
import { generateTimeSlots, type TimeSlot } from '@/lib/metricsCalculator';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart } from '@/components/charts/bar-chart';
import { Bar } from '@/components/charts/bar';
import { BarYAxis } from '@/components/charts/bar-y-axis';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip/chart-tooltip';

interface DemandPatternsProps {
  sessions: MomenceSession[];
  operatingHours?: OperatingHours;
}

interface TimeSlotAnalysis {
  slot: string;
  avgTickets: number;
  capacity: number;
  utilisation: number;
  sessionCount: number;
  utilisationBand: 'High' | 'Medium' | 'Low';
}

function calculateSlotData(sessions: MomenceSession[], timeSlots: TimeSlot[]): TimeSlotAnalysis[] {
  const slotData = new Map<string, { tickets: number[]; capacities: number[] }>();
  timeSlots.forEach(slot => slotData.set(slot.label, { tickets: [], capacities: [] }));

  sessions.forEach(session => {
    const date = parseISO(session.startsAt);
    const hours = getHours(date) + getMinutes(date) / 60;

    for (const slot of timeSlots) {
      if (hours >= slot.start && hours < slot.end) {
        const data = slotData.get(slot.label)!;
        data.tickets.push(session.ticketsSold);
        data.capacities.push(session.capacity);
        break;
      }
    }
  });

  const results: TimeSlotAnalysis[] = [];
  slotData.forEach((data, slot) => {
    if (data.tickets.length > 0) {
      const avgTickets = data.tickets.reduce((a, b) => a + b, 0) / data.tickets.length;
      const avgCapacity = data.capacities.reduce((a, b) => a + b, 0) / data.capacities.length;
      const utilisation = avgCapacity > 0 ? (avgTickets / avgCapacity) * 100 : 0;

      results.push({
        slot,
        avgTickets: Math.round(avgTickets * 10) / 10,
        capacity: Math.round(avgCapacity),
        utilisation: Math.round(utilisation * 10) / 10,
        sessionCount: data.tickets.length,
        utilisationBand: utilisation >= 70 ? 'High' : utilisation >= 40 ? 'Medium' : 'Low',
      });
    }
  });

  return results;
}

function findPeakSlots(data: TimeSlotAnalysis[], count = 2): TimeSlotAnalysis[] {
  return [...data].sort((a, b) => b.utilisation - a.utilisation).slice(0, count);
}

/** Convert slot data into bklit-compatible horizontal bar chart format */
function toChartData(slots: TimeSlotAnalysis[]) {
  return [...slots]
    .sort((a, b) => a.utilisation - b.utilisation) // ascending so highest is at top in horizontal chart
    .map(s => ({
      name: s.slot,
      utilisation: s.utilisation,
      sessionCount: s.sessionCount,
      utilisationBand: s.utilisationBand,
    }));
}

function SlotChart({ data, title }: { data: TimeSlotAnalysis[]; title: string }) {
  const chartData = useMemo(() => toChartData(data), [data]);

  if (chartData.length === 0) {
    return (
      <div>
        <p className="text-base font-medium text-muted-foreground mb-2">{title}</p>
        <p className="text-base text-muted-foreground">No sessions found</p>
      </div>
    );
  }

  // Compute dynamic aspect ratio based on number of slots
  const aspectRatio = `4 / ${Math.max(2, Math.min(chartData.length * 0.55, 5))}`;

  return (
    <div>
      <p className="text-base font-medium text-muted-foreground mb-3">{title}</p>
      <BarChart
        data={chartData}
        xDataKey="name"
        orientation="horizontal"
        aspectRatio={aspectRatio}
        margin={{ top: 8, right: 48, bottom: 8, left: 8 }}
        barGap={0.25}
      >
        <Grid horizontal={false} vertical fadeVertical />
        <Bar
          dataKey="utilisation"
          fill="var(--chart-visitors)"
          stroke="var(--chart-visitors)"
          lineCap={4}
        />
        <BarYAxis />
        <ChartTooltip
          showDatePill={false}
          rows={(point) => [
            {
              color: 'var(--chart-visitors)',
              label: 'Utilisation',
              value: `${(point.utilisation as number).toFixed(0)}%`,
            },
            {
              color: 'var(--chart-foreground-muted)',
              label: 'Sessions',
              value: String(point.sessionCount),
            },
          ]}
        />
      </BarChart>
    </div>
  );
}

export function DemandPatterns({ sessions, operatingHours }: DemandPatternsProps) {
  const { weekdayData, weekendData, weekdayPeaks, weekendPeaks } = useMemo(() => {
    const defaultHours = { weekdayStart: 4.5, weekdayEnd: 22.5, weekendStart: 4.5, weekendEnd: 22.5 };
    const timeSlots = generateTimeSlots(operatingHours || defaultHours);

    const weekdaySessions = sessions.filter(s => {
      const day = getDay(parseISO(s.startsAt));
      return day >= 1 && day <= 5;
    });
    const weekendSessions = sessions.filter(s => {
      const day = getDay(parseISO(s.startsAt));
      return day === 0 || day === 6;
    });

    const weekdayData = calculateSlotData(weekdaySessions, timeSlots);
    const weekendData = calculateSlotData(weekendSessions, timeSlots);

    return {
      weekdayData,
      weekendData,
      weekdayPeaks: findPeakSlots(weekdayData),
      weekendPeaks: findPeakSlots(weekendData),
    };
  }, [sessions, operatingHours]);

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Peak Hours Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <h4 className="text-base font-medium mb-3">Weekday Peak Hours</h4>
            {weekdayPeaks.length > 0 ? (
              <div className="space-y-2">
                {weekdayPeaks.map((peak, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-base font-medium">{peak.slot}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-base text-muted-foreground">
                        {peak.utilisation.toFixed(0)}% avg
                      </span>
                      <Badge variant={getBadgeVariant(peak.utilisationBand)} className="text-xs">
                        {peak.sessionCount} sessions
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base text-muted-foreground">No weekday data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h4 className="text-base font-medium mb-3">Weekend Peak Hours</h4>
            {weekendPeaks.length > 0 ? (
              <div className="space-y-2">
                {weekendPeaks.map((peak, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-base font-medium">{peak.slot}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-base text-muted-foreground">
                        {peak.utilisation.toFixed(0)}% avg
                      </span>
                      <Badge variant={getBadgeVariant(peak.utilisationBand)} className="text-xs">
                        {peak.sessionCount} sessions
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base text-muted-foreground">No weekend data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Horizontal bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-5">
            <SlotChart data={weekdayData} title="Weekday utilisation by time slot (Mon–Fri)" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <SlotChart data={weekendData} title="Weekend utilisation by time slot (Sat–Sun)" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getBadgeVariant(band: 'High' | 'Medium' | 'Low'): 'default' | 'secondary' | 'destructive' {
  switch (band) {
    case 'High': return 'default';
    case 'Medium': return 'secondary';
    case 'Low': return 'destructive';
  }
}
