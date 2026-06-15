"use client";

import { useMemo } from 'react';
import { parseISO, getHours, getMinutes, format } from 'date-fns';
import type { MomenceSession } from '@/types/momence';
import type { BenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { Card, CardContent } from '@/components/ui/card';
import { VENUES } from '@/config/api';
import type { VenuePricingConfig } from '@/config/api';

// ── Types ──────────────────────────────────────────────────────────────────────

type SessionKind = 'bath' | 'class' | 'short';

interface CompositionEntry {
  kind: SessionKind;
  label: string;
  sessionCount: number;
  totalVisitors: number;
  totalCapacity: number;
  sessionPct: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const CLASS_KEYWORDS = [
  'yoga', 'pilates', 'fitness', 'class', 'workshop', 'ceremony',
  'saunagus', 'gus', 'meditation', 'stretch', 'guided', 'latvian',
  'ritual', 'breathwork', 'sound',
];

function getModalDuration(sessions: MomenceSession[]): number {
  const counts = new Map<number, number>();
  sessions.forEach(s => {
    if (s.durationMinutes > 0) counts.set(s.durationMinutes, (counts.get(s.durationMinutes) ?? 0) + 1);
  });
  let modal = 60;
  let maxCount = 0;
  counts.forEach((c, d) => { if (c > maxCount) { maxCount = c; modal = d; } });
  return modal;
}

function classifySession(s: MomenceSession, modalDuration: number): SessionKind {
  const name = s.sessionName.toLowerCase();
  if (CLASS_KEYWORDS.some(kw => name.includes(kw))) return 'class';
  if (s.durationMinutes > 0 && s.durationMinutes < modalDuration * 0.65) return 'short';
  return 'bath';
}

function buildComposition(sessions: MomenceSession[], modalDuration: number): CompositionEntry[] {
  const buckets: Record<SessionKind, { count: number; visitors: number; cap: number }> = {
    bath: { count: 0, visitors: 0, cap: 0 },
    class: { count: 0, visitors: 0, cap: 0 },
    short: { count: 0, visitors: 0, cap: 0 },
  };
  sessions.forEach(s => {
    const kind = classifySession(s, modalDuration);
    buckets[kind].count++;
    buckets[kind].visitors += s.ticketsSold;
    buckets[kind].cap += s.capacity;
  });
  const total = sessions.length;
  const LABELS: Record<SessionKind, string> = {
    bath: 'Sauna & bath sessions',
    class: 'Class+ sessions (incl. bath)',
    short: 'Short / crossover sessions',
  };
  return (['bath', 'class', 'short'] as SessionKind[])
    .filter(k => buckets[k].count > 0)
    .map(k => ({
      kind: k,
      label: LABELS[k],
      sessionCount: buckets[k].count,
      totalVisitors: buckets[k].visitors,
      totalCapacity: buckets[k].cap,
      sessionPct: total > 0 ? (buckets[k].count / total) * 100 : 0,
    }));
}

function computePeakConcurrent(sessions: MomenceSession[]): { peak: number; p75: number } {
  if (sessions.length === 0) return { peak: 0, p75: 0 };
  const events: { t: number; delta: number }[] = [];
  sessions.forEach(s => {
    events.push({ t: new Date(s.startsAt).getTime(), delta: s.capacity });
    events.push({ t: new Date(s.endsAt).getTime(), delta: -s.capacity });
  });
  events.sort((a, b) => a.t - b.t);
  let current = 0;
  let peak = 0;
  const startSnaps: number[] = [];
  events.forEach(e => {
    current += e.delta;
    if (current > peak) peak = current;
    if (e.delta > 0) startSnaps.push(current);
  });
  startSnaps.sort((a, b) => a - b);
  const p75 = startSnaps[Math.floor(startSnaps.length * 0.75)] ?? peak;
  return { peak, p75 };
}

function computeSessionIncrement(sessions: MomenceSession[]): number | null {
  if (sessions.length === 0) return null;
  const byDate = new Map<string, number[]>();
  sessions.forEach(s => {
    const d = parseISO(s.startsAt);
    const key = format(d, 'yyyy-MM-dd');
    const mins = getHours(d) * 60 + getMinutes(d);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(mins);
  });
  const gapCounts = new Map<number, number>();
  byDate.forEach(times => {
    const sorted = [...new Set(times)].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap >= 10 && gap <= 120) gapCounts.set(gap, (gapCounts.get(gap) ?? 0) + 1);
    }
  });
  if (gapCounts.size === 0) return null;
  let modal = 0;
  let maxCount = 0;
  gapCounts.forEach((c, g) => { if (c > maxCount) { maxCount = c; modal = g; } });
  return modal >= 10 ? modal : null;
}

