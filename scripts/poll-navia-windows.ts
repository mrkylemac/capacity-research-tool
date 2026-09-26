#!/usr/bin/env tsx
/**
 * Poll Navia's windows endpoint, keep every reading, and rebuild the sittings
 * the report reads from it.
 *
 * Writes two things and deletes nothing:
 *   navia-windows-ledger-YYYY-MM.json  every window as fetched, one file a month
 *   navia-navia-windows.json           sittings built from those windows
 *
 * The slot feed cache (navia-navia.json) and its entry ledger are read here but
 * never written; `yarn poll:navia` still maintains them.
 *
 * Run:  yarn poll:navia-windows              yesterday, today and the hot days ahead
 *       yarn poll:navia-windows --deep       a week back instead of a day
 *       yarn poll:navia-windows --backfill   every day since each location opened
 *       yarn poll:navia-windows --seed-feed-history
 *           also recover what was on sale before each entry started from every
 *           committed revision of the slot feed's entry ledger
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { NAVIA_CONFIG } from '../src/config/api';
import { resolveLocation, type PersistedNaviaLedger } from '../src/lib/naviaClient';
import {
  WINDOWS_LEDGER_PREFIX,
  buildWindowSittings,
  combineLedgers,
  fetchWindowsDay,
  mergeFeedObservations,
  mergeWindowsDay,
  serialiseLedger,
  splitLedgerByMonth,
  type PersistedNaviaWindows,
} from '../src/lib/naviaWindows';
import { addLocalDays, localDateKey } from '../src/lib/tz';
import type { CachedVenueEntry } from '../src/lib/venueCache';
import type { MomenceSession } from '../src/types/momence';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');
const FEED_FILE = path.join(VENUES_DIR, 'navia-navia.json');
const FEED_LEDGER = 'src/data/venues/navia-navia-ledger.json';
const OUT_FILE = path.join(VENUES_DIR, 'navia-navia-windows.json');

const DEEP = process.argv.includes('--deep');
const BACKFILL = process.argv.includes('--backfill');
const SEED = process.argv.includes('--seed-feed-history');

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function loadLedger(): PersistedNaviaWindows {
  const parts = fs.readdirSync(VENUES_DIR)
    .filter(f => f.startsWith(WINDOWS_LEDGER_PREFIX) && f.endsWith('.json'))
    .map(f => {
      const parsed = readJson<PersistedNaviaWindows>(path.join(VENUES_DIR, f));
      // A month that will not parse must stop the run: carrying on would write
      // that month back out with only this poll's windows in it.
      if (!parsed?.windows) throw new Error(`Refusing to run: ${f} did not parse`);
      return parsed;
    });
  return combineLedgers(parts);
}

/** Every committed revision of the slot feed's entry ledger, oldest first. */
function* feedLedgerHistory(): Generator<PersistedNaviaLedger> {
  const shas = execFileSync('git', ['log', '--reverse', '--format=%H', '--', FEED_LEDGER], { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);
  console.log(`  Reading ${shas.length} revisions of the entry ledger`);
  for (const sha of shas) {
    try {
      const raw = execFileSync('git', ['show', `${sha}:${FEED_LEDGER}`], {
        encoding: 'utf-8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      yield JSON.parse(raw) as PersistedNaviaLedger;
    } catch {
      // A revision that will not parse (the conflict-marker incidents) holds
      // nothing the neighbouring revisions do not.
    }
  }
}

function foldFeedLedger(ledger: PersistedNaviaWindows, feed: PersistedNaviaLedger | null): PersistedNaviaWindows {
  return feed?.entries ? mergeFeedObservations(ledger, Object.values(feed.entries)) : ledger;
}

async function main() {
  const cfg = NAVIA_CONFIG;
  const now = new Date();
  console.log(`=== Navia windows at ${now.toISOString()}${BACKFILL ? ' (backfill)' : DEEP ? ' (deep)' : ''} ===`);

  let ledger = loadLedger();
  const before = Object.keys(ledger.windows).length;
  console.log(`  Loaded ${before} windows`);

  let requests = 0;
  for (const location of cfg.locations) {
    const loc = resolveLocation(cfg, location);
    const today = localDateKey(now, loc.timezone);
    const first = BACKFILL
      ? loc.operatingSince
      : addLocalDays(today, -(DEEP ? cfg.windowsDeepSettleDays : cfg.windowsSettleDays));
    const last = addLocalDays(today, cfg.hotDays - 1);

    let fetched = 0;
    for (let d = first; d <= last; d = addLocalDays(d, 1)) {
      const windows = await fetchWindowsDay(loc, d);
      ledger = mergeWindowsDay(ledger, loc, d, windows, now);
      fetched += windows.length;
      requests += 1;
      if (BACKFILL) await sleep(150);
    }
    console.log(`  ${loc.name}: ${first} to ${last}, ${fetched} windows`);
  }

  // What was on sale before start. The current entry ledger every run; its
  // whole git history when seeding.
  if (SEED) {
    for (const rev of feedLedgerHistory()) ledger = foldFeedLedger(ledger, rev);
  }
  ledger = foldFeedLedger(ledger, readJson<PersistedNaviaLedger>(path.join(process.cwd(), FEED_LEDGER)));

  const after = Object.keys(ledger.windows).length;
  if (after < before) {
    throw new Error(`Refusing to write: the ledger shrank from ${before} to ${after} windows`);
  }

  let written = 0;
  for (const [month, part] of splitLedgerByMonth(ledger)) {
    const file = path.join(VENUES_DIR, `${WINDOWS_LEDGER_PREFIX}${month}.json`);
    const body = serialiseLedger(part);
    const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : null;
    // Only the windows, not the timestamp, decide whether a month changed, so
    // a finished month is not rewritten every poll just to bump refreshedAt.
    if (existing && JSON.stringify(JSON.parse(existing).windows) === JSON.stringify(part.windows)) continue;
    fs.writeFileSync(file, body, 'utf-8');
    written += 1;
  }
  console.log(`  Ledger: ${after} windows (${after - before >= 0 ? '+' : ''}${after - before}), ${written} month file(s) written, ${requests} requests`);

  const feedSessions = readJson<CachedVenueEntry>(FEED_FILE)?.sessions ?? [];
  const previous = readJson<CachedVenueEntry>(OUT_FILE)?.sessions ?? [];

  const sessions: MomenceSession[] = [];
  for (const location of cfg.locations) {
    const loc = resolveLocation(cfg, location);
    const built = buildWindowSittings(ledger, loc, feedSessions, previous, now);
    sessions.push(...built);

    const past = built.filter(s => Date.parse(s.startsAt) < now.getTime() && !s.isCancelled);
    const sold = past.reduce((n, s) => n + s.ticketsSold, 0);
    const pastFeed = feedSessions.filter(s => s.location === loc.name && Date.parse(s.startsAt) < now.getTime());
    const feedSold = pastFeed.reduce((n, s) => n + s.ticketsSold, 0);
    const superseded = past.filter(s => s.supersededSold);
    const unconfirmed = past.filter(s => s.capacityNotes?.length);
    console.log(
      `  ${loc.name}: ${past.length} past sittings, ${sold} bookings (slot feed cache: ${feedSold}), ` +
      `${superseded.length} with a superseded count (${superseded.reduce((n, s) => n + s.supersededSold!.ticketsSold - s.ticketsSold, 0)}), ` +
      `${unconfirmed.length} with a capacity note`,
    );
  }
  sessions.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const ids = new Set(sessions.map(s => s.id));
  const lost = previous.filter(s => Date.parse(s.startsAt) < now.getTime() && !ids.has(s.id));
  if (lost.length > 0) {
    throw new Error(`Refusing to write: ${lost.length} past sitting(s) would be dropped`);
  }

  const entry: CachedVenueEntry = {
    key: 'navia|navia',
    hostId: 'navia',
    platform: 'navia',
    venueName: cfg.name,
    dateRange: sessions.length
      ? { from: sessions[0].startsAt, to: sessions[sessions.length - 1].startsAt }
      : { from: now.toISOString(), to: now.toISOString() },
    cachedAt: now.toISOString(),
    sessions,
    metrics: null,
    monthlyData: [],
    venueConfig: null,
    hostInfo: null,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(entry, null, 2), 'utf-8');
  console.log(`  Written ${path.relative(process.cwd(), OUT_FILE)}: ${sessions.length} sittings`);
}

main().catch(err => {
  console.error(`  Failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
