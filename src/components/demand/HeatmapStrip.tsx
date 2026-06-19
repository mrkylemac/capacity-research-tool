"use client";

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import type { AggregatedSlot } from './utils';

interface HeatmapStripProps {
  slots: AggregatedSlot[];
  dateCount: number;
  dayName: string;
  isSingleDay: boolean;
  onOpenDetail: () => void;
}

export function HeatmapStrip({ slots, dateCount, dayName, isSingleDay, onOpenDetail }: HeatmapStripProps) {
  if (slots.length === 0) {
    return (
      <div className="py-1">
        <p className="text-sm text-muted-foreground">No sessions</p>
      </div>
    );
  }

  return (
    <div className="section-animate">
      {/* Heatmap cell row — cells stretch to fill available width */}
      <TooltipProvider delayDuration={100}>
        <div
          className="flex items-center gap-0.5 cursor-pointer py-1 select-none"
          onClick={onOpenDetail}
          role="img"
          aria-label={`Occupancy by time slot for ${dayName}s`}
        >
          {slots.map(slot => {
            const intensity = Math.min(slot.occupancyPct, 100) * 0.7;
            return (
              <Tooltip key={slot.time}>
                <TooltipTrigger asChild>
                  <div
                    className="flex-1 h-10 rounded-sm transition-shadow hover:ring-1 hover:ring-primary/30"
                    style={{
                      backgroundColor: intensity > 0
                        ? `color-mix(in srgb, var(--chart-fill) ${Math.round(intensity)}%, transparent)`
                        : 'color-mix(in srgb, var(--chart-fill) 4%, transparent)',
                    }}
                    aria-label={`${slot.time}: ${slot.occupancyPct.toFixed(0)}% occupancy`}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="font-medium">{slot.time}</p>
                  <p className="opacity-70">
                    {slot.avgBooked.toFixed(1)}/{slot.capacity} &middot; {slot.occupancyPct.toFixed(0)}%
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Subtitle + detail CTA */}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-muted-foreground">
          {isSingleDay ? 'Selected date' : `Average across ${dateCount} ${dayName}s`}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2"
          onClick={onOpenDetail}
        >
          View detail &rarr;
        </Button>
      </div>
    </div>
  );
}
