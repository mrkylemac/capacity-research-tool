"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, subMonths, subYears } from 'date-fns';
import { useSessions } from '@/hooks/useSessions';
import { VENUES } from '@/config/api';
import { getRecentSearches, removeFromRecent, setCachedEntry, type CachedVenueEntry } from '@/lib/venueCache';
import { DataStatus } from '@/components/DataStatus';
import { RecentSearches } from '@/components/RecentSearches';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { Button } from '@/components/untitled/button';
import { Card, CardContent } from '@/components/untitled/card';
import { Input } from '@/components/untitled/input';
import { Label } from '@/components/untitled/label';

const PRESETS = [
  { label: 'Last 1 month', from: () => subMonths(new Date(), 1), to: () => new Date() },
  { label: 'Last 3 months', from: () => subMonths(new Date(), 3), to: () => new Date() },
  { label: 'Last 6 months', from: () => subMonths(new Date(), 6), to: () => new Date() },
  { label: 'Last 12 months', from: () => subMonths(new Date(), 12), to: () => new Date() },
  { label: 'All time', from: () => subYears(new Date(), 10), to: () => new Date() },
] as const;

function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function HomeClient() {
  const router = useRouter();
  const momenceHook = useSessions();

  const [recentSearches, setRecentSearches] = useState<CachedVenueEntry[]>(() => getRecentSearches());
  const [refreshingKey, setRefreshingKey] = useState<string | null>(null);
  const [hasQueried, setHasQueried] = useState(false);
  const [currentHostId, setCurrentHostId] = useState(VENUES[0]?.id ?? '');
  const [fromDate, setFromDate] = useState(toDateInputValue(subMonths(new Date(), 3)));
  const [toDate, setToDate] = useState(toDateInputValue(new Date()));

  const { allSessions, metrics, monthlyData, venueConfig, hostInfo, dataRange, isLoading, error, totalPages } = momenceHook;

  const canSubmit = currentHostId && fromDate && toDate;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('refresh') !== 'true') return;

    const hostId = sp.get('hostId');
    const from = sp.get('from');
    const to = sp.get('to');
    if (!hostId || !from || !to) return;

    setCurrentHostId(hostId);
    setFromDate(from);
    setToDate(to);
    void handleFetch(hostId, from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasQueried || isLoading || allSessions.length === 0) return;
    const venueName = VENUES.find(v => v.id === currentHostId)?.name || hostInfo?.name || `Host ${currentHostId}`;

    const entry = setCachedEntry({
      hostId: currentHostId,
      platform: 'momence',
      venueName,
      dateRange: { from: fromDate, to: toDate },
      sessions: allSessions,
      metrics,
      monthlyData,
      venueConfig,
      hostInfo,
    });

    setRecentSearches(getRecentSearches());
    router.push(`/report?hostId=${entry.hostId}&from=${fromDate}&to=${toDate}&platform=${entry.platform}`);
  }, [hasQueried, isLoading, allSessions.length, currentHostId, fromDate, toDate, router, metrics, monthlyData, venueConfig, hostInfo, allSessions]);

  async function handleFetch(hostId: string, from: string, to: string) {
    setHasQueried(true);
    await momenceHook.fetchData({
      hostId,
      startsAtFrom: new Date(from).toISOString(),
      startsAtTo: new Date(to).toISOString(),
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    await handleFetch(currentHostId, fromDate, toDate);
  }

  function handleLoadFromCache(entry: CachedVenueEntry) {
    router.push(`/report?hostId=${entry.hostId}&from=${entry.dateRange.from}&to=${entry.dateRange.to}&platform=${entry.platform}`);
  }

  async function handleRefresh(entry: CachedVenueEntry) {
    setRefreshingKey(entry.key);
    setCurrentHostId(entry.hostId);
    setFromDate(entry.dateRange.from);
    setToDate(entry.dateRange.to);
    await handleFetch(entry.hostId, entry.dateRange.from, entry.dateRange.to);
    setRefreshingKey(null);
  }

  function handleDelete(key: string) {
    removeFromRecent(key);
    setRecentSearches(getRecentSearches());
  }

  const selectedVenueName = useMemo(
    () => VENUES.find(v => v.id === currentHostId)?.name ?? 'Venue',
    [currentHostId],
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="notion-page">
        <h1 className="notion-title">Sauna session stats</h1>
        <p className="notion-subtitle">Pick a venue and date range. We’ll build a competitor-ready report.</p>

        <Card className="mb-6">
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <select
                  id="venue"
                  value={currentHostId}
                  onChange={(e) => setCurrentHostId(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {VENUES.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Date range</Label>
                <div className="flex gap-2">
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESETS.map(p => (
                    <Button
                      key={p.label}
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFromDate(toDateInputValue(p.from()));
                        setToDate(toDateInputValue(p.to()));
                      }}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="opacity-0">Action</Label>
                <Button type="submit" disabled={isLoading || !canSubmit} className="w-full">
                  {isLoading ? `Loading ${selectedVenueName}…` : 'Fetch data'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mb-6">
          <RecentSearches
            entries={recentSearches}
            onSelect={handleLoadFromCache}
            onRefresh={handleRefresh}
            onDelete={handleDelete}
            refreshingKey={refreshingKey}
          />
        </div>

        {hasQueried && isLoading && (
          <>
            <DataStatus
              isLoading={isLoading}
              error={error as Error | null}
              sessionCount={momenceHook.fetchingCount}
              pageCount={totalPages}
              dataRange={dataRange}
              loadingLabel={`Fetching ${selectedVenueName}…`}
            />
            <DashboardSkeleton />
          </>
        )}
      </div>
    </main>
  );
}

