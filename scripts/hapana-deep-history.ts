#!/usr/bin/env tsx
/**
 * Probe Hapana API with month-by-month chunks going back as far as possible.
 *
 * The public widget API says "~3 months back" but this isn't enforced server-side —
 * it just returns empty pages if no data exists. We walk back month-by-month from
 * today to a configured START_DATE, fetching each chunk independently, then merge
 * everything into the existing cache.
 *
 * Run:  npx tsx scripts/hapana-deep-history.ts
 *       npx tsx scripts/hapana-deep-history.ts --dry-run   (print summary only)
 *       npx tsx scripts/hapana-deep-history.ts --start 2024-01-01
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HAPANA_CONFIG } from '../src/config/api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import type { HapanaLocation } from '../src/config/api';
import type { MomenceSession } from '../src/types/momence';
import type { CachedVenueEntry } from '../src/lib/venueCache';

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const startFlagIdx = args.indexOf('--start');
const startArg = args.find(a => a.startsWith('--start='))?.split('=')[1]
  ?? (startFlagIdx !== -1 ? args[startFlagIdx + 1] : undefined);

// How far back to try. Defaults to earliest `operatingSince` across all locations,
// or 2024-01-01 if not parseable.
const earliestOperating = HAPANA_CONFIG.locations
  .map(l => new Date(l.operatingSince))
  .filter(d => !isNaN(d.getTime()))
  .sort((a, b) => a.getTime() - b.getTime())[0];

const START_DATE = startArg
  ? new Date(startArg)
  : (earliestOperating ?? new Date('2024-01-01'));

// ── Paths ─────────────────────────────────────────────────────────────────────

const CACHE_FILE = path.resolve(__dirname, '../src/data/venues/alchemysaunas-hapana.json');

// ── API constants (mirrors hapanaClient.ts) ───────────────────────────────────

const SETTINGS_URL = 'https://widgetapi.hapana.com/v2/wAPI/site/settings';
const PAGE_SIZE = 100;

// ── Helpers ───────────────────────────────────────────────────────────────────

function addMonths(d: Date, n: number): Date {
  const result = new Date(d);
  result.setMonth(result.getMonth() + n);
  return result;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Generate [startDate, endDate] pairs covering each calendar month. */
function monthChunks(from: Date, to: Date): Array<[string, string]> {
  const chunks: Array<[string, string]> = [];
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor < to) {
    const next = addMonths(cursor, 1);
    chunks.push([toDateStr(cursor), toDateStr(next < to ? next : to)]);
    cursor = next;
  }
  return chunks;
}

async function fetchSecurityToken(widgetId: string): Promise<string> {
  const { origin } = HAPANA_CONFIG;
  const res = await fetch(SETTINGS_URL, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      appid: '1',
      appname: 'embed',
      bypasstoken: 'true',
      wid: widgetId,
      origin,
      referer: `${origin}/`,
    },
  });
  if (!res.ok) throw new Error(`Settings ${res.status}: ${res.statusText}`);
  const data = await res.json();
  if (!data.securityToken) throw new Error('No securityToken in settings response');
  return data.securityToken;
}

async function fetchPage(
  widgetId: string,
  securityToken: string,
  startDate: string,
  endDate: string,
  pageIndex: number,
): Promise<{ sessions: unknown[]; totalPages: number; message?: string }> {
  const { baseUrl, origin } = HAPANA_CONFIG;
  const url = new URL(baseUrl);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('endDate', endDate);
  url.searchParams.set('sessionCategory', 'classes');
  url.searchParams.set('siteID', widgetId);
  url.searchParams.set('pageIndex', String(pageIndex));
  url.searchParams.set('pageSize', String(PAGE_SIZE));

  const res = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      appid: '1',
      appname: 'embed',
      bypasstoken: 'true',
      securitytoken: securityToken,
      wid: widgetId,
      origin,
      referer: `${origin}/`,
    },
  });

  if (!res.ok) throw new Error(`Sessions ${res.status}: ${res.statusText}`);
  const data = await res.json();
  return {
    sessions: data.data ?? [],
    totalPages: data.pagination?.noOfPages ?? 1,
    message: data.message,
  };
}

interface RawSession {
  sessionID: string;
  sessionName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  duration: string;
  sessionType: string;
  instructor: string;
  capacity: number;
  reserved: number;
  remaining: number;
  casualRate: number;
  sessionStatus: string;
  timezone: string;
  sessionLocationType: string;
}

function parseDuration(duration: string): number {
  const hr = duration.match(/([\d.]+)\s*hr/i);
  if (hr) return Math.round(parseFloat(hr[1]) * 60);
  const min = duration.match(/([\d.]+)\s*min/i);
  if (min) return Math.round(parseFloat(min[1]));
  return 60;
}

