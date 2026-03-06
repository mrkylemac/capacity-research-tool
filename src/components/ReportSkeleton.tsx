"use client";

import { Card, CardContent } from '@/components/ui/card';

function Bar({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton-bar ${className}`} style={style} />;
}

/** Skeleton for the filter row (period + location + session type pills) */
function FilterBarSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 gap-3 items-center grid-cols-1">
      <div className="flex flex-col sm:flex-row sm:gap-3 gap-2 w-full">
        <Bar className="h-[42px] w-[120px] shrink-0" style={{ borderRadius: 16 }} />
        <Bar className="h-[42px] w-[160px] shrink-0" style={{ borderRadius: 16 }} />
      </div>
      <Bar className="h-5 w-[180px] ml-auto hidden sm:block" />
    </div>
  );
}

/** Skeleton matching SnapshotSection: title + chart stat + granularity toggle + chart + 5 metric tiles */
function SnapshotSkeleton() {
  return (
    <Card>
      <CardContent className="px-4 py-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Bar className="h-5 w-[90px]" />
        </div>

        {/* Chart stat line + granularity toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1.5">
          <div className="flex items-baseline gap-1.5">
            <Bar className="h-5 w-12" />
            <Bar className="h-3.5 w-16" />
          </div>
          <div className="flex items-center rounded-full bg-muted p-0.5 gap-px w-full sm:w-auto">
            <Bar className="h-6 w-16 flex-1 sm:flex-none" style={{ borderRadius: 999 }} />
            <Bar className="h-6 w-16 flex-1 sm:flex-none" style={{ borderRadius: 999 }} />
            <Bar className="h-6 w-12 flex-1 sm:flex-none" style={{ borderRadius: 999 }} />
          </div>
        </div>

        {/* Chart area — simulated bar chart silhouette */}
        <div className="h-[320px] w-full flex items-end gap-[3%] pb-6 mb-5">
          {[40, 55, 65, 50, 72, 68, 58, 45, 62, 70, 48, 53].map((h, i) => (
            <div key={i} className="flex-1">
              <Bar className="w-full" style={{ height: `${h}%`, borderRadius: '4px 4px 0 0' }} />
            </div>
          ))}
        </div>

        {/* 5 metric tiles in 2×3 grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
          {[
            { l: 'w-[100px]', v: 'w-12' },
            { l: 'w-[100px]', v: 'w-9' },
            { l: 'w-[96px]', v: 'w-12' },
            { l: 'w-[96px]', v: 'w-10' },
            { l: 'w-[88px]', v: 'w-16' },
          ].map((m, i) => (
            <div key={i} className="space-y-2">
              <Bar className={`h-3.5 ${m.l}`} />
              <Bar className={`h-5 ${m.v}`} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Skeleton matching CapacitySection: title + occupancy % + chart + horizontal bars + description */
function CapacitySkeleton() {
  return (
    <Card className="shadow-sm">
      <CardContent className="px-4 py-4 sm:p-5">
        {/* Header with right-aligned percentage */}
        <div className="flex items-center justify-between mb-8">
          <Bar className="h-5 w-[80px]" />
          <div className="text-right space-y-1">
            <Bar className="h-6 w-14 ml-auto" />
            <Bar className="h-3 w-20 ml-auto" />
          </div>
        </div>

        {/* Chart subtitle + legend */}
        <div className="pt-4 mb-8">
          <div className="flex justify-between mb-3 items-center">
            <Bar className="h-3.5 w-[180px]" />
            <div className="flex gap-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 skeleton-bar" />
                <Bar className="h-3 w-9" />
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 skeleton-bar" />
                <Bar className="h-3 w-14" />
              </div>
            </div>
          </div>

          {/* Stacked bar chart silhouette */}
          <div className="h-[350px] w-full flex items-end gap-[3%] pb-6">
            {[75, 82, 90, 68, 85, 78, 92, 70, 88].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end" style={{ height: '100%' }}>
                <Bar className="w-full" style={{ height: `${h * 0.7}%`, borderRadius: 0 }} />
                <Bar className="w-full opacity-30" style={{ height: `${h * 0.3}%`, borderRadius: '4px 4px 0 0' }} />
              </div>
            ))}
          </div>
        </div>

        {/* 4 horizontal bars */}
        <div className="space-y-1 mb-4">
          {[100, 100, 100, 72].map((w, i) => (
            <div key={i} className="relative h-8 rounded-lg overflow-hidden flex items-center px-3 w-full">
              <div className="absolute inset-0 bg-muted" />
              <div
                className="absolute inset-y-0 left-0 rounded-lg skeleton-bar"
                style={{ width: `${w}%`, opacity: 0.18 }}
              />
              <Bar className="relative z-10 h-3 w-24" />
              <Bar className="relative z-10 ml-auto h-3 w-10" />
            </div>
          ))}
        </div>

        {/* Description line */}
        <Bar className="h-3.5 w-[85%]" />
      </CardContent>
    </Card>
  );
}

/** Skeleton matching DemandSection: title + weekday/weekend toggle + heatmap + day-of-week bars */
function DemandSkeleton() {
  return (
    <Card className="shadow-sm">
      <CardContent className="px-4 py-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Bar className="h-5 w-[72px]" />
        </div>

        {/* Weekday / Weekend toggle */}
        <div className="flex items-center rounded-full bg-muted p-0.5 gap-px w-full sm:w-auto mb-5">
          <Bar className="h-7 flex-1 sm:flex-none sm:w-20" style={{ borderRadius: 999 }} />
          <Bar className="h-7 flex-1 sm:flex-none sm:w-20" style={{ borderRadius: 999 }} />
        </div>

        {/* Heatmap grid — 7 columns × 6 rows */}
        <div className="grid grid-cols-7 gap-1 mb-6">
          {Array.from({ length: 42 }).map((_, i) => (
            <Bar
              key={i}
              className="aspect-square"
              style={{ borderRadius: 4, opacity: 0.3 + Math.random() * 0.5 }}
            />
          ))}
        </div>

        {/* Day-of-week bars */}
        <div className="space-y-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
            const w = [65, 58, 62, 70, 75, 90, 85][i];
            return (
              <div key={day} className="relative h-8 rounded-lg overflow-hidden flex items-center px-3 w-full">
                <div className="absolute inset-0 bg-muted" />
                <div
                  className="absolute inset-y-0 left-0 rounded-lg skeleton-bar"
                  style={{ width: `${w}%`, opacity: 0.18 }}
                />
                <Bar className="relative z-10 h-3 w-8" />
                <Bar className="relative z-10 ml-auto h-3 w-8" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/** Cards-only skeleton — used when filter row stays visible (e.g. location/period switch) */
export function ReportCardsSkeleton() {
  return (
    <div className="flex flex-col gap-5 sm:gap-8">
      <div className="section-animate -mx-4 sm:mx-0" style={{ animationDelay: '0ms' }}>
        <SnapshotSkeleton />
      </div>
      <div className="section-animate -mx-4 sm:mx-0" style={{ animationDelay: '80ms' }}>
        <CapacitySkeleton />
      </div>
      <div className="section-animate -mx-4 sm:mx-0" style={{ animationDelay: '160ms' }}>
        <DemandSkeleton />
      </div>
    </div>
  );
}

/** Full report skeleton — mirrors the real report section layout */
export function ReportSkeleton() {
  return (
    <div className="space-y-5">
      <FilterBarSkeleton />
      <ReportCardsSkeleton />
    </div>
  );
}
