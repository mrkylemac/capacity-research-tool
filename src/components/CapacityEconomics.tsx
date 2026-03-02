import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getHours, getMinutes, parseISO } from 'date-fns';
import type { MomenceSession } from '@/types/momence';

interface CapacityEconomicsProps {
  sessions: MomenceSession[];
  operatingHoursPerWeek?: number;
}

interface TimeSlotEconomics {
  slot: string;
  revPASH: number;
  revenueRealization: number;
  emptySeatCost: number;
  sessionCount: number;
}

interface DayOfWeekEconomics {
  day: string;
  revPASH: number;
  revenueRealization: number;
  emptySeatCost: number;
  sessionCount: number;
}

function calculateRevPASH(revenue: number, capacity: number, durationHours: number): number {
  const availableSeatHours = capacity * durationHours;
  return availableSeatHours > 0 ? revenue / availableSeatHours : 0;
}

function getTimeSlot(hour: number): string {
  if (hour >= 4 && hour < 10) return 'Early Morning (4-10am)';
  if (hour >= 10 && hour < 14) return 'Midday (10am-2pm)';
  if (hour >= 14 && hour < 18) return 'Afternoon (2-6pm)';
  return 'Evening (6pm-10pm)';
}

function getDayOfWeek(dateString: string): string {
  const date = parseISO(dateString);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

export function CapacityEconomics({ sessions, operatingHoursPerWeek }: CapacityEconomicsProps) {
  const economics = useMemo(() => {
    if (sessions.length === 0) return null;

    const activeSessions = sessions.filter(s => s.fixedTicketPrice > 0);
    if (activeSessions.length === 0) return null;

    // Overall metrics
    const totalRevenue = activeSessions.reduce((sum, s) => sum + (s.ticketsSold * s.fixedTicketPrice), 0);
    const totalCapacity = activeSessions.reduce((sum, s) => sum + s.capacity, 0);
    const totalPotentialRevenue = activeSessions.reduce((sum, s) => sum + (s.capacity * s.fixedTicketPrice), 0);
    const totalDurationHours = activeSessions.reduce((sum, s) => sum + (s.durationMinutes / 60), 0);
    const totalCapacityHours = activeSessions.reduce((sum, s) => sum + (s.capacity * s.durationMinutes / 60), 0);
    
    const overallRevPASH = totalCapacityHours > 0 ? totalRevenue / totalCapacityHours : 0;
    const overallRealization = totalPotentialRevenue > 0 ? (totalRevenue / totalPotentialRevenue) * 100 : 0;
    const overallEmptySeatCost = totalPotentialRevenue - totalRevenue;

    // By time slot
    const timeSlotMap = new Map<string, MomenceSession[]>();
    activeSessions.forEach(session => {
      const date = parseISO(session.startsAt);
      const hour = getHours(date) + getMinutes(date) / 60;
      const slot = getTimeSlot(hour);
      
      if (!timeSlotMap.has(slot)) {
        timeSlotMap.set(slot, []);
      }
      timeSlotMap.get(slot)!.push(session);
    });

    const timeSlotEconomics: TimeSlotEconomics[] = [];
    timeSlotMap.forEach((slotSessions, slot) => {
      const revenue = slotSessions.reduce((sum, s) => sum + (s.ticketsSold * s.fixedTicketPrice), 0);
      const potentialRevenue = slotSessions.reduce((sum, s) => sum + (s.capacity * s.fixedTicketPrice), 0);
      const capacityHours = slotSessions.reduce((sum, s) => sum + (s.capacity * s.durationMinutes / 60), 0);
      
      timeSlotEconomics.push({
        slot,
        revPASH: capacityHours > 0 ? revenue / capacityHours : 0,
        revenueRealization: potentialRevenue > 0 ? (revenue / potentialRevenue) * 100 : 0,
        emptySeatCost: potentialRevenue - revenue,
        sessionCount: slotSessions.length,
      });
    });

    // By day of week
    const dayMap = new Map<string, MomenceSession[]>();
    activeSessions.forEach(session => {
      const day = getDayOfWeek(session.startsAt);
      if (!dayMap.has(day)) {
        dayMap.set(day, []);
      }
      dayMap.get(day)!.push(session);
    });

    const dayEconomics: DayOfWeekEconomics[] = [];
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    dayOrder.forEach(day => {
      const daySessions = dayMap.get(day);
      if (daySessions) {
        const revenue = daySessions.reduce((sum, s) => sum + (s.ticketsSold * s.fixedTicketPrice), 0);
        const potentialRevenue = daySessions.reduce((sum, s) => sum + (s.capacity * s.fixedTicketPrice), 0);
        const capacityHours = daySessions.reduce((sum, s) => sum + (s.capacity * s.durationMinutes / 60), 0);
        
        dayEconomics.push({
          day,
          revPASH: capacityHours > 0 ? revenue / capacityHours : 0,
          revenueRealization: potentialRevenue > 0 ? (revenue / potentialRevenue) * 100 : 0,
          emptySeatCost: potentialRevenue - revenue,
          sessionCount: daySessions.length,
        });
      }
    });

    return {
      overall: {
        revPASH: overallRevPASH,
        revenueRealization: overallRealization,
        emptySeatCost: overallEmptySeatCost,
        totalRevenue,
        totalPotentialRevenue,
      },
      timeSlots: timeSlotEconomics.sort((a, b) => b.revPASH - a.revPASH),
      days: dayEconomics,
    };
  }, [sessions]);

  if (!economics) return null;

  const getRealizationColor = (pct: number): string => {
    if (pct >= 75) return 'text-green-600';
    if (pct >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overall Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-muted-foreground">Revenue per Available Seat Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${economics.overall.revPASH.toFixed(2)}</div>
            <p className="text-base text-muted-foreground mt-1">
              Higher RevPASH = better capacity utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-muted-foreground">Revenue Realization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getRealizationColor(economics.overall.revenueRealization)}`}>
              {economics.overall.revenueRealization.toFixed(1)}%
            </div>
            <p className="text-base text-muted-foreground mt-1">
              Actual vs. potential revenue if all seats sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-muted-foreground">Empty Seat Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              ${economics.overall.emptySeatCost.toLocaleString()}
            </div>
            <p className="text-base text-muted-foreground mt-1">
              Unrealized revenue from unsold capacity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By Time Slot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance by Time Slot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="data-table min-w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th>Time Slot</th>
                  <th className="text-right">Sessions</th>
                  <th className="text-right">RevPASH</th>
                  <th className="text-right">Realization</th>
                  <th className="text-right">Unrealized Revenue</th>
                </tr>
              </thead>
              <tbody>
                {economics.timeSlots.map((slot, index) => (
                  <tr key={index}>
                    <td className="font-medium">{slot.slot}</td>
                    <td className="text-right text-muted-foreground">{slot.sessionCount}</td>
                    <td className="text-right font-medium">${slot.revPASH.toFixed(2)}</td>
                    <td className={`text-right font-medium ${getRealizationColor(slot.revenueRealization)}`}>
                      {slot.revenueRealization.toFixed(1)}%
                    </td>
                    <td className="text-right text-red-600">
                      ${slot.emptySeatCost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-base text-muted-foreground mt-3">
            Time slots ranked by RevPASH (highest to lowest)
          </p>
        </CardContent>
      </Card>

      {/* By Day of Week */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance by Day of Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="data-table min-w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th>Day</th>
                  <th className="text-right">Sessions</th>
                  <th className="text-right">RevPASH</th>
                  <th className="text-right">Realization</th>
                  <th className="text-right">Unrealized Revenue</th>
                </tr>
              </thead>
              <tbody>
                {economics.days.map((day, index) => (
                  <tr key={index}>
                    <td className="font-medium">{day.day}</td>
                    <td className="text-right text-muted-foreground">{day.sessionCount}</td>
                    <td className="text-right font-medium">${day.revPASH.toFixed(2)}</td>
                    <td className={`text-right font-medium ${getRealizationColor(day.revenueRealization)}`}>
                      {day.revenueRealization.toFixed(1)}%
                    </td>
                    <td className="text-right text-red-600">
                      ${day.emptySeatCost.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <span className="font-medium">Revenue Opportunity:</span>
            <span className="text-muted-foreground ml-2">
              ${economics.overall.emptySeatCost.toLocaleString()} left on the table from {((100 - economics.overall.revenueRealization)).toFixed(0)}% unsold capacity
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium">Best Time Slot:</span>
            <span className="text-muted-foreground ml-2">
              {economics.timeSlots[0].slot} at ${economics.timeSlots[0].revPASH.toFixed(2)} RevPASH
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium">Optimization Target:</span>
            <span className="text-muted-foreground ml-2">
              {economics.timeSlots[economics.timeSlots.length - 1].slot} needs attention (${economics.timeSlots[economics.timeSlots.length - 1].revPASH.toFixed(2)} RevPASH)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
