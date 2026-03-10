import type { MomenceSession, SessionMetrics, MonthlyData, VenueConfig } from '@/types/momence';
import type { HostInfo } from '@/lib/momenceClient';
import type { Platform } from '@/config/api';

const CACHE_KEY = 'venue-cache';
const RECENT_KEY = 'venue-recent';
const MAX_RECENT = 10;
const MAX_ENTRIES = 10; // one entry per venue

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

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

export function getCacheKey(hostId: string, platform: Platform): string {
  return `${hostId}|${platform}`;
}

function getCache(): Record<string, CachedVenueEntry> {
  if (!canUseStorage()) return {};
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function getRecentKeys(): string[] {
  if (!canUseStorage()) return [];
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

/** Return the full cache map, parsed once. Use for batch lookups to avoid repeated JSON.parse calls. */
export function getAllCachedEntries(): Record<string, CachedVenueEntry> {
  return getCache();
}

/**
 * Attempt to write the cache to localStorage.
 * If a QuotaExceededError is thrown, evict the oldest entry (that isn't
 * `currentKey`) and retry, up to MAX_ENTRIES times.
 */
function writeCacheWithEviction(
  cache: Record<string, CachedVenueEntry>,
  currentKey: string,
): void {
  for (let attempt = 0; attempt <= MAX_ENTRIES; attempt++) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      return;
    } catch (err) {
      const isQuota =
        err instanceof DOMException &&
        (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      if (!isQuota) return; // unexpected error — bail silently

      // Evict the oldest entry that isn't the one we just wrote
      const candidates = Object.values(cache).filter(e => e.key !== currentKey);
      if (candidates.length === 0) return; // nothing left to evict
      const oldest = candidates.reduce((a, b) => (a.cachedAt < b.cachedAt ? a : b));
      delete cache[oldest.key];
    }
  }
}

export function setCachedEntry(entry: Omit<CachedVenueEntry, 'key' | 'cachedAt'>): CachedVenueEntry {
  if (!canUseStorage()) {
    const key = getCacheKey(entry.hostId, entry.platform);
    return { ...entry, key, cachedAt: new Date().toISOString() };
  }
  const key = getCacheKey(entry.hostId, entry.platform);
  const full: CachedVenueEntry = { ...entry, key, cachedAt: new Date().toISOString() };
  const cache = getCache();
  cache[key] = full;

  // Proactively evict entries beyond the cap (keep newest MAX_ENTRIES)
  const allEntries = Object.values(cache).sort((a, b) => b.cachedAt.localeCompare(a.cachedAt));
  for (const old of allEntries.slice(MAX_ENTRIES)) {
    delete cache[old.key];
  }

  writeCacheWithEviction(cache, key);

  const recent = getRecentKeys();
  const updated = [key, ...recent.filter(k => k !== key)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // QuotaExceededError — recent list is non-critical, skip silently
  }
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
  if (!canUseStorage()) return;
  const updated = getRecentKeys().filter(k => k !== key);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}
