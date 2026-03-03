"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VENUES } from '@/config/api';
import { getCachedEntry, getCacheKey } from '@/lib/venueCache';
import { Card, CardContent } from '@/components/ui/card';

export function HomeClient() {
  const router = useRouter();
  const [logos, setLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const venue of VENUES) {
      const entry = getCachedEntry(getCacheKey(venue.id, venue.platform));
      if (entry?.hostInfo?.profileImage) map[venue.id] = entry.hostInfo.profileImage;
    }
    setLogos(map);
  }, []);

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
              onClick={() => router.push(`/report?hostId=${venue.id}&platform=${venue.platform}`)}
            >
              <CardContent className="p-0">
                <div className="flex justify-between h-full flex-row-reverse">
                  <div className="grid grid-cols-1 gap-1 p-4 w-full">
                    <p className="font-medium text-base leading-tight truncate">
                      {venue.name.split(',')[0].trim()}
                    </p>
                    <p className="text-sm text-muted-foreground h-auto grow-0 flex items-end">
                      {venue.location}
                    </p>
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
