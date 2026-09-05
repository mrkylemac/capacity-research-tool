import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { getGlofoxConfig, getMarianaTekConfig, TRYBE_CONFIG, PORTAL_CONFIG, XTRA_CLUBS_CONFIG, getAcuityConfig, HAPANA_CONFIG, getBsportConfig, getPunchpassConfig, NAVIA_CONFIG } from '@/config/api';
import { fetchPortalSessions } from '@/lib/portalClient';
import { fetchMarianaTekSessions } from '@/lib/marianatekClient';
import { fetchXtraClubsSessions } from '@/lib/xtraClient';
import { fetchAllAcuitySessions } from '@/lib/acuityClient';
import { fetchAllHapanaSessions } from '@/lib/hapanaClient';
import { fetchAllBsportSessions } from '@/lib/bsportClient';
import { fetchAllPunchpassSessions } from '@/lib/punchpassClient';
import { fetchAllNaviaSessions } from '@/lib/naviaClient';
import { mergeWithCachedPast } from '@/lib/utils';
import type { CachedVenueEntry } from '@/lib/venueCache';
import type { MomenceSession } from '@/types/momence';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');

// ── Glofox guest token auto-refresh ───────────────────────────────────────────

/**
 * Fetch a fresh Glofox guest token for any branch.
 * Uses the public login endpoint — no credentials required.
 */
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

/**
 * Return a valid Glofox guest token, auto-refreshing if the stored one is expired
 * or will expire within 24 hours.
 */
async function getValidGlofoxToken(branchId: string, storedToken: string, tokenExpiry: string): Promise<string> {
  const expiresAt = new Date(tokenExpiry).getTime();
  const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000;
  if (storedToken && expiresAt > oneDayFromNow) return storedToken;

  console.log(`[Glofox] Token expired or expiring soon for branch ${branchId}, refreshing...`);
  return fetchGlofoxGuestToken(branchId);
}

// ── Glofox server-side fetcher ────────────────────────────────────────────────

