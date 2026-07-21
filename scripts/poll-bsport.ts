#!/usr/bin/env tsx
/**
 * Fetch all bsport venues and write cache files.
 *
 * bsport exposes full session history via its public offer endpoint, so this
 * is a complete refetch each run (no incremental merging needed). Run manually
 * or on a schedule to refresh booking counts.
 *
 * Run:  yarn poll:bsport
 *       npx tsx scripts/poll-bsport.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { BSPORT_CONFIG } from '../src/config/api';
import { fetchAllBsportSessions } from '../src/lib/bsportClient';
import type { CachedVenueEntry } from '../src/lib/venueCache';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');

async function pollVenue(hostId: string): Promise<number> {
  const cfg = BSPORT_CONFIG[hostId];
  if (!cfg) throw new Error(`No bsport config for hostId "${hostId}"`);

  console.log(`\n── ${cfg.name} (bsport/${hostId}) ──`);

  const now = new Date();
  const sessions = await fetchAllBsportSessions(cfg, new Date(cfg.operatingSince), now);

  const dateRange =
    sessions.length > 0
      ? {
          from: sessions.reduce((min, s) => (s.startsAt < min ? s.startsAt : min), sessions[0].startsAt),
          to: sessions.reduce((max, s) => (s.startsAt > max ? s.startsAt : max), sessions[0].startsAt),
        }
      : { from: now.toISOString(), to: now.toISOString() };

  const entry: CachedVenueEntry = {
    key: `${hostId}|bsport`,
    hostId,
    platform: 'bsport',
    venueName: cfg.name,
    dateRange,
    cachedAt: now.toISOString(),
    sessions,
    metrics: null,
    monthlyData: [],
    venueConfig: null,
    hostInfo: null,
  };

  fs.mkdirSync(VENUES_DIR, { recursive: true });
  const filePath = path.join(VENUES_DIR, `${hostId}-bsport.json`);
  fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  console.log(`  Written to ${path.relative(process.cwd(), filePath)}`);
  return sessions.length;
}

async function main() {
  const venueIds = Object.keys(BSPORT_CONFIG);
  console.log(`=== Polling ${venueIds.length} bsport venue(s) at ${new Date().toISOString()} ===`);

  let ok = 0;
  let failed = 0;

  for (const hostId of venueIds) {
    try {
      const count = await pollVenue(hostId);
      console.log(`  Done: ${count} total sessions`);
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
