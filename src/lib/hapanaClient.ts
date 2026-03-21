/**
 * Hapana widget API client — fetches session data from Alchemy Saunas
 * via the public widget API at widgetapi.hapana.com.
 *
 * Data model:
 * - Returns sessions with capacity + booking counts (reserved/remaining)
 * - Limited historical data (~2-3 months back), plus future schedule
 * - Past sessions are removed over time → incremental caching required
 * - Pricing is credit-based (casualRate: 0); we use static prices from config
 * - Paginated: up to 100 per page, totalRecords in response
 *
 * Multi-location: Alchemy Saunas has 8 locations, each with a unique widgetId.
 * Sessions from all locations are fetched and merged into a single array.
 */

import type { MomenceSession } from '@/types/momence';
import type { HapanaLocation } from '@/config/api';

// ── API types ────────────────────────────────────────────────────────────────

interface HapanaSession {
  sessionID: string;
  sessionName: string;
  sessionDate: string;       // YYYY-MM-DD
  startTime: string;         // HH:MM:SS
  endTime: string;           // HH:MM:SS
  duration: string;          // e.g. "1 hr"
  sessionType: string;       // e.g. "1hr Session (peak)"
  instructor: string;        // location name for Alchemy
  capacity: number;
  reserved: number;
  remaining: number;
  casualRate: number;
  sessionStatus: string;     // "complete", "open", etc.
  address: string;
  timezone: string;
  sessionLocationType: string;
  isCancelled?: boolean;
}

interface HapanaPagination {
  totalRecords: number;
  pageSize: number;
  pageIndex: number;
  noOfPages: number;
}