async function fetchGlofoxDirect(
  branchId: string,
  token: string,
  timezone: string,
  startDate: Date,
  endDate: Date,
  page = 1,
  limit = 100,
): Promise<{ data: GlofoxEvent[]; has_more: boolean; total_count: number }> {
  const start = Math.floor(startDate.getTime() / 1000);
  const end = Math.floor(endDate.getTime() / 1000);
  const url = new URL('https://api.glofox.com/2.0/events');
  url.searchParams.set('start', start.toString());
  url.searchParams.set('end', end.toString());
  url.searchParams.set('include', 'trainers,facility,program');
  url.searchParams.set('page', page.toString());
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('private', 'false');
  url.searchParams.set('sort_by', 'time_start');

  const res = await fetch(url.toString(), {
    headers: {
      authorization: `Bearer ${token}`,
      'x-glofox-branch-id': branchId,
      'x-glofox-branch-timezone': timezone,
      'x-glofox-source': 'webportal',
      accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Glofox API: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

interface GlofoxEvent {
  _id: string;
  name: string;
  time_start: number;
  duration: number;
  size: number;
  booked: number;
  facility?: { name: string };
  level?: string;
}

function glofoxEventToSession(event: GlofoxEvent): MomenceSession {
  const startDate = new Date(event.time_start * 1000);
  const endDate = new Date(startDate.getTime() + event.duration * 60000);
  return {
    id: event._id,
    sessionName: event.name,
    startsAt: startDate.toISOString(),
    endsAt: endDate.toISOString(),
    durationMinutes: event.duration,
    capacity: event.size,
    ticketsSold: event.booked,
    fixedTicketPrice: 0,
    location: event.facility?.name ?? '',
    inPerson: true,
    level: event.level,
  };
}

async function fetchAllGlofoxSessions(
  branchId: string,
  token: string,
  timezone: string,
  startDate: Date,
  endDate: Date,
  onProgress?: (count: number) => void,
): Promise<MomenceSession[]> {
  // Fetch in 60-day chunks. The events endpoint pages 100 items at a time and
  // this fetcher stops at 100 pages, so a single multi-year window silently
  // truncates at 10,000 events — sorted ascending, dropping the newest months.
  const CHUNK_MS = 60 * 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  const allEvents: GlofoxEvent[] = [];
  const cursor = new Date(startDate);

  while (cursor < endDate) {
    const chunkEnd = new Date(Math.min(endDate.getTime(), cursor.getTime() + CHUNK_MS));
    let page = 1;
    while (true) {
      const response = await fetchGlofoxDirect(branchId, token, timezone, cursor, chunkEnd, page, 100);
      for (const event of response.data) {
        if (!seen.has(event._id)) {
          seen.add(event._id);
          allEvents.push(event);
        }
      }
      onProgress?.(allEvents.length);
      console.log(`[Glofox] ${cursor.toISOString().slice(0, 10)} → ${chunkEnd.toISOString().slice(0, 10)} page ${page}: ${response.data.length} events (total: ${allEvents.length})`);
      if (!response.has_more) break;
      if (page >= 100) {
        console.warn(`[Glofox] Chunk ${cursor.toISOString().slice(0, 10)} → ${chunkEnd.toISOString().slice(0, 10)} hit the 100-page cap — events dropped; reduce CHUNK_MS`);
        break;
      }
      page++;
    }
    cursor.setTime(chunkEnd.getTime());
  }

  return allEvents.map(glofoxEventToSession);
}

// ── TryBe server-side fetcher ─────────────────────────────────────────────────

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

async function fetchTrybeOfferingSessions(
  venueId: string,
  offeringId: string,
  offeringName: string,
  locationName: string | undefined,
  from: Date,
  to: Date,
): Promise<MomenceSession[]> {
  // TryBe expects ISO 8601 with timezone; use UTC to avoid DST ambiguity
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
    // TryBe room names are booking channels, not physical locations — collapse
    // to the configured location name so the report aggregates them.
    location: locationName ?? s.room.name,
    inPerson: true,
  }));
}

async function fetchAllTrybeSessions(
  venueId: string,
  offerings: readonly { id: string; name: string }[],
  locationName: string | undefined,
  from: Date,
  to: Date,
  venueName: string,
  existingSessions: MomenceSession[],
  onProgress?: (count: number) => void,
): Promise<MomenceSession[]> {
  // Fetch fresh data for the upcoming window
  const fresh: MomenceSession[] = [];
  const freshIds = new Set<string>();
  const now = new Date();

  for (const offering of offerings) {
    const sessions = await fetchTrybeOfferingSessions(venueId, offering.id, offering.name, locationName, from, to);
    console.log(`[${venueName}] Offering "${offering.name}": ${sessions.length} upcoming sessions`);
    for (const s of sessions) {
      if (!freshIds.has(s.id)) {
        freshIds.add(s.id);
        fresh.push(s);
      }
    }
    onProgress?.(fresh.length);
  }

  // Preserve previously cached sessions that have now passed (TryBe removes them
  // from the API), normalising their location to the configured name so history
  // cached before the location consolidation converges too.
  const past = existingSessions
    .filter(s => new Date(s.startsAt) < now && !freshIds.has(s.id))
    .map(s => (locationName ? { ...s, location: locationName } : s));
  console.log(`[${venueName}] Retaining ${past.length} cached past sessions`);

  return [...past, ...fresh].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse | Response> {
  let body: { hostId: string; platform: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { hostId, platform } = body;
  if (!hostId || !platform) {
    return NextResponse.json({ error: 'Missing hostId or platform' }, { status: 400 });
  }

  // Glofox — resolve a valid token (auto-refresh if expired)
  let glofoxToken: string | undefined;
  if (platform === 'glofox') {
    try {
      const cfg = getGlofoxConfig(hostId);
      glofoxToken = await getValidGlofoxToken(cfg.branchId, cfg.token, cfg.tokenExpiry);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
    }
  }

  // Load existing cached sessions for platforms that need incremental merging
  let existingSessions: MomenceSession[] = [];
  const existingFilePath = path.join(VENUES_DIR, `${hostId}-${platform}.json`);
  if (fs.existsSync(existingFilePath)) {
    try {
      const raw = fs.readFileSync(existingFilePath, 'utf-8');
      const existing = JSON.parse(raw) as CachedVenueEntry;
      existingSessions = existing.sessions ?? [];
    } catch {
      // ignore — we'll just start fresh
    }
  }

  // Stream progress events as NDJSON
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const send = (obj: Record<string, unknown>) => {
    writer.write(encoder.encode(JSON.stringify(obj) + '\n')).catch(() => {});
  };

  (async () => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 3);

    let sessions: MomenceSession[];
    let venueName: string;
    const onProgress = (count: number) => send({ type: 'progress', sessionCount: count });

    try {
      if (platform === 'glofox') {
        const cfg = getGlofoxConfig(hostId);
        const fresh = await fetchAllGlofoxSessions(
          cfg.branchId, glofoxToken!, cfg.timezone,
          new Date(cfg.operatingSince), toDate, onProgress,
        );
        sessions = mergeWithCachedPast(fresh, existingSessions);
        console.log(`[Glofox] Retaining ${sessions.length - fresh.length} cached past sessions alongside ${fresh.length} fresh`);
        venueName = cfg.name;
      } else if (platform === 'marianatek') {
        const cfg = getMarianaTekConfig(hostId);
        // Mariana Tek zeroes capacity/bookings on past classes for anonymous
        // callers, so history can only be captured while classes are still
        // bookable: fetch a month ahead, and let mergeWithCachedPast retain
        // each snapshot once the classes have run (TryBe/Acuity pattern).
        const mtTo = new Date(toDate);
        mtTo.setDate(mtTo.getDate() + 30);
        const fresh = await fetchMarianaTekSessions({
          baseUrl: cfg.baseUrl,
          locationId: cfg.locationId,
          regionId: cfg.regionId,
          classTypeFilters: cfg.classTypeFilters,
          fromDate: fromDate.toISOString().split('T')[0],
          toDate: mtTo.toISOString().split('T')[0],
          venueName: cfg.name,
          onProgress,
        });
        sessions = mergeWithCachedPast(fresh, existingSessions);
        console.log(`[MarianaTek] Retaining ${sessions.length - fresh.length} cached past sessions alongside ${fresh.length} fresh`);
        venueName = cfg.name;
      } else if (platform === 'trybe' && hostId === 'senseofself') {
        const cfg = TRYBE_CONFIG.senseOfSelf;
        const fetchFrom = new Date();
        const fetchTo = new Date();
        fetchTo.setDate(fetchTo.getDate() + 90);
        sessions = await fetchAllTrybeSessions(
          cfg.venueId, cfg.offerings, cfg.locationName, fetchFrom, fetchTo,
          cfg.name, existingSessions, onProgress,
        );
        venueName = cfg.name;
      } else if (platform === 'portal' && hostId === 'portal') {
        const cfg = PORTAL_CONFIG;
        const from = fromDate.toISOString().split('T')[0];
        const to = toDate.toISOString().split('T')[0];
        sessions = await fetchPortalSessions(
          cfg.baseUrl, cfg.locations, from, to, cfg.name, onProgress,
        );

        // Merge Glofox-based locations (e.g. Minneapolis)
        for (const glofoxLoc of cfg.glofoxLocations) {
          console.log(`[Portal] Fetching Glofox location "${glofoxLoc.name}"...`);
          const token = await getValidGlofoxToken(glofoxLoc.branchId, glofoxLoc.token, glofoxLoc.tokenExpiry);
          const glofoxSessions = await fetchAllGlofoxSessions(
            glofoxLoc.branchId, token, glofoxLoc.timezone,
            new Date(glofoxLoc.operatingSince), toDate, onProgress,
          );
          // Tag each session with the location name
          for (const s of glofoxSessions) {
            s.location = glofoxLoc.name;
          }
          sessions.push(...glofoxSessions);
        }

        // Renamed-period locations (Lyons) and dropped past windows would
        // otherwise be erased by the full-replace cache write below.
        const freshCount = sessions.length;
        sessions = mergeWithCachedPast(sessions, existingSessions);
        console.log(`[Portal] Retaining ${sessions.length - freshCount} cached past sessions alongside ${freshCount} fresh`);

        venueName = cfg.name;
      } else if (platform === 'xtraclubs' && hostId === 'xtraclubs') {
        const cfg = XTRA_CLUBS_CONFIG;
        const from = fromDate.toISOString().split('T')[0];
        const to = toDate.toISOString().split('T')[0];
        sessions = await fetchXtraClubsSessions(
          cfg.baseUrl, cfg.locations, from, to,
          cfg.name, cfg.timezone, onProgress,
        );
        venueName = cfg.name;
      } else if (platform === 'acuity') {
        const cfg = getAcuityConfig(hostId);
        sessions = await fetchAllAcuitySessions(cfg, existingSessions, onProgress);
        venueName = cfg.name;
      } else if (platform === 'hapana' && hostId === 'alchemysaunas') {
        const cfg = HAPANA_CONFIG;
        sessions = await fetchAllHapanaSessions(
          cfg.baseUrl, cfg.locations, cfg.origin,
          existingSessions, onProgress,
        );
        venueName = cfg.name;
      } else if (platform === 'punchpass') {
        const cfg = getPunchpassConfig(hostId);
        sessions = await fetchAllPunchpassSessions(cfg, existingSessions, { onProgress });
        venueName = cfg.name;
      } else if (platform === 'navia') {
        // No entry ledger on this path, so a sitting whose earlier entries have
        // already expired rebuilds as a partial block and is emitted
        // schedule-only. The cron poller (yarn poll:navia) carries the ledger
        // and is authoritative; the next poll heals anything this refetch
        // downgrades.
        sessions = await fetchAllNaviaSessions(NAVIA_CONFIG, existingSessions, { onProgress });
        venueName = NAVIA_CONFIG.name;
      } else if (platform === 'bsport') {
        const cfg = getBsportConfig(hostId);
        sessions = await fetchAllBsportSessions(
          cfg, new Date(cfg.operatingSince), toDate, onProgress,
        );
        venueName = cfg.name;
      } else {
        send({ type: 'error', error: `Unsupported platform/hostId: ${platform}/${hostId}` });
        writer.close();
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      send({ type: 'error', error: msg });
      writer.close();
      return;
    }

    const dateRange = sessions.length > 0
      ? {
          from: sessions.reduce((min, s) => s.startsAt < min ? s.startsAt : min, sessions[0].startsAt),
          to: sessions.reduce((max, s) => s.startsAt > max ? s.startsAt : max, sessions[0].startsAt),
        }
      : { from: fromDate.toISOString(), to: toDate.toISOString() };

    const entry: CachedVenueEntry = {
      key: `${hostId}|${platform}`,
      hostId,
      platform: platform as CachedVenueEntry['platform'],
      venueName,
      dateRange,
      cachedAt: new Date().toISOString(),
      sessions,
      metrics: null,
      monthlyData: [],
      venueConfig: null,
      hostInfo: null,
    };

    try {
      fs.mkdirSync(VENUES_DIR, { recursive: true });
      const filePath = path.join(VENUES_DIR, `${hostId}-${platform}.json`);
      fs.writeFileSync(filePath, JSON.stringify(entry, null, 2), 'utf-8');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      send({ type: 'error', error: `Failed to write cache: ${msg}` });
      writer.close();
      return;
    }

    send({ type: 'done', ok: true, sessionCount: sessions.length, venueName });
    writer.close();
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  });
}
