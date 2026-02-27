"use client";

import { useMemo } from 'react';
import { getDay, parseISO } from 'date-fns';
import {
  BarChart, Bar, Cell, XAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import type { MomenceSession } from '@/types/momence';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';

interface SessionAnalysisProps {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
}

function detectRollingInterval(sessions: MomenceSession[]): number {
  const byDay = new Map<string, number[]>();
  sessions.forEach(s => {
    const date = s.startsAt.slice(0, 10);
    const d = new Date(s.startsAt);
    const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
    const existing = byDay.get(date) ?? [];
    existing.push(mins);
    byDay.set(date, existing);
  });

  const gaps: number[] = [];
  byDay.forEach(times => {
    const sorted = [...times].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap > 0 && gap <= 120) gaps.push(gap);
    }
  });

  if (gaps.length === 0) return 0;
  const freq = new Map<number, number>();
  gaps.forEach(g => freq.set(g, (freq.get(g) ?? 0) + 1));
  let mode = 0, maxFreq = 0;
  freq.forEach((count, gap) => { if (count > maxFreq) { maxFreq = count; mode = gap; } });
  return mode;
}

function detectModalDuration(sessions: MomenceSession[]): number {
  if (sessions.length === 0) return 0;
  const freq = new Map<number, number>();
  sessions.forEach(s => {
    if (s.durationMinutes > 0) freq.set(s.durationMinutes, (freq.get(s.durationMinutes) ?? 0) + 1);
  });
  let mode = 60, maxFreq = 0;
  freq.forEach((count, d) => { if (count > maxFreq) { maxFreq = count; mode = d; } });
  return mode;
}

function buildDayProfile(sessions: MomenceSession[]) {
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const dayUniqueDates = new Map<number, Set<string>>();
  const daySessionCounts = new Map<number, number>();

  DAY_ORDER.forEach(d => {
    dayUniqueDates.set(d, new Set());
    daySessionCounts.set(d, 0);
  });

  sessions.forEach(s => {
    const day = getDay(parseISO(s.startsAt));
    const date = s.startsAt.slice(0, 10);
    dayUniqueDates.get(day)?.add(date);
    daySessionCounts.set(day, (daySessionCounts.get(day) ?? 0) + 1);
  });

  return DAY_ORDER.map((d, i) => {
    const uniqueDays = dayUniqueDates.get(d)!.size;
    const totalSessions = daySessionCounts.get(d)!;
    const avgSessions = uniqueDays > 0 ? totalSessions / uniqueDays : 0;
    return {
      name: DAY_NAMES[i],
      avgSessions: Math.round(avgSessions * 10) / 10,
      uniqueDays,
      isWeekend: d === 0 || d === 6,
      isOpen: uniqueDays > 0,
    };
  });
}

export function SessionAnalysis({ sessions, metrics }: SessionAnalysisProps) {
  const rollingIntervalMins = useMemo(() => detectRollingInterval(sessions), [sessions]);
  const durationMins = useMemo(() => detectModalDuration(sessions), [sessions]);
  const dayProfile = useMemo(() => buildDayProfile(sessions), [sessions]);

  const maxConcurrent = rollingIntervalMins > 0 ? Math.ceil(durationMins / rollingIntervalMins) : 1;
  const maxConcurrentVisitors = maxConcurrent * metrics.modalCapacity;
  const closedDays = dayProfile.filter(d => !d.isOpen).map(d => d.name);
  const activeDays = dayProfile.filter(d => d.isOpen).length;

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          value={rollingIntervalMins > 0 ? `${rollingIntervalMins} min` : '—'}
          label="Rolling interval"
          note="Gap between each wave of session starts"
        />
        <StatCard
          value={durationMins > 0 ? `${durationMins} min` : '—'}
          label="Session length"
          note="Typical booking duration per guest"
        />
        <StatCard
          value={`${maxConcurrent}`}
          label="Concurrent sessions"
          note={`Up to ${maxConcurrentVisitors} visitors in the venue at once`}
        />
        <StatCard
          value={`${activeDays}`}
          label="Operating days / wk"
          note={
            closedDays.length > 0
              ? `${closedDays.join(', ')} typically no sessions`
              : 'All 7 days active'
          }
        />
      </div>

      {/* Day-of-week session chart */}
      <Card>
        <CardContent className="p-5">
          <p className="text-sm font-medium text-foreground mb-1">
            Average sessions per operating day
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Normalised to days where at least one session ran
            {closedDays.length > 0 && ` · ${closedDays.join(', ')} excluded`}
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={dayProfile} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="25%">
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: 13,
                  color: 'hsl(var(--popover-foreground))',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'avgSessions') return [`${value.toFixed(1)} avg sessions`, ''];
                  return [value, name];
                }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: 2 }}
              />
              <Bar dataKey="avgSessions" radius={[4, 4, 0, 0]}>
                {dayProfile.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      !entry.isOpen
                        ? 'hsl(var(--border))'
                        : entry.isWeekend
                        ? 'hsl(var(--primary) / 0.55)'
                        : 'hsl(var(--primary))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-muted-foreground mt-3 flex gap-3">
            <span>
              <span className="inline-block w-2.5 h-2 rounded-sm bg-primary align-middle mr-1" />
              Weekday
            </span>
            <span>
              <span className="inline-block w-2.5 h-2 rounded-sm bg-primary/55 align-middle mr-1" />
              Weekend
            </span>
          </p>
          {rollingIntervalMins > 0 && (
            <p className="text-sm text-muted-foreground mt-4 pt-3 border-t border-border leading-relaxed">
              Rolling {rollingIntervalMins}-minute waves allow up to{' '}
              <span className="font-medium text-foreground">{maxConcurrent} sessions</span> to overlap,
              placing a maximum of{' '}
              <span className="font-medium text-foreground">{maxConcurrentVisitors} visitors</span>{' '}
              in the venue simultaneously.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
