"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { VENUES } from '@/config/api';
import { getCachedEntry, getCacheKey, setCachedEntry } from '@/lib/venueCache';
import { Card, CardContent } from '@/components/ui/card';
import type { CachedVenueEntry } from '@/lib/venueCache';
import type { VenueConfig } from '@/config/api';

export function HomeClient() {
  const router = useRouter();
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const venue of VENUES) {
      const entry = getCachedEntry(getCacheKey(venue.id, venue.platform));
      if (entry?.hostInfo?.profileImage) map[venue.id] = entry.hostInfo.profileImage;
    }
    setLogos(map);
  }, []);

  const handleFetch = useCallback(async (venue: VenueConfig, e: React.MouseEvent) => {
    e.stopPropagation();

    if (venue.platform === 'momence') {
      router.push(`/report?hostId=${venue.id}&platform=${venue.platform}`);
      return;
    }

    setFetchingId(venue.id);
    try {
      const res = await fetch('/api/fetch-venue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hostId: venue.id, platform: venue.platform }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);

      const cacheRes = await fetch(`/api/venue-data?hostId=${venue.id}&platform=${venue.platform}`);
      if (!cacheRes.ok) throw new Error('Failed to load cached data');
      const fresh: CachedVenueEntry = await cacheRes.json();
      setCachedEntry(fresh);
      router.push(`/report?hostId=${venue.id}&platform=${venue.platform}`);
    } catch {
      setFetchingId(null);
    } finally {
      setFetchingId(null);
    }
  }, [router]);

  const navigateToReport = useCallback((venue: VenueConfig) => {
    router.push(`/report?hostId=${venue.id}&platform=${venue.platform}`);
  }, [router]);

  return (
    <main className="min-h-screen">
      <div className="page-container">

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Capacity Report</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VENUES.map((venue) => (
            <Card
              key={venue.id}
              className="cursor-pointer transition-colors bg-background rounded-2xl shadow-2"
              onClick={() => navigateToReport(venue)}
            >
              <CardContent className="p-0">
                <div className="flex justify-between h-full flex-row-reverse">
                  <div className="grid grid-cols-1 gap-1 p-4 w-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-base leading-tight truncate">
                          {venue.name.split(',')[0].trim()}
                        </p>
                        <p className="text-sm text-muted-foreground h-auto grow-0 flex items-end">
                          {venue.location}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleFetch(venue, e)}
                        disabled={fetchingId === venue.id}
                        className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-gray-2 transition-colors disabled:opacity-50"
                        aria-label={`Fetch ${venue.name}`}
                      >
                        <RefreshCw className={`h-4 w-4 ${fetchingId === venue.id ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                  <div className="aspect-square w-full rounded-xl rounded-r-none overflow-hidden bg-gray-2 flex items-center justify-center max-w-24">
                    {logos[venue.id] ? (
                      <img
                        src={logos[venue.id]}
                        alt={venue.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-muted-foreground">
                        {venue.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </main>
  );
}
