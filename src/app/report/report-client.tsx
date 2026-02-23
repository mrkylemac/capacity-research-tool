"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { VenueHeader } from '@/components/VenueHeader';
import { PerformanceScorecard } from '@/components/PerformanceScorecard';
import { OperationalBlueprint } from '@/components/OperationalBlueprint';
import { DemandIntelligence } from '@/components/DemandIntelligence';
import { GrowthStory } from '@/components/GrowthStory';
import { MonthlyTable } from '@/components/MonthlyTable';
import { calculateBenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { getCachedEntry, getCacheKey, getRecentSearches } from '@/lib/venueCache';
import type { CachedVenueEntry } from '@/lib/venueCache';

function pickEntry({
  hostId,
  from,
  to,
  platform,
}: {
  hostId: string | null;
  from: string | null;
  to: string | null;
  platform: CachedVenueEntry['platform'] | null;
}): CachedVenueEntry | null {
  if (hostId && from && to && platform) {
    const key = getCacheKey(hostId, platform, from, to);
    return getCachedEntry(key);
  }
  const recent = getRecentSearches();
  return recent[0] ?? null;
}

export function ReportClient() {
  const [entry, setEntry] = useState<CachedVenueEntry | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const hostId = sp.get('hostId');
    const from = sp.get('from');
    const to = sp.get('to');
    const platform = (sp.get('platform') as CachedVenueEntry['platform'] | null) ?? 'momence';
    setEntry(pickEntry({ hostId, from, to, platform }));
  }, []);

  const benchmarkMetrics = useMemo(() => {
    if (!entry) return null;
    const activeSessions = entry.sessions.filter(s => s.ticketsSold > 0);
    if (activeSessions.length === 0) return null;
    const sorted = [...activeSessions].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
    return calculateBenchmarkMetrics(
      activeSessions,
      sorted[0].startsAt,
      sorted[sorted.length - 1].startsAt,
    );
  }, [entry]);

  if (!entry) {
    return (
      <main className="notion-page">
        <h1 className="notion-title">Report</h1>
        <p className="notion-text">
          No cached venue found for this URL.
        </p>
        <p className="notion-muted">
          Start by fetching a venue on the home screen (or open a report link with hostId/from/to).
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back home
          </Link>
        </div>
      </main>
    );
  }

  if (!benchmarkMetrics) {
    return (
      <main className="notion-page">
        <h1 className="notion-title">Report</h1>
        <p className="notion-text">No active sessions in this dataset.</p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Back home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="notion-page">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <p className="text-xs text-muted-foreground">
            Report view (Next.js)
          </p>
        </div>

        <div className="space-y-10">
          <VenueHeader
            metrics={benchmarkMetrics}
            venueConfig={entry.venueConfig}
            hostInfo={entry.hostInfo}
            dateRange={entry.dateRange}
          />

          <section>
            <p className="notion-section-h1">Performance</p>
            <PerformanceScorecard metrics={benchmarkMetrics} />
          </section>

          {entry.venueConfig && (
            <OperationalBlueprint
              metrics={benchmarkMetrics}
              venueConfig={entry.venueConfig}
            />
          )}

          {entry.sessions.length > 0 && (
            <section>
              <p className="notion-section-h1">Demand</p>
              <DemandIntelligence sessions={entry.sessions} metrics={benchmarkMetrics} />
            </section>
          )}

          {entry.monthlyData.length >= 2 && (
            <section>
              <p className="notion-section-h1">Growth</p>
              <GrowthStory monthlyData={entry.monthlyData} />
            </section>
          )}

          {entry.monthlyData.length > 0 && (
            <section>
              <MonthlyTable data={entry.monthlyData} sessions={entry.sessions} collapsible />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

