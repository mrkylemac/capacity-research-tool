#!/usr/bin/env tsx
/**
 * Poll all Acuity Scheduling venues and merge fresh data into cached files.
 *
 * Acuity's public API only exposes future sessions — past sessions disappear
 * once they've started. This script runs on a schedule (e.g. daily cron) to
 * capture session data before it ages out, building a permanent history.
 *
 * All venues in ACUITY_CONFIG are polled automatically — to add a new venue,
 * just add its config entry to src/config/api.ts.
 *
 * Run:  yarn poll:acuity
 *       npx tsx scripts/poll-acuity.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { ACUITY_CONFIG } from '../src/config/api';
import { fetchAllAcuitySessions } from '../src/lib/acuityClient';
import type { CachedVenueEntry } from '../src/lib/venueCache';
import type { MomenceSession } from '../src/types/momence';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');

async function pollVenue(hostId: string): Promise<number> {
  const cfg = ACUITY_CONFIG[hostId];
  if (!cfg) throw new Error(`No Acuity config for hostId "${hostId}"`);

  console.log(`\n── ${cfg.name} (acuity/${hostId}) ──`);

  // Load existing cached sessions
  const filePath = path.join(VENUES_DIR, `${hostId}-acuity.json`);
  let existingSessions: MomenceSession[] = [];

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const existing = JSON.parse(raw) as CachedVenueEntry;
      existingSessions = existing.sessions ?? [];
      console.log(`  Loaded ${existingSessions.length} cached sessions`);
    } catch {
      console.warn('  Warning: could not parse existing cache — starting fresh');
    }
  } else {
    console.log('  No existing cache — first poll');
  }

  // Fetch fresh future sessions and merge with cached past
  const merged = await fetchAllAcuitySessions(cfg, existingSessions);

  const dateRange =
    merged.length > 0
      ? {
          from: merged.reduce((min, s) => (s.startsAt < min ? s.startsAt : min), merged[0].startsAt),
          to: merged.reduce((max, s) => (s.startsAt > max ? s.startsAt : max), merged[0].startsAt),
        }
      : { from: new Date().toISOString(), to: new Date().toISOString() };

  const entry: CachedVenueEntry = {
    key: `${hostId}|acuity`,
    hostId,
    platform: 'acuity',
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
  return merged.length;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const venueIds = Object.keys(ACUITY_CONFIG);
  console.log(`=== Polling ${venueIds.length} Acuity venue(s) at ${new Date().toISOString()} ===`);
  console.log(`Venues: ${venueIds.join(', ')}`);

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
