import { useMemo } from 'react';
import { parseISO, getHours, getMinutes, getDay } from 'date-fns';
import type { MomenceSession } from '@/types/momence';
import type { OperatingHours } from '@/lib/benchmarkMetrics';
import { generateTimeSlots, type TimeSlot } from '@/lib/metricsCalculator';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

export function DemandPatterns({ sessions, operatingHours }: DemandPatternsProps) {
  const { weekdayData, weekendData, weekdayPeaks, weekendPeaks } = useMemo(() => {
    // Generate time slots based on operating hours if provided, otherwise use default
    const defaultHours = { weekdayStart: 4.5, weekdayEnd: 22.5, weekendStart: 4.5, weekendEnd: 22.5 };
    const timeSlots = generateTimeSlots(operatingHours || defaultHours);

    // Split sessions by weekday vs weekend
    const weekdaySessions = sessions.filter(s => {
      const day = getDay(parseISO(s.startsAt));
      return day >= 1 && day <= 5; // Mon-Fri
    });
    const weekendSessions = sessions.filter(s => {
      const day = getDay(parseISO(s.startsAt));
      return day === 0 || day === 6; // Sat-Sun
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
            <h4 className="text-sm font-medium mb-3">Weekday Peak Hours</h4>
            {weekdayPeaks.length > 0 ? (
              <div className="space-y-2">
                {weekdayPeaks.map((peak, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{peak.slot}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">No weekday data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h4 className="text-sm font-medium mb-3">Weekend Peak Hours</h4>
            {weekendPeaks.length > 0 ? (
              <div className="space-y-2">
                {weekendPeaks.map((peak, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{peak.slot}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
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
              <p className="text-sm text-muted-foreground">No weekend data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekday Table */}
        <Card>
          <CardContent className="p-5">
            <h4 className="text-xs text-muted-foreground mb-3">Weekday Time Slots (Mon–Fri)</h4>
            <TimeSlotTable data={weekdayData} />
          </CardContent>
        </Card>

        {/* Weekend Table */}
        <Card>
          <CardContent className="p-5">
            <h4 className="text-xs text-muted-foreground mb-3">Weekend Time Slots (Sat–Sun)</h4>
            <TimeSlotTable data={weekendData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TimeSlotTable({ data }: { data: TimeSlotAnalysis[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No sessions in this period</p>;
  }

  const maxUtil = Math.max(...data.map(d => d.utilisation));

  return (
    <div className="space-y-2">
      {data.map((row, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="w-28 text-xs text-muted-foreground truncate">{row.slot}</div>
          <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
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
