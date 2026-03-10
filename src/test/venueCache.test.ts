import { getCacheKey, getCachedEntry, setCachedEntry, getRecentSearches, removeFromRecent, getAllCachedEntries } from '@/lib/venueCache';
import type { Platform } from '@/config/api';

// ── Mock localStorage ─────────────────────────────────────────────────────────

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

function makeEntry(hostId: string, platform: Platform = 'momence') {
  return {
    hostId,
    platform,
    venueName: `Venue ${hostId}`,
    dateRange: { from: '2026-01-01', to: '2026-03-01' },
    sessions: [],
    metrics: null,
    monthlyData: [],
    venueConfig: null,
    hostInfo: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// getCacheKey
// ═══════════════════════════════════════════════════════════════════════════════

describe('getCacheKey', () => {
  it('creates a key from hostId and platform', () => {
    expect(getCacheKey('abc123', 'momence')).toBe('abc123|momence');
    expect(getCacheKey('xyz', 'glofox')).toBe('xyz|glofox');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// setCachedEntry / getCachedEntry
// ═══════════════════════════════════════════════════════════════════════════════

describe('setCachedEntry / getCachedEntry', () => {
  it('stores and retrieves an entry', () => {
    const entry = makeEntry('host1');
    const stored = setCachedEntry(entry);
    expect(stored.key).toBe('host1|momence');
    expect(stored.cachedAt).toBeTruthy();

    const retrieved = getCachedEntry('host1|momence');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.venueName).toBe('Venue host1');
  });

  it('returns null for missing entry', () => {
    expect(getCachedEntry('nonexistent')).toBeNull();
  });

  it('overwrites existing entry', () => {
    setCachedEntry(makeEntry('host1'));
    const updated = { ...makeEntry('host1'), venueName: 'Updated' };
    setCachedEntry(updated);

    const retrieved = getCachedEntry('host1|momence');
    expect(retrieved!.venueName).toBe('Updated');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LRU eviction
// ═══════════════════════════════════════════════════════════════════════════════

describe('LRU eviction', () => {
  it('evicts oldest entries when exceeding MAX_ENTRIES (10)', () => {
    // Add 12 entries — the first 2 should be evicted
    for (let i = 1; i <= 12; i++) {
      setCachedEntry(makeEntry(`host${i}`));
    }

    const all = getAllCachedEntries();
    const keys = Object.keys(all);
    expect(keys.length).toBeLessThanOrEqual(10);

    // The newest entries should still be present
    expect(all['host12|momence']).toBeTruthy();
    expect(all['host11|momence']).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Recent searches
// ═══════════════════════════════════════════════════════════════════════════════

describe('recent searches', () => {
  it('tracks recently set entries', () => {
    setCachedEntry(makeEntry('host1'));
    setCachedEntry(makeEntry('host2'));

    const recent = getRecentSearches();
    expect(recent).toHaveLength(2);
    // Most recent first
    expect(recent[0].hostId).toBe('host2');
    expect(recent[1].hostId).toBe('host1');
  });

  it('moves entry to front when re-set', () => {
    setCachedEntry(makeEntry('host1'));
    setCachedEntry(makeEntry('host2'));
    setCachedEntry(makeEntry('host1')); // re-set host1

    const recent = getRecentSearches();
    expect(recent[0].hostId).toBe('host1');
    expect(recent[1].hostId).toBe('host2');
  });

  it('removes entry from recent list', () => {
    setCachedEntry(makeEntry('host1'));
    setCachedEntry(makeEntry('host2'));

    removeFromRecent('host1|momence');

    const recent = getRecentSearches();
    expect(recent).toHaveLength(1);
    expect(recent[0].hostId).toBe('host2');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Error handling
// ═══════════════════════════════════════════════════════════════════════════════

describe('error handling', () => {
  it('returns empty cache when localStorage has corrupt data', () => {
    store['venue-cache'] = 'not valid json!!!';
    const entry = getCachedEntry('anything');
    expect(entry).toBeNull();
  });

  it('returns empty recent when localStorage has corrupt data', () => {
    store['venue-recent'] = 'not valid json!!!';
    const recent = getRecentSearches();
    expect(recent).toHaveLength(0);
  });

  it('does not crash when recent-list write hits QuotaExceededError', () => {
    // First, allow the cache write to succeed
    const originalSetItem = localStorageMock.setItem;
    let callCount = 0;
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      callCount++;
      // Let the cache write succeed, but throw on the recent-keys write
      if (key === 'venue-recent') {
        const err = new DOMException('quota exceeded', 'QuotaExceededError');
        throw err;
      }
      store[key] = value;
    });

    // Should not throw — the recent-list write failure is caught
    expect(() => setCachedEntry(makeEntry('host1'))).not.toThrow();

    // Cache entry should still be retrievable
    const entry = getCachedEntry('host1|momence');
    expect(entry).not.toBeNull();

    localStorageMock.setItem.mockImplementation(originalSetItem);
  });
});