function toMomence(s: RawSession, locationName: string): MomenceSession {
  const tz = s.timezone || 'Australia/Perth';
  const isPeak = s.sessionType.toLowerCase().includes('peak')
    && !s.sessionType.toLowerCase().includes('off-peak');
  const price = isPeak ? HAPANA_CONFIG.peakPrice : HAPANA_CONFIG.offPeakPrice;
  const occurrenceId = `${s.sessionID}-${s.sessionDate}T${s.startTime}`;
  return {
    id: occurrenceId,
    sessionName: s.sessionName,
    startsAt: new Date(`${s.sessionDate}T${s.startTime}`).toISOString(),
    endsAt: new Date(`${s.sessionDate}T${s.endTime}`).toISOString(),
    durationMinutes: parseDuration(s.duration),
    capacity: s.capacity,
    ticketsSold: s.reserved,
    fixedTicketPrice: price,
    location: locationName,
    inPerson: s.sessionLocationType === 'physical',
    isCancelled: s.sessionStatus === 'cancelled',
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function fetchLocationChunk(
  location: HapanaLocation,
  startDate: string,
  endDate: string,
  token: string,
): Promise<MomenceSession[]> {
  const sessions: MomenceSession[] = [];
  let page = 1;

  while (true) {
    const result = await fetchPage(location.widgetId, token, startDate, endDate, page);

    if (result.message === 'Record not found!') break;
    if (!result.sessions.length) break;

    for (const raw of result.sessions as RawSession[]) {
      sessions.push(toMomence(raw, location.name));
    }

    if (page >= result.totalPages) break;
    page++;
  }

  return sessions;
}

async function main() {
  const now = new Date();
  const chunks = monthChunks(START_DATE, now);

  console.log(`[hapana-deep-history] Probing ${chunks.length} monthly chunks from ${toDateStr(START_DATE)} → ${toDateStr(now)}`);
  console.log(`[hapana-deep-history] Locations: ${HAPANA_CONFIG.locations.map(l => l.name).join(', ')}`);
  if (DRY_RUN) console.log('[hapana-deep-history] DRY RUN — cache will not be written');

  // Load existing cache
  let existingSessions: MomenceSession[] = [];
  if (fs.existsSync(CACHE_FILE)) {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as CachedVenueEntry;
    existingSessions = (raw.sessions ?? []) as MomenceSession[];
    console.log(`[hapana-deep-history] Loaded ${existingSessions.length} existing cached sessions`);
  }

  const allFetched = new Map<string, MomenceSession>();

  for (const location of HAPANA_CONFIG.locations) {
    console.log(`\n── ${location.name} (since ${location.operatingSince}) ──`);

    let token: string;
    try {
      token = await fetchSecurityToken(location.widgetId);
    } catch (err) {
      console.error(`  Failed to get token: ${err}`);
      continue;
    }

    // Only scan from this location's opening date
    const locStart = new Date(location.operatingSince) > START_DATE
      ? new Date(location.operatingSince)
      : START_DATE;
    const locChunks = monthChunks(locStart, now);

    let locTotal = 0;
    for (const [start, end] of locChunks) {
      try {
        const sessions = await fetchLocationChunk(location, start, end, token);
        for (const s of sessions) allFetched.set(s.id, s);
        if (sessions.length > 0) {
          console.log(`  ${start} → ${end}: ${sessions.length} sessions`);
        }
        locTotal += sessions.length;
      } catch (err) {
        console.error(`  ${start} → ${end}: ERROR — ${err}`);
      }
      // Small delay to be polite
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`  Total fetched: ${locTotal}`);
  }

  console.log(`\n[hapana-deep-history] Total unique sessions fetched: ${allFetched.size}`);

  // Merge: existing cache wins for any already-known ID, new fetch fills gaps
  const merged = new Map<string, MomenceSession>();
  for (const s of existingSessions) merged.set(s.id, s);
  let newCount = 0;
  for (const [id, s] of allFetched) {
    if (!merged.has(id)) {
      merged.set(id, s);
      newCount++;
    }
  }

  const sorted = Array.from(merged.values())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const oldest = sorted[0]?.startsAt?.slice(0, 10) ?? 'n/a';
  const newest = sorted[sorted.length - 1]?.startsAt?.slice(0, 10) ?? 'n/a';

  console.log(`[hapana-deep-history] Merged total: ${sorted.length} sessions (${newCount} new)`);
  console.log(`[hapana-deep-history] Date range: ${oldest} → ${newest}`);

  if (DRY_RUN) {
    console.log('[hapana-deep-history] Dry run — skipping write.');
    return;
  }

  const output: CachedVenueEntry = {
    key: 'alchemysaunas|hapana',
    hostId: 'alchemysaunas',
    platform: 'hapana',
    venueName: 'Alchemy Saunas',
    dateRange: { from: sorted[0]?.startsAt ?? '', to: sorted[sorted.length - 1]?.startsAt ?? '' },
    cachedAt: new Date().toISOString(),
    sessions: sorted,
  };

  fs.writeFileSync(CACHE_FILE, JSON.stringify(output, null, 2));
  console.log(`[hapana-deep-history] Written to ${CACHE_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
