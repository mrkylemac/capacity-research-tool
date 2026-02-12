import type { MomenceSession, SessionMetrics, MonthlyData, VenueConfig } from '@/types/momence';
import type { HostInfo } from '@/lib/momenceClient';
import type { Platform } from '@/config/api';

const CACHE_KEY = 'venue-cache';
const RECENT_KEY = 'venue-recent';
const MAX_RECENT = 9;

export interface CachedVenueEntry {
  key: string;
  hostId: string;
  platform: Platform;
  venueName: string;
  dateRange: { from: string; to: string };
  cachedAt: string;
  sessions: MomenceSession[];
  metrics: SessionMetrics | null;
  monthlyData: MonthlyData[];
  venueConfig: VenueConfig | null;
  hostInfo: HostInfo | null;
}

export function getCacheKey(hostId: string, platform: Platform, from: string, to: string): string {
  return `${hostId}|${platform}|${from}|${to}`;
}

function getCache(): Record<string, CachedVenueEntry> {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function getRecentKeys(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function getCachedEntry(key: string): CachedVenueEntry | null {
  const cache = getCache();
  return cache[key] ?? null;
}

export function setCachedEntry(entry: Omit<CachedVenueEntry, 'key' | 'cachedAt'>): CachedVenueEntry {
  const key = getCacheKey(entry.hostId, entry.platform, entry.dateRange.from, entry.dateRange.to);
  const full: CachedVenueEntry = { ...entry, key, cachedAt: new Date().toISOString() };
  const cache = getCache();
  cache[key] = full;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

  const recent = getRecentKeys();
  const updated = [key, ...recent.filter(k => k !== key)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  return full;
}

export function getRecentSearches(): CachedVenueEntry[] {
  const keys = getRecentKeys();
  const cache = getCache();
  return keys
    .map(k => cache[k])
    .filter((e): e is CachedVenueEntry => !!e);
}

export function removeFromRecent(key: string): void {
  const updated = getRecentKeys().filter(k => k !== key);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}
