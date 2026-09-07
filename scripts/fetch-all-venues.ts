#!/usr/bin/env tsx
/**
 * Pre-fetch all venue session data and write to src/data/venues/{id}-{platform}.json
 *
 * Run: yarn fetch-venues
 */

import fs from 'node:fs';
import path from 'node:path';
import { addDays, format, subYears } from 'date-fns';
import { VENUES, getGlofoxConfig, MARIANATEK_CONFIG, INNER_STUDIO_CONFIG, type VenueConfig } from '../src/config/api';
import { momenceClient, markPreLaunchSessions } from '../src/lib/momenceClient';
import { fetchMarianaTekSessions } from '../src/lib/marianatekClient';
import { sanitizeSessions, logDataQuality, mergeWithCachedPast } from '../src/lib/utils';
import { calculateMetrics, calculateMonthlyData } from '../src/lib/metricsCalculator';
import type { MomenceSession } from '../src/types/momence';
import type { GlofoxEvent } from '../src/types/glofox';
import type { CachedVenueEntry } from '../src/lib/venueCache';

const DATA_WINDOW_YEARS = 4;
/**
 * How far ahead to fetch. Every platform here serves its forward timetable,
 * and the report shows upcoming sessions, so stopping at today both missed
 * that and — because a rewrite only retains cached *past* sessions — deleted
 * any forward schedule an earlier fetch had stored. Sauna Goose lost 187
 * sessions carrying 49 bookings that way.
 */
const FORWARD_WINDOW_DAYS = 120;
const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');

/**
 * Multi-location Momence venues keyed by combined venue id. The venue id is
 * not itself a Momence host — each location's hostId is fetched separately and
 * sessions are labelled with the location name (mirrors useSessions.ts).
 */
const MULTI_LOCATION_MOMENCE: Record<string, { name: string; locations: readonly { hostId: string; name: string }[] }> = {
  innerstudio: INNER_STUDIO_CONFIG,
};

