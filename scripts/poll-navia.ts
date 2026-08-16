#!/usr/bin/env tsx
/**
 * Poll all Navia Bathhouse venues and merge fresh data into cached files.
 *
 * Navia slots vanish the instant they start and past dates return an empty
 * array, so the last read before a slot begins is the only record that will
 * ever exist. Byron's entries expire every 15 minutes rather than every 30,
 * which makes cadence load-bearing here: a slot that starts between two polls
 * loses any booking taken since the previous poll, permanently.
 *
 * Run:  yarn poll:navia
 *       yarn poll:navia --deep     # walk the full forward horizon
 *       npx tsx scripts/poll-navia.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { NAVIA_CONFIG } from '../src/config/api';
import { fetchAllNaviaSessions, type PersistedNaviaLedger } from '../src/lib/naviaClient';
import type { CachedVenueEntry } from '../src/lib/venueCache';
import type { MomenceSession } from '../src/types/momence';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');

/** Pass --deep to walk the full forward horizon instead of the hot window. */
const FORCE_DEEP = process.argv.includes('--deep');

async function pollVenue(hostId: string): Promise<{ total: number; known: number }> {
  const cfg = NAVIA_CONFIG[hostId];
  if (!cfg) throw new Error(`No Navia config for hostId "${hostId}"`);

  console.log(`\n── ${cfg.name} ${cfg.location} (navia/${hostId}) ──`);

  const filePath = path.join(VENUES_DIR, `${hostId}-navia.json`);
  let existingSessions: MomenceSession[] = [];

  if (fs.existsSync(filePath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CachedVenueEntry;
      existingSessions = existing.sessions ?? [];
      console.log(`  Loaded ${existingSessions.length} cached sessions`);
    } catch {
      console.warn('  Warning: could not parse existing cache — starting fresh');
    }
  } else {
    console.log('  No existing cache — first poll');
  }

  // The entry ledger holds the last pre-start reading of every entry. Sittings
  // are assembled from four entries that expire individually, so without it a
  // mid-block poll could never rebuild a complete sitting.
  const ledgerPath = path.join(VENUES_DIR, `${hostId}-navia-ledger.json`);
  let cachedLedger: PersistedNaviaLedger | null = null;
  if (fs.existsSync(ledgerPath)) {
    try {
      cachedLedger = JSON.parse(fs.readFileSync(ledgerPath, 'utf-8')) as PersistedNaviaLedger;
      console.log(`  Loaded ledger: ${Object.keys(cachedLedger.entries).length} entries, refreshed ${cachedLedger.refreshedAt}`);
    } catch {
      console.warn('  Warning: could not parse cached ledger — rebuilding from this poll');
    }
  }

  const merged = await fetchAllNaviaSessions(cfg, existingSessions, {
    cachedLedger,
    forceDeepRefresh: FORCE_DEEP,
    onLedger: (ledger) => {
      fs.mkdirSync(VENUES_DIR, { recursive: true });
      fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf-8');
      console.log(`  Ledger written: ${Object.keys(ledger.entries).length} entries`);
    },
  });

  // Guard on history, not on the raw count. Navia legitimately drops future
  // sittings between polls — Byron closes for a week from 2026-08-31, and a
  // timetable change removes slots — so a shrinking total is normal. What must
  // never happen is a sitting that has already run disappearing, because its
  // entries are gone from the feed and cannot be re-fetched.
  const nowMs = Date.now();
  const mergedIds = new Set(merged.map(s => s.id));
  const lostPast = existingSessions.filter(
    s => new Date(s.startsAt).getTime() < nowMs && !mergedIds.has(s.id),
  );
  if (lostPast.length > 0) {
    const bookings = lostPast.reduce((n, s) => n + (s.ticketsSold ?? 0), 0);
    throw new Error(
      `Refusing to write: ${lostPast.length} past sitting(s) carrying ${bookings} ` +
      `booking(s) would be dropped — that history cannot be re-fetched`,
    );
  }

  // If nothing in a utilisation-eligible venue survived validation, the grid
  // has changed shape and the block model no longer describes it. Better to
  // fail loudly than to publish a venue that has silently gone schedule-only.
  if (cfg.utilisationEligible && merged.length > 0) {
    const known = merged.filter(s => s.utilisationKnown !== false).length;
    if (known === 0) {
      throw new Error(
        'Refusing to write: every sitting failed validation — the entry grid has ' +
        'likely changed shape and the block model needs revisiting',
      );
    }
  }

  const dateRange =
    merged.length > 0
      ? {
          from: merged.reduce((min, s) => (s.startsAt < min ? s.startsAt : min), merged[0].startsAt),
          to: merged.reduce((max, s) => (s.startsAt > max ? s.startsAt : max), merged[0].startsAt),
        }
      : { from: new Date().toISOString(), to: new Date().toISOString() };

  const entry: CachedVenueEntry = {
    key: `${hostId}|navia`,
    hostId,
    platform: 'navia',
    venueName: `${cfg.name} ${cfg.location}`,
    dateRange,
    cachedAt: new Date().toISOString(),
    sessions: merged,
    metrics: null,
    monthlyData: [],
    venueConfig: null,
    hostInfo: null,
  };

  fs.mkdirSync(VENUES_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  console.log(`  Written to ${path.relative(process.cwd(), filePath)}`);

  const known = merged.filter(s => s.utilisationKnown !== false).length;
  return { total: merged.length, known };
}

async function main() {
  const venueIds = Object.keys(NAVIA_CONFIG);
  console.log(`=== Polling ${venueIds.length} Navia venue(s) at ${new Date().toISOString()} ===`);
  console.log(`Venues: ${venueIds.join(', ')}${FORCE_DEEP ? ' (deep refresh)' : ''}`);

  let ok = 0;
  let failed = 0;

  for (const hostId of venueIds) {
    try {
      const { total, known } = await pollVenue(hostId);
      console.log(`  Done: ${total} total sessions (${known} with a usable denominator)`);
      ok++;
    } catch (err) {
      console.error(`  Failed: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\n=== Done: ${ok} succeeded, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
