#!/usr/bin/env tsx
/**
 * Pre-fetch all venue session data and write to src/data/venues/{id}-{platform}.json
 *
 * Run: yarn fetch-venues
 */

import fs from 'node:fs';
import path from 'node:path';
import { format, subYears } from 'date-fns';
import { VENUES, getGlofoxConfig, MARIANATEK_CONFIG, type VenueConfig } from '../src/config/api';
import { momenceClient } from '../src/lib/momenceClient';
import { fetchMarianaTekSessions } from '../src/lib/marianatekClient';
import { sanitizeSessions, logDataQuality } from '../src/lib/utils';
import { calculateMetrics, calculateMonthlyData } from '../src/lib/metricsCalculator';
import type { MomenceSession } from '../src/types/momence';
import type { GlofoxEvent } from '../src/types/glofox';
import type { CachedVenueEntry } from '../src/lib/venueCache';

const DATA_WINDOW_YEARS = 2;
const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');

function getDateWindow() {
  const to = new Date();
  const from = subYears(to, DATA_WINDOW_YEARS);
  return {
    from,
    to,
    fromStr: format(from, 'yyyy-MM-dd'),
    toStr: format(to, 'yyyy-MM-dd'),
  };
}

// ── Glofox direct fetch (bypasses browser proxy) ──────────────────────────────

const GLOFOX_API = 'https://api.glofox.com/2.0/events';

async function fetchGlofoxPage(
  startTs: number,
  endTs: number,
  token: string,
  branchId: string,
  timezone: string,
  page: number,
  limit = 100,
): Promise<{ data: GlofoxEvent[]; has_more: boolean; total_count: number }> {
  const url = new URL(GLOFOX_API);
  url.searchParams.set('start', startTs.toString());
  url.searchParams.set('end', endTs.toString());
  url.searchParams.set('include', 'trainers,facility,program');
  url.searchParams.set('page', page.toString());
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('private', 'false');
  url.searchParams.set('sort_by', 'time_start');

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'x-glofox-branch-id': branchId,
      'x-glofox-branch-timezone': timezone,
      'x-glofox-source': 'webportal',
    },
  });

  if (!res.ok) throw new Error(`Glofox API: ${res.status} ${res.statusText}`);
  return res.json();
}