function getDateWindow() {
  const to = new Date();
  const from = subYears(to, DATA_WINDOW_YEARS);
  // `to` stays "now" because it is what the cached metrics and dateRange
  // describe; `fetchTo` is how far the API calls reach.
  const fetchTo = addDays(to, FORWARD_WINDOW_DAYS);
  return {
    from,
    to,
    fetchTo,
    fromStr: format(from, 'yyyy-MM-dd'),
    toStr: format(to, 'yyyy-MM-dd'),
    fetchToStr: format(fetchTo, 'yyyy-MM-dd'),
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
  const endDate = addDays(new Date(), FORWARD_WINDOW_DAYS);
  const startTs = Math.floor(startDate.getTime() / 1000);
  const endTs = Math.floor(endDate.getTime() / 1000);

  const allEvents: GlofoxEvent[] = [];
  let page = 1;

  while (true) {
    const response = await fetchGlofoxPage(startTs, endTs, token, config.branchId, config.timezone, page);
    allEvents.push(...response.data);
    console.log(`  Glofox page ${page}: ${response.data.length} events (total: ${allEvents.length}/${response.total_count})`);
    // Runaway guard well above the largest known venue (~360 pages at 100/page)
    if (!response.has_more || page >= 500) break;
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
  // 4 years at ~30 sessions a day is ~44k for the busiest venue. The old 250
  // page ceiling (25k) silently cut the newest sessions off the two largest
  // hosts, and Momence pages oldest first, so the truncation landed on the
  // months that matter most.
  const maxPages = 500;

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

    if (response.sessions.length < pageSize || page >= response.totalPages) break;
    page++;
  }

  if (page > maxPages) {
    console.warn(`  ⚠ Stopped at the ${maxPages} page ceiling — newer sessions were not fetched`);
  }

  return all;
}

// ── Cached-history merge ──────────────────────────────────────────────────────

/** The cache file as it stands, or null when there is nothing to read. */
function readCachedEntry(venue: VenueConfig): CachedVenueEntry | null {
  const cachePath = path.join(VENUES_DIR, `${venue.id}-${venue.platform}.json`);
  if (!fs.existsSync(cachePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as CachedVenueEntry;
  } catch {
    return null;
  }
}

/**
 * Merge freshly fetched sessions with the existing cache file, retaining
 * cached sessions that fall outside the fetch window [from, to]. Used for
 * platforms whose API serves a rolling history horizon (MarianaTek rejects
 * date chunks older than ~6 months with a 403), where a plain rewrite would
 * permanently lose history the API can no longer serve. Inside the window the
 * fresh fetch wins wholesale, so sessions cancelled since the last fetch are
 * still dropped.
 */
function mergeWithCachedHistory(
  venue: VenueConfig,
  fresh: MomenceSession[],
  to: Date,
): MomenceSession[] {
  const cachePath = path.join(VENUES_DIR, `${venue.id}-${venue.platform}.json`);
  if (!fs.existsSync(cachePath)) return fresh;

  let cached: CachedVenueEntry;
  try {
    cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  } catch {
    return fresh;
  }

  // The horizon is the earliest session the API actually served this run.
  // With no fresh sessions at all (total API failure) the whole cache is kept.
  const freshIds = new Set(fresh.map(s => s.id));
  const horizon = fresh.length
    ? Math.min(...fresh.map(s => new Date(s.startsAt).getTime()))
    : to.getTime();
  const windowEnd = to.getTime();

  const retained = (cached.sessions || []).filter(s => {
    if (freshIds.has(s.id)) return false;
    const t = new Date(s.startsAt).getTime();
    return t < horizon || t > windowEnd;
  });

  if (retained.length > 0) {
    console.log(`  ↩ Retained ${retained.length} cached sessions outside the API's serveable window`);
  }
  return [...retained, ...fresh].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

// ── Process and write a single venue ─────────────────────────────────────────

async function processVenue(venue: VenueConfig): Promise<void> {
  const { from, to, fetchTo, fromStr, toStr, fetchToStr } = getDateWindow();
  console.log(`\n── ${venue.name} (${venue.platform}) ──`);

  let rawSessions: MomenceSession[] = [];
  let hostInfoName = venue.name;

  if (venue.platform === 'momence') {
    const multiConfig = MULTI_LOCATION_MOMENCE[venue.id];

    if (multiConfig) {
      // Multi-location venue: fetch each location's host and label sessions
      hostInfoName = multiConfig.name;
      const allRaw: MomenceSession[] = [];
      for (const loc of multiConfig.locations) {
        console.log(`  Location: ${loc.name} (host ${loc.hostId})`);
        const locRaw = await fetchAllMomenceSessions({ ...venue, id: loc.hostId }, from, fetchTo);
        allRaw.push(...locRaw.map(s => ({ ...s, location: loc.name })));
      }
      const { sessions, report } = sanitizeSessions(allRaw);
      logDataQuality(`Momence[${venue.id}]`, report);
      rawSessions = sessions;
    } else {
      // Fetch host info for the display name
      const hostInfo = await momenceClient.fetchHostInfo(venue.id);
      if (hostInfo?.name) hostInfoName = hostInfo.name;

      const allRaw = await fetchAllMomenceSessions(venue, from, fetchTo);
      const { sessions, report } = sanitizeSessions(allRaw);
      logDataQuality(`Momence[${venue.id}]`, report);
      rawSessions = sessions;
    }

  } else if (venue.platform === 'glofox') {
    rawSessions = await fetchAllGlofoxEvents(venue);

  } else if (venue.platform === 'marianatek') {
    const configKey = venue.id === 'aerth' ? 'aerthSaunas' : 'projectMood';
    const config = MARIANATEK_CONFIG[configKey];
    const freshSessions = await fetchMarianaTekSessions({
      baseUrl: config.baseUrl,
      locationId: config.locationId,
      regionId: config.regionId,
      fromDate: fromStr,
      toDate: fetchToStr,
      venueName: config.name,
      classTypeFilters: config.classTypeFilters,
    });
    // MarianaTek 403s date chunks beyond its history horizon — keep cached
    // sessions from before that horizon rather than losing them on rewrite.
    rawSessions = mergeWithCachedHistory(venue, freshSessions, fetchTo);
  } else {
    // Platforms handled by their own poll scripts (trybe, acuity, portal,
    // xtraclubs, hapana, bsport). Writing here would clobber their cache
    // files — some of which hold polled history that no API can re-serve —
    // with an empty entry. Skip instead.
    console.log(`  ↷ Skipped: platform "${venue.platform}" is not handled by this script (use its poll/fetch script instead)`);
    return;
  }

  console.log(`  → ${rawSessions.length} sessions after sanitization`);

  // Never let a rewrite drop a past session. An API that stops serving old
  // history, a page ceiling, a venue that changed platform (Sauna Goose's
  // pre-Momence history came from Acuity and survives only in this file) all
  // shrink a fetch without anything being wrong at the venue. Fresh data still
  // wins by id, and future slots are free to disappear — that is the venue
  // changing its timetable, not lost history. Same rule the browser sync uses.
  const cachedEntry = readCachedEntry(venue);
  const cachedSessions = cachedEntry?.sessions ?? [];
  const beforeMerge = rawSessions.length;
  rawSessions = mergeWithCachedPast(rawSessions, cachedSessions);
  if (rawSessions.length > beforeMerge) {
    console.log(`  ↩ Retained ${rawSessions.length - beforeMerge} past session(s) the fetch no longer returns`);
  }

  // A session past the fetch horizon was never asked for, so its absence says
  // nothing about the venue's timetable. Keep it. Once its date falls inside
  // the window a later run covers it and fresh data wins by id.
  const fetchedIds = new Set(rawSessions.map(s => s.id));
  const beyondHorizon = cachedSessions.filter(
    s => !fetchedIds.has(s.id) && new Date(s.startsAt).getTime() > fetchTo.getTime(),
  );
  if (beyondHorizon.length > 0) {
    console.log(`  ↩ Retained ${beyondHorizon.length} session(s) beyond the ${FORWARD_WINDOW_DAYS} day fetch horizon`);
    rawSessions = [...rawSessions, ...beyondHorizon].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }

  // The timetable a venue loaded before it went live comes back with
  // ticketsSold: 0 on every row. Flag those so the placeholder zeros stay out
  // of every average, while the schedule itself survives in the cache. After
  // the merge, so retained sessions are flagged too.
  if (venue.platform === 'momence') {
    rawSessions = markPreLaunchSessions(rawSessions);
  }

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
    // Carried over, not nulled: hostInfo holds the venue logo the home page
    // and /api/venue-images read, and only the browser sync ever writes it.
    venueConfig: cachedEntry?.venueConfig ?? null,
    hostInfo: cachedEntry?.hostInfo ?? null,
  };

  fs.mkdirSync(VENUES_DIR, { recursive: true });
  const outPath = path.join(VENUES_DIR, `${venue.id}-${venue.platform}.json`);
  fs.writeFileSync(outPath, JSON.stringify(entry, null, 2), 'utf-8');
  console.log(`  ✓ Written to ${path.relative(process.cwd(), outPath)}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Fetching all venue data ===');
  console.log(`Date window: ${DATA_WINDOW_YEARS} years back to today\n`);

  let ok = 0;
  let failed = 0;

  // `yarn fetch-venues 41167 59636` re-runs just those venues — a full pass is
  // ~1,500 API pages, too much to repeat because one venue hit a 502.
  const only = process.argv.slice(2);
  const venues = only.length > 0 ? VENUES.filter(v => only.includes(v.id)) : VENUES;
  if (only.length > 0) {
    console.log(`Filtered to ${venues.length} venue(s): ${venues.map(v => v.id).join(', ')}\n`);
    const unknown = only.filter(id => !VENUES.some(v => v.id === id));
    if (unknown.length > 0) console.warn(`  ⚠ Unknown venue id(s): ${unknown.join(', ')}`);
  }

  for (const venue of venues) {
    try {
      await processVenue(venue);
      ok++;
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\n=== Done: ${ok} succeeded, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
