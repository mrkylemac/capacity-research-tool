#!/usr/bin/env tsx
/**
 * Poll all TryBe venues and merge fresh data into cached files.
 *
 * TryBe's public API only exposes future sessions — past sessions disappear
 * once they've started. This script runs on a schedule (e.g. daily cron) to
 * capture session data before it ages out, building a permanent history.
 *
 * Run:  yarn poll:trybe
 *       npx tsx scripts/poll-trybe.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { TRYBE_CONFIG } from '../src/config/api';
import type { CachedVenueEntry } from '../src/lib/venueCache';
import type { MomenceSession } from '../src/types/momence';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');

// ── TryBe API types ───────────────────────────────────────────────────────────

interface TBSession {
  id: string;
  room: { id: string; name: string; capacity: number };
  start_time: string;
  end_time: string;
  duration: number;
  capacity: number;
  remaining_capacity: number;
  price: number;
  is_valid: boolean;
}

interface TBResponse {
  data: TBSession[];
}

async function fetchOfferingSessions(
  venueId: string,
  offeringId: string,
  offeringName: string,
  from: Date,
  to: Date,
): Promise<MomenceSession[]> {
  const fromStr = encodeURIComponent(from.toISOString().slice(0, 19) + '+00:00');
  const toStr = encodeURIComponent(to.toISOString().slice(0, 19) + '+00:00');
  const url = `https://api.try.be/shop/item-availability/sessions/${venueId}/${offeringId}?date_time_from=${fromStr}&date_time_to=${toStr}`;

  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`TryBe API: ${res.status} ${res.statusText}`);
  const data: TBResponse = await res.json();

  return (data.data ?? []).map(s => ({
    id: s.id,
    sessionName: offeringName,
    startsAt: s.start_time,
    endsAt: s.end_time,
    durationMinutes: s.duration,
    capacity: s.capacity,
    ticketsSold: Math.max(0, s.capacity - s.remaining_capacity),
    fixedTicketPrice: s.price / 100,
    location: s.room.name,
    inPerson: true,
  }));
}

// ── Poll a single TryBe venue ─────────────────────────────────────────────────

async function pollVenue(hostId: string): Promise<number> {
  // Currently only Sense of Self — extend as needed
  const cfgMap: Record<string, typeof TRYBE_CONFIG.senseOfSelf> = {
    senseofself: TRYBE_CONFIG.senseOfSelf,
  };
  const cfg = cfgMap[hostId];
  if (!cfg) throw new Error(`No TryBe config for hostId "${hostId}"`);

  console.log(`\n── ${cfg.name} (trybe/${hostId}) ──`);

  // Load existing cached sessions
  const filePath = path.join(VENUES_DIR, `${hostId}-trybe.json`);
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

  // Fetch fresh future sessions
  const now = new Date();
  const fetchTo = new Date();
  fetchTo.setDate(fetchTo.getDate() + 90);

  const fresh: MomenceSession[] = [];
  const freshIds = new Set<string>();

  for (const offering of cfg.offerings) {
    const sessions = await fetchOfferingSessions(cfg.venueId, offering.id, offering.name, now, fetchTo);
    console.log(`  Offering "${offering.name}": ${sessions.length} upcoming sessions`);
    for (const s of sessions) {
      if (!freshIds.has(s.id)) {
        freshIds.add(s.id);
        fresh.push(s);
      }
    }
  }

  // Preserve cached past sessions (TryBe removes them from the API once started)
  const past = existingSessions.filter(s => new Date(s.startsAt) < now && !freshIds.has(s.id));
  console.log(`  Retaining ${past.length} cached past sessions`);

  const merged = [...past, ...fresh].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const dateRange =
    merged.length > 0
      ? {
          from: merged.reduce((min, s) => (s.startsAt < min ? s.startsAt : min), merged[0].startsAt),
          to: merged.reduce((max, s) => (s.startsAt > max ? s.startsAt : max), merged[0].startsAt),
        }
      : { from: now.toISOString(), to: now.toISOString() };

  const entry: CachedVenueEntry = {
    key: `${hostId}|trybe`,
    hostId,
    platform: 'trybe',
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const venueIds = ['senseofself']; // Add more TryBe venues here as needed
  console.log(`=== Polling ${venueIds.length} TryBe venue(s) at ${new Date().toISOString()} ===`);

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
