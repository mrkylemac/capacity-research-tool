"use client";

import { useMemo, useState } from 'react';
import { parseISO, format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import type { MomenceSession } from '@/types/momence';
import type { DetailTarget, AggregatedSlot } from './utils';
import { buildAggregatedSlots, buildSessionsForDay, formatSessionTime, formatDuration } from './utils';

interface DayDetailPanelProps {
  target: DetailTarget | null;
  onClose: () => void;
  sessions: MomenceSession[];
  isSingleDay: boolean;
}

function SlotBar({ slot }: { slot: AggregatedSlot }) {
  const pct = Math.min(slot.occupancyPct, 100);
  return (
    <div className="relative h-8 rounded-lg overflow-hidden flex items-center px-3">
      <div className="absolute inset-0 bg" />
      <div
        className="absolute inset-y-0 left-0 rounded-lg transition-all duration-300"
        style={{
          width: `${pct}%`,
          backgroundColor: 'color-mix(in srgb, var(--chart-fill) 18%, transparent)',
        }}
      />
      <span className="relative z-10 text-sm">
        {slot.time}
        <span className="text-muted-foreground ml-1">({slot.duration})</span>
      </span>
      <span className="relative z-10 ml-auto text-sm tabular-nums font-medium shrink-0">
        {slot.avgBooked.toFixed(1)}
        <span className="text-muted-foreground font-normal">/{slot.capacity}</span>
        <span className="text-muted-foreground font-normal ml-1.5 text-[11px]">
          {slot.occupancyPct.toFixed(0)}%
        </span>
      </span>
    </div>
  );
}

function AggregatedSlotList({ slots }: { slots: AggregatedSlot[] }) {
  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No session data available</p>;
  }
  return (
    <div className="space-y-1">
      {slots.map(slot => (
        <SlotBar key={slot.time} slot={slot} />
      ))}
    </div>
  );
}

function DateGroupedList({ groups }: { groups: { date: string; sessions: MomenceSession[] }[] }) {
  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No sessions in this period</p>;
  }
  return (
    <div className="space-y-4">
      {groups.map(({ date, sessions: daySessions }) => (
        <div key={date}>
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
            {format(parseISO(date), 'd MMM yyyy')}
          </p>
          <div className="space-y-1">
            {daySessions.map(s => {
              const pct = s.capacity > 0 ? Math.min((s.ticketsSold / s.capacity) * 100, 100) : 0;
              return (
                <div key={s.id} className="relative h-8 rounded-lg overflow-hidden flex items-center px-3">
                  <div className="absolute inset-0 bg" />
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: 'color-mix(in srgb, var(--chart-fill) 18%, transparent)',
                    }}
                  />
                  <span className="relative z-10 text-sm">
                    {formatSessionTime(s.startsAt)}
                    <span className="text-muted-foreground ml-1">({formatDuration(s.durationMinutes)})</span>
                  </span>
                  <span className="relative z-10 ml-auto text-sm tabular-nums font-medium shrink-0">
                    {s.ticketsSold}
                    <span className="text-muted-foreground font-normal">/{s.capacity} spots</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

type ViewMode = 'average' | 'by-date';

function SegmentedToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center rounded-full bg-muted p-0.5 gap-px" data-vaul-no-drag>
      <button
        type="button"
        className={`flex-1 px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
          value === 'average'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onPointerDown={(e) => { e.stopPropagation(); onChange('average'); }}
      >
        Average
      </button>
      <button
        type="button"
        className={`flex-1 px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
          value === 'by-date'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onPointerDown={(e) => { e.stopPropagation(); onChange('by-date'); }}
      >
        By Date
      </button>
    </div>
  );
}

function PanelContent({
  target,
  sessions,
  isSingleDay,
}: {
  target: DetailTarget;
  sessions: MomenceSession[];
  isSingleDay: boolean;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('average');

  const aggregatedSlots = useMemo(
    () => buildAggregatedSlots(sessions, target.dayIndex),
    [sessions, target.dayIndex],
  );
  const sessionGroups = useMemo(
    () => buildSessionsForDay(sessions, target.dayIndex),
    [sessions, target.dayIndex],
  );

  const showTabs = !isSingleDay && target.dateCount > 1;

  if (!showTabs) {
    return (
      <div className="mt-4">
        <DateGroupedList groups={sessionGroups} />
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <SegmentedToggle value={viewMode} onChange={setViewMode} />
      {viewMode === 'average' ? (
        <AggregatedSlotList slots={aggregatedSlots} />
      ) : (
        <DateGroupedList groups={sessionGroups} />
      )}
    </div>
  );
}

export function DayDetailPanel({ target, onClose, sessions, isSingleDay }: DayDetailPanelProps) {
  const isMobile = useIsMobile();
  const open = target !== null;

  const subtitle = target
    ? `${target.visitors.toLocaleString()} total visitors${target.dateCount > 1 ? ` · Avg across ${target.dateCount} ${target.name}s` : ''}`
    : '';

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{target?.name}</DrawerTitle>
            <DrawerDescription>{subtitle}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6" data-vaul-no-drag>
            {target && (
              <PanelContent target={target} sessions={sessions} isSingleDay={isSingleDay} />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{target?.name}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>
        {target && (
          <PanelContent target={target} sessions={sessions} isSingleDay={isSingleDay} />
        )}
      </SheetContent>
    </Sheet>
  );
}