/** Fetch a fresh Glofox guest token (public endpoint, no credentials). */
async function fetchGlofoxGuestToken(branchId: string): Promise<string> {
  const res = await fetch('https://api.glofox.com/2.0/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-glofox-source': 'webportal' },
    body: JSON.stringify({ branch_id: branchId, login: 'GUEST', password: 'GUEST' }),
  });
  if (!res.ok) throw new Error(`Glofox guest login failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (!data.token) throw new Error('Glofox guest login returned no token');
  return data.token;
}

/** Return a valid token, auto-refreshing if expired or expiring within 24h. */
async function getValidGlofoxToken(branchId: string, storedToken: string, tokenExpiry: string): Promise<string> {
  const expiresAt = new Date(tokenExpiry).getTime();
  const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;
  if (storedToken && expiresAt > oneDayFromNow) return storedToken;
  console.log(`  [Glofox] Token expired or expiring soon, auto-refreshing...`);
  return fetchGlofoxGuestToken(branchId);
}

async function fetchAllGlofoxEvents(venue: VenueConfig): Promise<MomenceSession[]> {
  const config = getGlofoxConfig(venue.id);

  // Auto-refresh token if expired or expiring soon (no manual intervention needed)
  const token = await getValidGlofoxToken(config.branchId, config.token, config.tokenExpiry);

  const startDate = new Date(config.operatingSince);
  const endDate = new Date();
  const startTs = Math.floor(startDate.getTime() / 1000);
  const endTs = Math.floor(endDate.getTime() / 1000);

  const allEvents: GlofoxEvent[] = [];
  let page = 1;

  while (true) {
    const response = await fetchGlofoxPage(startTs, endTs, token, config.branchId, config.timezone, page);
    allEvents.push(...response.data);
    console.log(`  Glofox page ${page}: ${response.data.length} events (total: ${allEvents.length}/${response.total_count})`);
    if (!response.has_more || page >= 100) break;
    page++;
  }

  // Transform to MomenceSession shape
  const raw: MomenceSession[] = allEvents.map(event => ({
    id: event._id,
    sessionName: event.name,
    startsAt: new Date(event.time_start * 1000).toISOString(),
    endsAt: new Date((event.time_start + event.duration * 60) * 1000).toISOString(),
    durationMinutes: event.duration,
    capacity: event.size,
    ticketsSold: event.booked,
    fixedTicketPrice: 0,
    location: event.facility?.name || '',
    inPerson: true,
    level: event.level,
    isCancelled: false,
  }));

  const { sessions, report } = sanitizeSessions(raw);
  logDataQuality('Glofox', report);
  return sessions as MomenceSession[];
}

// ── Momence full fetch ────────────────────────────────────────────────────────

async function fetchAllMomenceSessions(venue: VenueConfig, from: Date, to: Date): Promise<MomenceSession[]> {
  const all: MomenceSession[] = [];
  let page = 1;
  const pageSize = 100;
  const maxPages = 250;

  while (page <= maxPages) {
    const response = await momenceClient.fetchSessions({
      hostId: venue.id,
      startsAtFrom: from.toISOString(),
      startsAtTo: to.toISOString(),
      page,
      pageSize,
    });

    all.push(...response.sessions);
    console.log(`  Momence page ${page}/${response.totalPages}: ${response.sessions.length} sessions (total: ${all.length})`);

    // Keep paginating while pages come back full — the API's totalPages has been
    // unreliable across response-shape changes; a short page is the real end.
    if (response.sessions.length < pageSize) break;
    page++;
  }

  return all;
}

// ── Process and write a single venue ─────────────────────────────────────────

async function processVenue(venue: VenueConfig): Promise<void> {
  const { from, to, fromStr, toStr } = getDateWindow();
  console.log(`\n── ${venue.name} (${venue.platform}) ──`);

  let rawSessions: MomenceSession[] = [];
  let hostInfoName = venue.name;

  if (venue.platform === 'momence') {
    // Fetch host info for the display name
    const hostInfo = await momenceClient.fetchHostInfo(venue.id);
    if (hostInfo?.name) hostInfoName = hostInfo.name;

    const allRaw = await fetchAllMomenceSessions(venue, from, to);
    const { sessions, report } = sanitizeSessions(allRaw);
    logDataQuality(`Momence[${venue.id}]`, report);
    rawSessions = sessions;

  } else if (venue.platform === 'glofox') {
    rawSessions = await fetchAllGlofoxEvents(venue);

  } else if (venue.platform === 'marianatek') {
    const configKey = venue.id === 'aerth' ? 'aerthSaunas' : 'projectMood';
    const config = MARIANATEK_CONFIG[configKey];
    rawSessions = await fetchMarianaTekSessions({
      baseUrl: config.baseUrl,
      locationId: config.locationId,
      regionId: config.regionId,
      fromDate: fromStr,
      toDate: toStr,
      venueName: config.name,
      classTypeFilter: config.classTypeFilter,
    });
  }

  console.log(`  → ${rawSessions.length} sessions after sanitization`);

  const metrics = calculateMetrics(rawSessions, fromStr, toStr);
  const monthlyData = calculateMonthlyData(rawSessions);

  const entry: CachedVenueEntry = {
    key: `${venue.id}|${venue.platform}`,
    hostId: venue.id,
    platform: venue.platform,
    venueName: hostInfoName,
    dateRange: { from: fromStr, to: toStr },
    cachedAt: new Date().toISOString(),
    sessions: rawSessions,
    metrics,
    monthlyData,
    venueConfig: null,
    hostInfo: null,
  };

  fs.mkdirSync(VENUES_DIR, { recursive: true });
  const outPath = path.join(VENUES_DIR, `${venue.id}-${venue.platform}.json`);
  fs.writeFileSync(outPath, JSON.stringify(entry, null, 2), 'utf-8');
  console.log(`  ✓ Written to ${path.relative(process.cwd(), outPath)}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Platforms this script can actually fetch. Venues on any other platform are
// skipped entirely — writing a cache file for them would clobber the good,
// separately-polled caches (trybe/acuity/bsport/hapana/portal/xtraclubs) with
// empty session lists.
const HANDLED_PLATFORMS = new Set(['momence', 'glofox', 'marianatek']);

async function main() {
  console.log('=== Fetching all venue data ===');
  console.log(`Date window: ${DATA_WINDOW_YEARS} years back to today\n`);

  let ok = 0;
  let failed = 0;
  let skipped = 0;

  for (const venue of VENUES) {
    if (!HANDLED_PLATFORMS.has(venue.platform)) {
      console.log(`\n── ${venue.name} (${venue.platform}) ── skipped (refreshed by its own poller, not this script)`);
      skipped++;
      continue;
    }
    try {
      await processVenue(venue);
      ok++;
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\n=== Done: ${ok} succeeded, ${failed} failed, ${skipped} skipped (other platforms) ===`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
