"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { VENUES } from '@/config/api';
import { getCachedEntry, getCacheKey } from '@/lib/venueCache';
import { Card, CardContent } from '@/components/ui/card';

export function HomeClient() {
  const router = useRouter();
  const [logos, setLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    // Seed from the server-side store first (works on first visit, no localStorage needed)
    fetch('/api/venue-images')
      .then(r => r.ok ? r.json() as Promise<Record<string, string>> : {})
      .then(serverImages => {
        const logoMap: Record<string, string> = { ...serverImages };
        // Merge localStorage entries — they may be more recent after a fresh fetch
        for (const venue of VENUES) {
          const entry = getCachedEntry(getCacheKey(venue.id, venue.platform));
          if (entry?.hostInfo?.profileImage) logoMap[venue.id] = entry.hostInfo.profileImage;
        }
        setLogos(logoMap);
      })
      .catch(() => {
        // Fallback to localStorage only
        const logoMap: Record<string, string> = {};
        for (const venue of VENUES) {
          const entry = getCachedEntry(getCacheKey(venue.id, venue.platform));
          if (entry?.hostInfo?.profileImage) logoMap[venue.id] = entry.hostInfo.profileImage;
        }
        setLogos(logoMap);
      });
  }, []);

  return (
    <main className="min-h-screen">
      <div className="page-container">

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Capacity Reports</h1>
        </div>

        {/* Financial Tracker entry point */}
        {/* <Link href="/tracker" className="block mb-6">
          <Card className="bg-purple-1 border-purple-2 rounded-2xl shadow-1 hover:shadow-2 transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-purple-4">Financial Tracker</p>
                <p className="text-sm text-muted-foreground mt-0.5">CapEx burn · Forecast vs actual · Signals</p>
              </div>
              <span className="text-purple-4 text-lg">→</span>
            </CardContent>
          </Card>
        </Link> */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VENUES.map((venue) => (
            <Card
              key={venue.id}
              className="cursor-pointer transition-colors bg-background rounded-2xl shadow-2"
              onClick={() => router.push(`/report?hostId=${venue.id}&platform=${venue.platform}`)}
            >
              <CardContent className="p-0">
                <div className="flex justify-between h-full flex-row-reverse">
                  <div className="p-4 w-full min-w-0 flex flex-col justify-between">
                    <p className="font-medium text-base leading-tight truncate">
                      {venue.name.split(',')[0].trim()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {venue.location}
                    </p>
                  </div>
                  
                    {logos[venue.id] && (
                      <div className="aspect-square w-full rounded-xl rounded-r-none overflow-hidden flex items-center justify-center max-w-24">
                        <img
                          src={logos[venue.id]}
                          alt={venue.name}
                          className="w-full h-full object-contain"
                        />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </main>
  );
}