function computeOverbooking(sessions: MomenceSession[]) {
  const over = sessions.filter(s => s.ticketsSold > s.capacity);
  return { count: over.length, pct: sessions.length > 0 ? (over.length / sessions.length) * 100 : 0 };
}

function fmtHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const period = hh < 12 ? 'am' : 'pm';
  const display = hh === 0 ? 12 : hh <= 12 ? hh : hh - 12;
  return mm === 0 ? `${display}${period}` : `${display}:${mm.toString().padStart(2, '0')}${period}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium mb-3">{children}</p>;
}

function StatRow({ label, right, pct, subRight, dimBar = false }: {
  label: string; right: string; pct: number; subRight?: string; dimBar?: boolean;
}) {
  return (
    <div className="relative h-8 rounded-lg overflow-hidden flex items-center px-3">
      <div className="absolute inset-0 bg" />
      <div
        className="absolute inset-y-0 left-0 rounded-lg transition-[width,background-color] duration-300"
        style={{
          width: `${Math.min(Math.max(pct, 0), 100)}%`,
          backgroundColor: dimBar
            ? 'color-mix(in srgb, var(--muted-foreground) 14%, transparent)'
            : 'color-mix(in srgb, var(--chart-fill) 18%, transparent)',
        }}
      />
      <span className="relative z-10 text-sm">{label}</span>
      <span className="relative z-10 ml-auto text-sm tabular-nums font-medium shrink-0 flex items-baseline gap-2">
        {subRight && <span className="text-xs text-muted-foreground font-normal">{subRight}</span>}
        {right}
      </span>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground leading-none mb-1">{label}</p>
      <p className="text-sm tabular-nums font-medium leading-snug">{value}</p>
    </div>
  );
}

function PricingTable({ pricing }: { pricing: VenuePricingConfig }) {
  const hasPackRates = pricing.tiers.some(t => t.pack5PerVisit || t.pack10PerVisit);

  return (
    <div>
      {/* Session tier rows */}
      <div className="border border-border rounded-lg overflow-hidden mb-4">
        <div className="grid text-[11px] font-medium text-muted-foreground bg-muted/40 px-3 py-2"
          style={{ gridTemplateColumns: hasPackRates ? '1fr auto auto auto' : '1fr auto' }}
        >
          <span>Session</span>
          <span className="text-right">Single</span>
          {hasPackRates && <span className="text-right pl-4">5-Pack</span>}
          {hasPackRates && <span className="text-right pl-4">10-Pack</span>}
        </div>
        {pricing.tiers.map((tier, i) => (
          <div
            key={tier.label}
            className="grid items-center px-3 py-2.5 text-sm border-t border-border first:border-t-0"
            style={{ gridTemplateColumns: hasPackRates ? '1fr auto auto auto' : '1fr auto' }}
          >
            <span className="font-medium">{tier.label}</span>
            <span className="tabular-nums text-right">${tier.casualRate}</span>
            {hasPackRates && (
              <span className="tabular-nums text-right pl-4 text-muted-foreground">
                {tier.pack5PerVisit ? `$${tier.pack5PerVisit}/visit` : '—'}
              </span>
            )}
            {hasPackRates && (
              <span className="tabular-nums text-right pl-4 text-muted-foreground">
                {tier.pack10PerVisit ? `$${tier.pack10PerVisit}/visit` : '—'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Memberships */}
      {pricing.memberships && pricing.memberships.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden mb-3">
          <div className="grid grid-cols-[1fr_auto] text-[11px] font-medium text-muted-foreground bg-muted/40 px-3 py-2">
            <span>Membership</span>
            <span className="text-right">Price</span>
          </div>
          {pricing.memberships.map(m => (
            <div key={m.label} className="grid grid-cols-[1fr_auto] items-start px-3 py-2.5 text-sm border-t border-border first:border-t-0 gap-3">
              <div>
                <p className="font-medium">{m.label}</p>
                {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
              </div>
              <span className="tabular-nums text-right whitespace-nowrap">{m.price}</span>
            </div>
          ))}
        </div>
      )}

      {pricing.note && (
        <p className="text-xs text-muted-foreground">{pricing.note}</p>
      )}
    </div>
  );
}

function DerivedPricingDisplay({ sessions, metrics }: { sessions: MomenceSession[]; metrics: BenchmarkMetrics }) {
  // Show price distribution from fixedTicketPrice when no config is present
  const tiers = useMemo(() => {
    const counts = new Map<number, number>();
    sessions.forEach(s => {
      if (s.fixedTicketPrice > 0) {
        const p = Math.round(s.fixedTicketPrice);
        counts.set(p, (counts.get(p) ?? 0) + 1);
      }
    });
    if (counts.size === 0) return [];
    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
    const sorted = Array.from(counts.entries()).sort(([a], [b]) => b - a);
    const maxPct = (sorted[0]?.[1] ?? 1) / total * 100;
    return sorted.map(([price, count]) => ({
      price,
      pct: total > 0 ? (count / total) * 100 : 0,
      maxPct,
    }));
  }, [sessions]);

  if (tiers.length === 0) return <p className="text-sm text-muted-foreground">No price data in this dataset.</p>;

  return (
    <div className="space-y-1">
      {tiers.slice(0, 5).map(t => (
        <StatRow
          key={t.price}
          label={`$${t.price}`}
          pct={(t.pct / t.maxPct) * 100}
          right={`${t.pct.toFixed(0)}% of sessions`}
        />
      ))}
      {metrics.avgPrice > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Avg listed price ${metrics.avgPrice.toFixed(0)} · actual ARPV will be lower where packs and memberships are used.
        </p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface OperatingModelProps {
  sessions: MomenceSession[];
  metrics: BenchmarkMetrics;
  hostId?: string;
}

export function OperatingModel({ sessions, metrics, hostId }: OperatingModelProps) {
  if (sessions.length === 0) return null;

  const venueConfig = useMemo(() => VENUES.find(v => v.id === hostId), [hostId]);

  const modalDuration = useMemo(() => getModalDuration(sessions), [sessions]);
  const composition = useMemo(() => buildComposition(sessions, modalDuration), [sessions, modalDuration]);
  const concurrent = useMemo(() => computePeakConcurrent(sessions), [sessions]);
  const increment = useMemo(() => computeSessionIncrement(sessions), [sessions]);
  const overbooking = useMemo(() => computeOverbooking(sessions), [sessions]);

  const avgOccupancy = metrics.totalCapacity > 0
    ? (metrics.totalVisits / metrics.totalCapacity) * 100
    : 0;

  const sessionsPerDay = metrics.totalSessions / Math.max(metrics.daysInRange, 1);
  const { weekdayStart, weekdayEnd, weekendStart, weekendEnd } = metrics.operatingHours;
  const sameHours = weekdayStart === weekendStart && weekdayEnd === weekendEnd;

  const maxSessionPct = Math.max(...composition.map(c => c.sessionPct), 1);

  const hasMembershipSignal = overbooking.pct >= 2;

  return (
    <Card className="print-section shadow-sm">
      <CardContent className="px-4 py-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-lg font-semibold">Sessions</p>
          <div className="text-right">
            <p className="text-[22px] font-semibold tabular-nums leading-none tracking-[-0.03em]">
              {avgOccupancy.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">avg occupancy</p>
          </div>
        </div>

        {/* 1 · Structure ────────────────────────────────────────────────── */}
        <div className="mb-6">
          <SectionLabel>Structure</SectionLabel>
          <div className="space-y-1">
            <StatRow label="Session duration (modal)" pct={100} right={`${modalDuration} min`} />
            {increment !== null && (
              <StatRow
                label="Session increment"
                pct={(increment / modalDuration) * 100}
                right={`Every ${increment} min`}
              />
            )}
            <StatRow
              label="Sessions per day (avg)"
              pct={Math.min((sessionsPerDay / 25) * 100, 100)}
              right={sessionsPerDay.toFixed(1)}
            />
            {metrics.modalCapacity > 0 && (
              <StatRow
                label="Guests per session start (modal)"
                pct={Math.min((metrics.modalCapacity / (concurrent.peak || metrics.modalCapacity)) * 100, 100)}
                right={`${metrics.modalCapacity} guests`}
              />
            )}
            <StatRow
              label="Peak concurrent guests"
              pct={100}
              right={`${concurrent.peak}`}
            />
            <StatRow
              label="Typical busy concurrent"
              pct={(concurrent.p75 / Math.max(concurrent.peak, 1)) * 100}
              right={`${concurrent.p75}`}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {sameHours
              ? `${fmtHour(weekdayStart)}–${fmtHour(weekdayEnd)} daily`
              : `Weekday ${fmtHour(weekdayStart)}–${fmtHour(weekdayEnd)} · Weekend ${fmtHour(weekendStart)}–${fmtHour(weekendEnd)}`
            }
            {' · '}Peak concurrent = all-time maximum. Typical busy = 75th-percentile at session starts.
          </p>
        </div>

        {/* 2 · Visit mix ───────────────────────────────────────────────── */}
        <div className="pt-5 border-t border-border mb-6">
          <SectionLabel>Visit mix</SectionLabel>
          <div className="space-y-1 mb-4">
            {composition.map(c => {
              const fillPct = c.totalCapacity > 0 ? (c.totalVisitors / c.totalCapacity) * 100 : 0;
              return (
                <StatRow
                  key={c.kind}
                  label={c.label}
                  pct={(c.sessionPct / maxSessionPct) * 100}
                  right={`${c.sessionPct.toFixed(0)}%`}
                  subRight={`${c.totalVisitors.toLocaleString()} visits · ${fillPct.toFixed(0)}% fill`}
                  dimBar={c.kind !== 'bath'}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mb-4">
            <Stat label="Total visits" value={metrics.totalVisits.toLocaleString()} />
            <Stat label="Avg fill rate" value={`${avgOccupancy.toFixed(1)}%`} />
            {hasMembershipSignal && (
              <Stat label="Overbooked sessions" value={`${overbooking.count} (${overbooking.pct.toFixed(0)}%)`} />
            )}
          </div>

          {hasMembershipSignal && (
            <p className="text-xs text-muted-foreground">
              {overbooking.pct.toFixed(0)}% of sessions had more bookings than the configured session cap — a floor-level membership signal. The real membership share is significantly higher: members who book within capacity are indistinguishable from casual visitors in this dataset.
            </p>
          )}
        </div>

        {/* 3 · Pricing ──────────────────────────────────────────────────── */}
        <div className="pt-5 border-t border-border">
          <SectionLabel>Pricing</SectionLabel>
          {venueConfig?.pricing ? (
            <PricingTable pricing={venueConfig.pricing} />
          ) : (
            <DerivedPricingDisplay sessions={sessions} metrics={metrics} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
