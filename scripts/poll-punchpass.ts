#!/usr/bin/env tsx
/**
 * Poll all Punchpass venues and merge fresh data into cached files.
 *
 * Punchpass exposes future sessions only — once a session has started its page
 * stops advertising availability, so past bookings can't be read back. This
 * script runs on a schedule to capture the booking snapshot before each session
 * ages out, building a permanent history. Seat capacity isn't published, so it's
 * inferred from the maximum remaining-spots advertised per class (see
 * punchpassClient.ts).
 *
 * Run:  yarn poll:punchpass
 *       npx tsx scripts/poll-punchpass.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { PUNCHPASS_CONFIG } from '../src/config/api';
import { fetchAllPunchpassSessions } from '../src/lib/punchpassClient';
import type { CachedVenueEntry } from '../src/lib/venueCache';
import type { MomenceSession } from '../src/types/momence';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');

async function pollVenue(hostId: string): Promise<number> {
  const cfg = PUNCHPASS_CONFIG[hostId];
  if (!cfg) throw new Error(`No Punchpass config for hostId "${hostId}"`);

  console.log(`\n── ${cfg.name} (punchpass/${hostId}) ──`);

  const filePath = path.join(VENUES_DIR, `${hostId}-punchpass.json`);
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

  const now = new Date();
  const merged = await fetchAllPunchpassSessions(cfg, cfg.fetchWindowDays, existingSessions);

  const freshCount = merged.filter(s => new Date(s.startsAt) >= now).length;
  console.log(`  ${freshCount} upcoming, ${merged.length - freshCount} past (retained)`);

  const dateRange =
    merged.length > 0
      ? {
          from: merged.reduce((min, s) => (s.startsAt < min ? s.startsAt : min), merged[0].startsAt),
          to: merged.reduce((max, s) => (s.startsAt > max ? s.startsAt : max), merged[0].startsAt),
        }
      : { from: now.toISOString(), to: now.toISOString() };

  const entry: CachedVenueEntry = {
    key: `${hostId}|punchpass`,
    hostId,
    platform: 'punchpass',
    venueName: cfg.name,
    dateRange,
    cachedAt: now.toISOString(),
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

async function main() {
  const venueIds = Object.keys(PUNCHPASS_CONFIG);
  console.log(`=== Polling ${venueIds.length} Punchpass venue(s) at ${new Date().toISOString()} ===`);

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