interface HapanaResponse {
  success: boolean;
  pagination: HapanaPagination;
  data: HapanaSession[];
  message?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SETTINGS_URL = 'https://widgetapi.hapana.com/v2/wAPI/site/settings';
const PAGE_SIZE = 100;
const MAX_PAGES = 100;
const CONCURRENCY = 5;

// ── Security token ───────────────────────────────────────────────────────────

interface HapanaSettings {
  securityToken: string;
  siteName: string;
  timezone: string;
}

/**
 * Fetch a fresh security token from the Hapana settings endpoint.
 * No authentication is required — just the widget ID and origin.
 */
async function fetchSecurityToken(widgetId: string, origin: string): Promise<string> {
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

  if (!res.ok) {
    throw new Error(`Hapana settings API: ${res.status} ${res.statusText}`);
  }

  const settings: HapanaSettings = await res.json();
  if (!settings.securityToken) {
    throw new Error('Hapana settings returned no securityToken');
  }

  return settings.securityToken;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseDurationMinutes(duration: string): number {
  // "1 hr" → 60, "1.5 hrs" → 90, "30 min" → 30
  const hrMatch = duration.match(/([\d.]+)\s*hr/i);
  if (hrMatch) return Math.round(parseFloat(hrMatch[1]) * 60);
  const minMatch = duration.match(/([\d.]+)\s*min/i);
  if (minMatch) return Math.round(parseFloat(minMatch[1]));
  return 60; // default
}

function hapanaSessionToMomence(
  session: HapanaSession,
  locationName: string,
  peakPrice: number,
  offPeakPrice: number,
): MomenceSession {
  const durationMinutes = parseDurationMinutes(session.duration);
  const tz = session.timezone || 'Australia/Perth';

  // Build ISO datetime from date + time + timezone
  const startStr = `${session.sessionDate}T${session.startTime}`;
  const endStr = `${session.sessionDate}T${session.endTime}`;

  // Determine price from session type
  const isPeak = session.sessionType.toLowerCase().includes('peak')
    && !session.sessionType.toLowerCase().includes('off-peak');
  const price = isPeak ? peakPrice : offPeakPrice;

  // Hapana sessionIDs are slot-type identifiers, not occurrence identifiers —
  // the same ID reappears every time that slot runs. Combine with date+time
  // to get a unique key per occurrence.
  const occurrenceId = `${session.sessionID}-${session.sessionDate}T${session.startTime}`;

  return {
    id: occurrenceId,
    sessionName: session.sessionName,
    startsAt: toISO(startStr, tz),
    endsAt: toISO(endStr, tz),
    durationMinutes,
    capacity: session.capacity,
    ticketsSold: session.reserved,
    fixedTicketPrice: price,
    location: locationName,
    inPerson: session.sessionLocationType === 'physical',
    isCancelled: session.sessionStatus === 'cancelled',
  };
}

/**
 * Convert a local datetime string + IANA timezone to ISO 8601.
 * Falls back to appending a fixed offset if Intl is unavailable.
 */
function toISO(localDatetime: string, tz: string): string {
  try {
    // Parse the local date parts
    const d = new Date(localDatetime);
    if (isNaN(d.getTime())) return localDatetime;

    // Use Intl to get the timezone offset
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    // We already have the local time, just need to express it as ISO
    // Simply return as ISO with the date parts intact
    return new Date(localDatetime).toISOString();
  } catch {
    return new Date(localDatetime).toISOString();
  }
}

// ── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchHapanaPage(
  baseUrl: string,
  widgetId: string,
  securityToken: string,
  origin: string,
  startDate: string,
  endDate: string,
  pageIndex: number,
): Promise<HapanaResponse> {
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

  if (!res.ok) {
    throw new Error(`Hapana API: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Fetch all sessions for a single Hapana location within a date range.
 * Dynamically fetches a fresh security token from the settings endpoint.
 */
async function fetchLocationSessions(
  baseUrl: string,
  location: HapanaLocation,
  origin: string,
  startDate: string,
  endDate: string,
  peakPrice: number,
  offPeakPrice: number,
): Promise<MomenceSession[]> {
  // Fetch a fresh security token for this location's widget
  const securityToken = await fetchSecurityToken(location.widgetId, origin);
  console.log(`[Hapana/${location.name}] Fetched security token`);

  const sessions: MomenceSession[] = [];
  let pageIndex = 1;

  while (true) {
    const response = await fetchHapanaPage(
      baseUrl, location.widgetId, securityToken, origin,
      startDate, endDate, pageIndex,
    );

    if (!response.success || !response.data) {
      // "Record not found" means no data for this date range — not an error
      if (response.message === 'Record not found!') break;
      throw new Error(`Hapana API error: ${response.message || 'unknown'}`);
    }

    for (const s of response.data) {
      sessions.push(hapanaSessionToMomence(s, location.name, peakPrice, offPeakPrice));
    }

    console.log(`[Hapana/${location.name}] Page ${pageIndex}/${response.pagination.noOfPages}: ${response.data.length} sessions (total: ${sessions.length})`);

    if (pageIndex >= response.pagination.noOfPages || pageIndex >= MAX_PAGES) break;
    pageIndex++;
  }

  return sessions;
}

/** Run async tasks with bounded concurrency. */
async function mapConcurrent<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let idx = 0;

  async function next(): Promise<void> {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
  return results;
}

/**
 * Fetch all sessions across all Hapana (Alchemy Saunas) locations.
 * Security tokens are fetched dynamically per-location from the settings endpoint.
 * Merges fresh sessions with previously cached past sessions (incremental).
 */
export async function fetchAllHapanaSessions(
  baseUrl: string,
  locations: readonly HapanaLocation[],
  origin: string,
  peakPrice: number,
  offPeakPrice: number,
  existingSessions: MomenceSession[],
  onProgress?: (count: number) => void,
): Promise<MomenceSession[]> {
  const now = new Date();

  // Fetch from 3 months ago to 1 month ahead
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 3);
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 1);

  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  console.log(`[Hapana] Fetching ${locations.length} locations from ${startStr} to ${endStr}`);

  const freshSessions: MomenceSession[] = [];
  const freshIds = new Set<string>();

  const locationResults = await mapConcurrent(locations, CONCURRENCY, async (loc) => {
    return fetchLocationSessions(
      baseUrl, loc, origin,
      startStr, endStr, peakPrice, offPeakPrice,
    );
  });

  for (const locSessions of locationResults) {
    for (const s of locSessions) {
      if (!freshIds.has(s.id)) {
        freshIds.add(s.id);
        freshSessions.push(s);
      }
    }
    onProgress?.(freshSessions.length);
  }

  // Preserve previously cached past sessions that the API no longer returns
  const past = existingSessions.filter(
    s => new Date(s.startsAt) < now && !freshIds.has(s.id),
  );
  console.log(`[Hapana] Retaining ${past.length} cached past sessions, ${freshSessions.length} fresh`);

  return [...past, ...freshSessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
