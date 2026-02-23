import { useMemo } from 'react';
import { parseISO, getHours, getMinutes, getDay } from 'date-fns';
import type { MomenceSession } from '@/types/momence';
import type { BenchmarkMetrics, OperatingHours } from '@/lib/benchmarkMetrics';
import { generateTimeSlots } from '@/lib/metricsCalculator';
import { Card, CardContent } from '@/components/untitled/card';
import { Badge } from '@/components/untitled/badge';
import { Disclosure } from '@/components/untitled/disclosure';
import { ChevronDown } from 'lucide-react';

interface DemandIntelligenceProps {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
}

interface SlotSummary {
  slot: string;
  utilisation: number;
  sessionCount: number;
}

function buildSlotSummaries(sessions: MomenceSession[], hours: OperatingHours, weekend: boolean): SlotSummary[] {
  const timeSlots = generateTimeSlots(hours);
  const slotMap = new Map<string, { tickets: number[]; capacities: number[] }>();
  timeSlots.forEach(s => slotMap.set(s.label, { tickets: [], capacities: [] }));

  sessions
    .filter(s => {
      const day = getDay(parseISO(s.startsAt));
      return weekend ? day === 0 || day === 6 : day >= 1 && day <= 5;
    })
    .forEach(s => {
      const date = parseISO(s.startsAt);
      const h = getHours(date) + getMinutes(date) / 60;
      for (const slot of timeSlots) {
        if (h >= slot.start && h < slot.end) {
          const data = slotMap.get(slot.label)!;
          data.tickets.push(s.ticketsSold);
          data.capacities.push(s.capacity);
          break;
        }
      }
    });

  const results: SlotSummary[] = [];
  slotMap.forEach((data, slot) => {
    if (data.tickets.length === 0) return;
    const avgTickets = data.tickets.reduce((a, b) => a + b, 0) / data.tickets.length;
    const avgCap = data.capacities.reduce((a, b) => a + b, 0) / data.capacities.length;
    results.push({
      slot,
      utilisation: avgCap > 0 ? (avgTickets / avgCap) * 100 : 0,
      sessionCount: data.tickets.length,
    });
  });

  return results.sort((a, b) => b.utilisation - a.utilisation);
}

function DaySplitBar({
  label,
  share,
  visitors,
  isWeekend,
}: {
  label: string;
  share: number;
  visitors: number;
  isWeekend: boolean;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{(share * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${isWeekend ? 'bg-blue-500' : 'bg-primary'}`}
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{visitors.toLocaleString()} visitors</p>
    </div>
  );
}

function PeakSlotList({ slots, title }: { slots: SlotSummary[]; title: string }) {
  const top3 = slots.slice(0, 3);
  const rest = slots.slice(3);
  const max = top3[0]?.utilisation ?? 0;

  if (top3.length === 0) {
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
        <p className="text-xs text-muted-foreground">No sessions found</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-3">{title}</p>
      <div className="space-y-2">
        {top3.map((s, i) => (
          <div key={s.slot} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium truncate">{s.slot}</span>
                <Badge
                  variant={s.utilisation >= 70 ? 'success' : s.utilisation >= 40 ? 'warning' : 'neutral'}
                  className="text-xs ml-2 shrink-0"
                >
                  {s.utilisation.toFixed(0)}%
                </Badge>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${max > 0 ? (s.utilisation / max) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <Disclosure
          className="mt-3"
          summary={(
            <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
              <span>+{rest.length} more</span>
            </div>
          )}
        >
          <div className="space-y-2 mt-2">
            {rest.map(s => (
              <div key={s.slot} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground truncate">{s.slot}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">
                      {s.utilisation.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-muted-foreground/30 rounded-full"
                      style={{ width: `${max > 0 ? (s.utilisation / max) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Disclosure>
      )}
    </div>
  );
}

export function DemandIntelligence({ sessions, metrics }: DemandIntelligenceProps) {
  const { weekdaySlots, weekendSlots } = useMemo(() => ({
    weekdaySlots: buildSlotSummaries(sessions, metrics.operatingHours, false),
    weekendSlots: buildSlotSummaries(sessions, metrics.operatingHours, true),
  }), [sessions, metrics.operatingHours]);

  if (sessions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Day split */}
      <Card>
        <CardContent className="p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Day split
          </p>
          <div className="space-y-4">
            <DaySplitBar
              label="Weekday"
              share={metrics.weekdayShare}
              visitors={metrics.weekdayVisits}
              isWeekend={false}
            />
            <DaySplitBar
              label="Weekend"
              share={metrics.weekendShare}
              visitors={metrics.weekendVisits}
              isWeekend={true}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
            {metrics.weekendShare > 0.55
              ? 'Weekend-heavy. Most visits happen Sat–Sun.'
              : metrics.weekdayShare > 0.55
              ? 'Weekday-heavy. Strong Mon–Fri base.'
              : 'Balanced across the week.'}
          </p>
        </CardContent>
      </Card>

      {/* Weekday peaks */}
      <Card>
        <CardContent className="p-5">
          <PeakSlotList slots={weekdaySlots} title="Top weekday slots" />
        </CardContent>
      </Card>

      {/* Weekend peaks */}
      <Card>
        <CardContent className="p-5">
          <PeakSlotList slots={weekendSlots} title="Top weekend slots" />
        </CardContent>
      </Card>
    </div>
  );
}
