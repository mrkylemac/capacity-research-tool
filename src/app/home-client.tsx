"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, subYears } from 'date-fns';
import { Loader2, RotateCcw } from 'lucide-react';
import { useSessions } from '@/hooks/useSessions';
import { momenceClient } from '@/lib/momenceClient';
import { VENUES } from '@/config/api';
import {
  getRecentSearches,
  setCachedEntry,
  type CachedVenueEntry,
} from '@/lib/venueCache';
import { DataStatus } from '@/components/DataStatus';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Fetch 3 years back so the report's period selector has maximum data
const FETCH_FROM = format(subYears(new Date(), 3), 'yyyy-MM-dd');
const FETCH_TO = format(new Date(), 'yyyy-MM-dd');

export function HomeClient() {
  const router = useRouter();
  const hook = useSessions();
  const { allSessions, metrics, monthlyData, venueConfig, hostInfo, dataRange, isLoading, error, fetchingCount, totalPages } = hook;

  const [loadingVenueId, setLoadingVenueId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Initialised empty to avoid SSR/client hydration mismatch
  const [cachedMap, setCachedMap] = useState<Record<string, CachedVenueEntry>>({});
  // Logo images fetched for venues not yet in cache
  const [logoMap, setLogoMap] = useState<Record<string, string | null>>({});

  // On mount: load cache, then pre-fetch logos for any venue missing one
  useEffect(() => {
    const map = Object.fromEntries(getRecentSearches().map(e => [e.hostId, e]));
    setCachedMap(map);

    VENUES.forEach(async (venue) => {
      if (map[venue.id]?.hostInfo?.profileImage) return; // already have logo
      try {
        const info = await momenceClient.fetchHostInfo(venue.id);
        if (info?.profileImage) {
          setLogoMap(prev => ({ ...prev, [venue.id]: info.profileImage }));
        }
      } catch {
        // fail silently — initials fallback will show
      }
    });
  }, []);

  // Once a fetch finishes: save to cache, refresh card state, then navigate
  useEffect(() => {
    if (!loadingVenueId || isLoading) return;

    if (allSessions.length === 0) {
      setFetchError('No sessions found for this venue.');
      setLoadingVenueId(null);
      return;
    }

    const venueName =
      VENUES.find(v => v.id === loadingVenueId)?.name ||
      hostInfo?.name ||
      `Host ${loadingVenueId}`;

    const entry = setCachedEntry({
      hostId: loadingVenueId,
      platform: 'momence',
      venueName,
      dateRange: { from: FETCH_FROM, to: FETCH_TO },
      sessions: allSessions,
      metrics,
      monthlyData,
      venueConfig,
      hostInfo,
    });

    // Refresh the card map before navigating so the card shows fresh data
    setCachedMap(Object.fromEntries(getRecentSearches().map(e => [e.hostId, e])));

    router.push(
      `/report?hostId=${entry.hostId}&from=${FETCH_FROM}&to=${FETCH_TO}&platform=${entry.platform}`,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingVenueId, isLoading, allSessions.length]);

  async function handleVenueClick(venueId: string) {
    if (loadingVenueId) return;
    setFetchError(null);

    // Cached → navigate immediately without re-fetching
    const cached = cachedMap[venueId] ?? null;
    if (cached) {
      router.push(
        `/report?hostId=${cached.hostId}&from=${cached.dateRange.from}&to=${cached.dateRange.to}&platform=${cached.platform}`,
      );
      return;
    }

    // Not cached → fetch then navigate
    setLoadingVenueId(venueId);
    await hook.fetchData({
      hostId: venueId,
      startsAtFrom: new Date(FETCH_FROM).toISOString(),
      startsAtTo: new Date(FETCH_TO).toISOString(),
    });
  }

  async function handleRefetch(venueId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (loadingVenueId) return;
    setFetchError(null);
    setLoadingVenueId(venueId);
    await hook.fetchData({
      hostId: venueId,
      startsAtFrom: new Date(FETCH_FROM).toISOString(),
      startsAtTo: new Date(FETCH_TO).toISOString(),
    });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="notion-page">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Venues</h1>
          <p className="text-md text-muted-foreground mt-1">Select a venue to open its report</p>
        </div>

        {/* Venue grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VENUES.map(venue => {
            const cached = cachedMap[venue.id] ?? null;
            const isLoadingThis = loadingVenueId === venue.id;
            const logoUrl = cached?.hostInfo?.profileImage ?? logoMap[venue.id] ?? null;
            // Use API name from cache if available; otherwise strip ", location" suffix from config name
            const displayName = cached?.hostInfo?.name ?? venue.name.split(',')[0].trim();
            const initials = displayName
              .split(' ')
              .map((w: string) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <Card
                key={venue.id}
                onClick={() => handleVenueClick(venue.id)}
                className={[
                  'cursor-pointer transition-all bg-muted/20 border-border',
                  'hover:border-primary/40 hover:bg-muted/40',
                  isLoadingThis ? 'pointer-events-none opacity-75' : '',
                ].join(' ')}
              >
                <CardContent className="p-5">
                  {/* Name + avatar row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 pt-0.5 flex-1">
                      <p className="font-semibold text-base leading-tight truncate">{displayName}</p>
                      <p className="text-md text-muted-foreground mt-1">{venue.location}</p>
                    </div>

                    <Avatar className="h-14 w-14 shrink-0 rounded-xl">
                      {logoUrl ? (
                        <AvatarImage
                          src={logoUrl}
                          alt={displayName}
                          className="rounded-xl object-cover"
                        />
                      ) : (
                        <AvatarFallback className="rounded-xl text-md font-bold">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </div>

                  {/* Bottom row: loading indicator or refresh button */}
                  <div className="flex items-center justify-between mt-4">
                    {isLoadingThis ? (
                      <div className="flex items-center gap-2 text-md text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        <span>
                          {fetchingCount > 0
                            ? `${fetchingCount.toLocaleString()} sessions…`
                            : 'Connecting…'}
                        </span>
                      </div>
                    ) : (
                      <span />
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={(e) => handleRefetch(venue.id, e)}
                      title="Refresh data"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Inline fetch progress */}
        {loadingVenueId && (
          <div className="mt-6">
            <DataStatus
              isLoading={isLoading}
              error={error as Error | null}
              sessionCount={fetchingCount}
              pageCount={totalPages}
              dataRange={dataRange}
              loadingLabel={`Fetching ${VENUES.find(v => v.id === loadingVenueId)?.name ?? 'venue'}…`}
            />
          </div>
        )}

        {fetchError && (
          <p className="mt-4 text-md text-destructive">{fetchError}</p>
        )}
      </div>
    </main>
  );
}
