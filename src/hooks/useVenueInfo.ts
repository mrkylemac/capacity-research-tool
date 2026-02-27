import { useEffect, useState } from 'react';
import type { PlaceInfo } from '@/app/api/venue-info/route';

const CACHE_KEY = 'venue-place-cache';

function getCache(): Record<string, PlaceInfo> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setCache(query: string, info: PlaceInfo): void {
  if (typeof window === 'undefined') return;
  const cache = getCache();
  cache[query] = info;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function useVenueInfo(mapsQuery?: string): { info: PlaceInfo | null; loading: boolean } {
  const [info, setInfo] = useState<PlaceInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mapsQuery) return;

    // Check cache first
    const cached = getCache()[mapsQuery];
    if (cached) {
      setInfo(cached);
      return;
    }

    setLoading(true);
    fetch(`/api/venue-info?query=${encodeURIComponent(mapsQuery)}`)
      .then(r => {
        if (!r.ok) return null;
        return r.json() as Promise<PlaceInfo>;
      })
      .then(data => {
        if (data && !('error' in data)) {
          setInfo(data);
          setCache(mapsQuery, data);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [mapsQuery]);

  return { info, loading };
}
