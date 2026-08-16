#!/usr/bin/env tsx
/**
 * Derive the polling window every future-only venue actually needs, from the
 * cached session data rather than from config comments.
 *
 * Only the future-only platforms appear here. Momence, Glofox, MarianaTek,
 * bsport, Portal, Xtra and Hapana all expose full history and are fetched on
 * demand, so nothing is lost by never polling them on a schedule.
 *
 * Every polled venue runs on GitHub Actions. Pass a platform to narrow the
 * output when tuning one venue's gate window:
 *
 *   yarn venue:schedule navia
 *
 * With no argument every polled venue is listed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { VENUES } from '../src/config/api';
import type { CachedVenueEntry } from '../src/lib/venueCache';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');

/** Platforms whose sessions vanish, so a missed poll is permanent data loss. */
const POLLED = new Set(['acuity', 'trybe', 'punchpass', 'navia']);

/** The machine running the poller. Every polled venue is AEST/AEDT already. */
const HOST_TZ = 'Australia/Melbourne';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Optional platform filter, e.g. `yarn venue:schedule navia`. */
const ONLY = process.argv[2]?.toLowerCase();



/** Minutes past midnight, and weekday, of an instant in a given zone. */
function localParts(iso: string, timeZone: string): { day: number; minutes: number } | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const day = DAYS.indexOf(get('weekday'));
  const minutes = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
  return day < 0 ? null : { day, minutes };
}

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

interface VenueWindow {
  label: string;
  perDay: Map<number, { first: number; last: number; count: number }>;
  first: number;
  last: number;
  sessions: number;
}

function scan(hostId: string, platform: string, label: string): VenueWindow | null {
  const file = path.join(VENUES_DIR, `${hostId}-${platform}.json`);
  if (!fs.existsSync(file)) return null;

  let entry: CachedVenueEntry;
  try {
    entry = JSON.parse(fs.readFileSync(file, 'utf-8')) as CachedVenueEntry;
  } catch {
    console.warn(`  ! could not parse ${path.basename(file)}`);
    return null;
  }

  // Look at a recent slice only. A venue that changed its timetable a year ago
  // should not widen today's wake window.
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const sessions = (entry.sessions ?? []).filter(s => new Date(s.startsAt).getTime() >= cutoff);
  if (sessions.length === 0) return null;

  const perDay = new Map<number, { first: number; last: number; count: number }>();
  let first = Infinity;
  let last = -Infinity;

  for (const s of sessions) {
    const p = localParts(s.startsAt, HOST_TZ);
    if (!p) continue;
    const cur = perDay.get(p.day) ?? { first: Infinity, last: -Infinity, count: 0 };
    cur.first = Math.min(cur.first, p.minutes);
    cur.last = Math.max(cur.last, p.minutes);
    cur.count++;
    perDay.set(p.day, cur);
    first = Math.min(first, p.minutes);
    last = Math.max(last, p.minutes);
  }

  return { label, perDay, first, last, sessions: sessions.length };
}

function main() {
  console.log(`=== Polling windows, ${HOST_TZ} local time ===`);
  console.log('Derived from cached sessions in the last 90 days.\n');

  const windows: VenueWindow[] = [];

  for (const v of VENUES) {
    if (!POLLED.has(v.platform)) continue;
    if (ONLY && v.platform !== ONLY) continue;
    const w = scan(v.id, v.platform, `${v.name}${v.location ? ` · ${v.location}` : ''}`);
    if (!w) {
      console.log(`${v.id.padEnd(16)} (${v.platform}) — no cached sessions yet, skipped`);
      continue;
    }
    windows.push(w);

    console.log(`${w.label}  [${v.platform}]  ${w.sessions} sessions`);
    console.log(`  overall  ${hhmm(w.first)} – ${hhmm(w.last)}`);
    for (let d = 1; d <= 7; d++) {
      const day = d % 7;
      const e = w.perDay.get(day);
      if (e) console.log(`    ${DAYS[day]}  ${hhmm(e.first)} – ${hhmm(e.last)}   (${e.count} sessions)`);
    }
    console.log();
  }

  if (windows.length === 0) {
    console.log('No cached data for any polled venue.');
    return;
  }

  // Poll before a session starts, not after: every one of these platforms drops
  // or freezes a session's booking count the moment it begins.
  const LEAD_MINUTES = 35;
  const earliest = Math.min(...windows.map(w => w.first)) - LEAD_MINUTES;
  const latest = Math.max(...windows.map(w => w.last));

  console.log('─'.repeat(60));
  console.log('CONSOLIDATED WAKE WINDOW');
  console.log('─'.repeat(60));
  console.log(`  Sessions run        ${hhmm(Math.min(...windows.map(w => w.first)))} – ${hhmm(latest)}`);
  console.log(`  Poll lead time      ${LEAD_MINUTES} min (read before a session starts)`);
  console.log(`  Awake from          ${hhmm(Math.max(0, earliest))}`);
  console.log(`  Awake until         ${hhmm(latest)}`);
  console.log();

  console.log(`  Gate window: ${hhmm(Math.max(0, earliest))} – ${hhmm(latest)} local.`);
  console.log('  Deep refreshes run overnight while the venues are closed.');
}

main();
