#!/usr/bin/env tsx
/**
 * Refuse to publish a venue cache that has lost history.
 *
 * The future-only platforms cannot re-fetch the past: once a session starts, its
 * booking count is gone from the feed forever and the cache is the only copy.
 * So a past session disappearing between polls is unrecoverable, while a future
 * one disappearing is just the venue changing its timetable.
 *
 * A plain "did the session count shrink" check is the obvious guard and it is
 * wrong — Sense of Self routinely drops a few dozen future slots in a single
 * poll, which would trip it on a perfectly healthy run. This compares only
 * sessions that have already started.
 *
 * Run:  yarn verify:cache            (compares the working tree to origin/main)
 * Exits non-zero if any file lost history.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { CachedVenueEntry } from '../src/lib/venueCache';
import type { MomenceSession } from '../src/types/momence';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');
const BASE = process.argv[2] ?? 'origin/main';

function sessionsAt(ref: string, file: string): MomenceSession[] | null {
  try {
    const raw = execFileSync('git', ['show', `${ref}:src/data/venues/${file}`], {
      encoding: 'utf-8',
      maxBuffer: 256 * 1024 * 1024,
      // A file absent from the base ref is the normal new-venue case, and git
      // reports it on stderr. Swallow it so a first poll does not look broken.
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return (JSON.parse(raw) as CachedVenueEntry).sessions ?? [];
  } catch {
    return null; // new file, or not present in the base ref
  }
}

function main() {
  const now = Date.now();
  const files = fs.readdirSync(VENUES_DIR)
    .filter(f => f.endsWith('.json') && !f.includes('-ledger') && !f.includes('-oracle'));

  let failed = 0;
  let checked = 0;

  for (const file of files) {
    const before = sessionsAt(BASE, file);
    if (before === null) {
      console.log(`  ${file.padEnd(34)} new file, nothing to compare`);
      continue;
    }

    let after: MomenceSession[];
    try {
      after = (JSON.parse(fs.readFileSync(path.join(VENUES_DIR, file), 'utf-8')) as CachedVenueEntry).sessions ?? [];
    } catch {
      console.error(`  ${file.padEnd(34)} UNREADABLE`);
      failed++;
      continue;
    }

    const ids = new Set(after.map(s => s.id));
    const lostPast = before.filter(s => new Date(s.startsAt).getTime() < now && !ids.has(s.id));
    const lostFuture = before.filter(s => new Date(s.startsAt).getTime() >= now && !ids.has(s.id));
    checked++;

    if (lostPast.length > 0) {
      const bookings = lostPast.reduce((n, s) => n + (s.ticketsSold ?? 0), 0);
      console.error(
        `  ${file.padEnd(34)} LOST ${lostPast.length} past session(s), ${bookings} bookings — REFUSING`,
      );
      for (const s of lostPast.slice(0, 5)) {
        console.error(`      ${s.startsAt}  cap=${s.capacity} sold=${s.ticketsSold}`);
      }
      failed++;
    } else {
      const churn = lostFuture.length > 0 ? `, ${lostFuture.length} future slot(s) dropped (schedule churn)` : '';
      console.log(`  ${file.padEnd(34)} ok — ${after.length} sessions${churn}`);
    }
  }

  console.log(`\nChecked ${checked} cache file(s) against ${BASE}.`);
  if (failed > 0) {
    console.error(`FAILED: ${failed} file(s) would lose history. Not safe to publish.`);
    process.exit(1);
  }
  console.log('All good — no history lost.');
}

main();
