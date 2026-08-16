#!/usr/bin/env tsx
/**
 * Poll all Punchpass venues and merge fresh data into cached files.
 *
 * Punchpass hides its "N spots left" badge the moment a session starts, so the
 * last read before a session begins is the only chance to capture its real
 * utilisation. That makes polling cadence load-bearing here in a way it is not
 * for other platforms: a session that starts between two polls is recorded as
 * unknown forever. Run this at least every 30 minutes.
 *
 * Run:  yarn poll:punchpass
 *       npx tsx scripts/poll-punchpass.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { PUNCHPASS_CONFIG } from '../src/config/api';
import { fetchAllPunchpassSessions, type PersistedOracle } from '../src/lib/punchpassClient';
import type { CachedVenueEntry } from '../src/lib/venueCache';
import type { MomenceSession } from '../src/types/momence';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');

/** Pass --deep to force the far-future oracle probes and back-history pass. */
const FORCE_DEEP = process.argv.includes('--deep');

async function pollVenue(hostId: string): Promise<{ total: number; known: number }> {
  const cfg = PUNCHPASS_CONFIG[hostId];
  if (!cfg) throw new Error(`No Punchpass config for hostId "${hostId}"`);

  console.log(`\n── ${cfg.name} (punchpass/${hostId}) ──`);

  const filePath = path.join(VENUES_DIR, `${hostId}-punchpass.json`);
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

  // The capacity oracle lives in its own file. It is the denominator of every
  // utilisation figure this venue produces and it is derived rather than
  // published, so it is kept where a human can read and sanity-check it.
  const oraclePath = path.join(VENUES_DIR, `${hostId}-punchpass-oracle.json`);
  let cachedOracle: PersistedOracle | null = null;
  if (fs.existsSync(oraclePath)) {
    try {
      cachedOracle = JSON.parse(fs.readFileSync(oraclePath, 'utf-8')) as PersistedOracle;
      console.log(`  Loaded oracle: ${Object.keys(cachedOracle.capacities).length} courses, refreshed ${cachedOracle.refreshedAt}`);
    } catch {
      console.warn('  Warning: could not parse cached oracle — will re-probe');
    }
  }

  const merged = await fetchAllPunchpassSessions(cfg, existingSessions, {
    cachedOracle,
    forceDeepRefresh: FORCE_DEEP,
    onOracle: (oracle) => {
      fs.mkdirSync(VENUES_DIR, { recursive: true });
      fs.writeFileSync(oraclePath, JSON.stringify(oracle, null, 2), 'utf-8');
      console.log(`  Oracle written to ${path.relative(process.cwd(), oraclePath)}`);
    },
  });

  // Guard against writing a regression over good data. The client already
  // throws on an empty oracle; this catches a partial scrape (site redesign,
  // rate limit) before it overwrites months of accumulated history.
  if (existingSessions.length > 0 && merged.length < existingSessions.length) {
    throw new Error(
      `Refusing to write: merged ${merged.length} sessions is fewer than the ` +
      `${existingSessions.length} already cached — likely a partial scrape`,
    );
  }

  const dateRange =
    merged.length > 0
      ? {
          from: merged.reduce((min, s) => (s.startsAt < min ? s.startsAt : min), merged[0].startsAt),
          to: merged.reduce((max, s) => (s.startsAt > max ? s.startsAt : max), merged[0].startsAt),
        }
      : { from: new Date().toISOString(), to: new Date().toISOString() };

  const entry: CachedVenueEntry = {
    key: `${hostId}|punchpass`,
    hostId,
    platform: 'punchpass',
    venueName: cfg.name,
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
  const venueIds = Object.keys(PUNCHPASS_CONFIG);
  console.log(`=== Polling ${venueIds.length} Punchpass venue(s) at ${new Date().toISOString()} ===`);
  console.log(`Venues: ${venueIds.join(', ')}`);

  let ok = 0;
  let failed = 0;

  for (const hostId of venueIds) {
    try {
      const { total, known } = await pollVenue(hostId);
      console.log(`  Done: ${total} total sessions (${known} with observed utilisation)`);
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
