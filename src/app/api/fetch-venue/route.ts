import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { GLOFOX_CONFIG, MARIANATEK_CONFIG, TRYBE_CONFIG } from '@/config/api';
import type { CachedVenueEntry } from '@/lib/venueCache';
import type { MomenceSession } from '@/types/momence';

const VENUES_DIR = path.join(process.cwd(), 'src', 'data', 'venues');

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
): Promise<MomenceSession[]> {
  const allEvents: GlofoxEvent[] = [];
  let page = 1;

  while (true) {
    const response = await fetchGlofoxDirect(branchId, token, timezone, startDate, endDate, page, 100);
    allEvents.push(...response.data);
    console.log(`[Glofox] Page ${page}: ${response.data.length} events (total: ${allEvents.length}/${response.total_count})`);
    if (!response.has_more || page >= 100) break;
    page++;
  }

  return allEvents.map(glofoxEventToSession);
}

// ── Mariana Tek server-side fetcher ──────────────────────────────────────────

interface MTClass {
  id: string;
  name: string;
  start_datetime: string;
  capacity: number;
  available_spot_count: number;
  class_type?: { name: string; duration: number; is_live_stream: boolean };
  classroom_name?: string;
  location?: { name: string };
  is_free_class: boolean;
}

interface MTResponse {
  results: MTClass[];
  meta?: { pagination?: { pages: number } };
}

async function fetchAllMarianaTekSessions(
  baseUrl: string,
  locationId: string,
  regionId: string,
  classTypeFilter: string,
  fromDate: string,
  toDate: string,
  venueName: string,
): Promise<MomenceSession[]> {
  const all: MomenceSession[] = [];
  let page = 1;

  while (true) {
    const url = new URL(`${baseUrl}/classes`);
    url.searchParams.set('min_start_date', fromDate);
    url.searchParams.set('max_start_date', toDate);
    url.searchParams.set('page_size', '500');
    url.searchParams.set('page', page.toString());
    url.searchParams.set('location', locationId);
    url.searchParams.set('region', regionId);

    const res = await fetch(url.toString(), { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Mariana Tek API: ${res.status} ${res.statusText}`);
    const data: MTResponse = await res.json();

    const filtered = (data.results ?? []).filter(c => c.class_type?.name === classTypeFilter);
    for (const c of filtered) {
      const start = new Date(c.start_datetime);
      const durationMs = (c.class_type?.duration ?? 0) * 60 * 1000;
      all.push({
        id: c.id,
        sessionName: c.name,
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + durationMs).toISOString(),
        durationMinutes: c.class_type?.duration ?? 0,
        capacity: c.capacity,
        ticketsSold: Math.max(0, c.capacity - c.available_spot_count),
        fixedTicketPrice: c.is_free_class ? 0 : 0,
        location: c.location?.name ?? c.classroom_name ?? '',
        inPerson: !(c.class_type?.is_live_stream ?? false),
      });
    }

    console.log(`[${venueName}] Page ${page}: ${data.results?.length ?? 0} classes → ${filtered.length} "${classTypeFilter}" (total: ${all.length})`);

    const pages = data.meta?.pagination?.pages ?? 1;
    if (page >= pages || (data.results?.length ?? 0) === 0) break;
    page++;
  }

  return all;
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
    location: s.room.name,
    inPerson: true,
  }));
}

async function fetchAllTrybeSessions(
  venueId: string,
  offerings: readonly { id: string; name: string }[],
  from: Date,
  to: Date,
  venueName: string,
  existingSessions: MomenceSession[],
): Promise<MomenceSession[]> {
  // Fetch fresh data for the upcoming window
  const fresh: MomenceSession[] = [];
  const freshIds = new Set<string>();
  const now = new Date();

  for (const offering of offerings) {
    const sessions = await fetchTrybeOfferingSessions(venueId, offering.id, offering.name, from, to);
    console.log(`[${venueName}] Offering "${offering.name}": ${sessions.length} upcoming sessions`);
    for (const s of sessions) {
      if (!freshIds.has(s.id)) {
        freshIds.add(s.id);
        fresh.push(s);
      }
    }
  }

  // Preserve previously cached sessions that have now passed (TryBe removes them from the API)
  const past = existingSessions.filter(s => new Date(s.startsAt) < now && !freshIds.has(s.id));
  console.log(`[${venueName}] Retaining ${past.length} cached past sessions`);

  return [...past, ...fresh].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 3);

  let sessions: MomenceSession[];
  let venueName: string;

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

  try {
    if (platform === 'glofox' && hostId === 'lore') {
      const cfg = GLOFOX_CONFIG.loreBathingClub;
      if (new Date() > new Date(cfg.tokenExpiry)) {
        return NextResponse.json({ error: `Glofox token expired on ${cfg.tokenExpiry}` }, { status: 401 });
      }
      sessions = await fetchAllGlofoxSessions(
        cfg.branchId,
        cfg.token,
        cfg.timezone,
        new Date(cfg.operatingSince),
        toDate,
      );
      venueName = cfg.name;
    } else if (platform === 'glofox' && hostId === 'akari') {
      const cfg = GLOFOX_CONFIG.akariSaunas;
      if (!cfg.token) {
        return NextResponse.json({ error: 'Akari Saunas Glofox token not configured. Run: npx tsx scripts/test-akari-saunas.ts' }, { status: 401 });
      }
      if (cfg.tokenExpiry && new Date() > new Date(cfg.tokenExpiry)) {
        return NextResponse.json({ error: `Glofox token expired on ${cfg.tokenExpiry}` }, { status: 401 });
      }
      sessions = await fetchAllGlofoxSessions(
        cfg.branchId,
        cfg.token,
        cfg.timezone,
        new Date(cfg.operatingSince),
        toDate,
      );
      venueName = cfg.name;
    } else if (platform === 'marianatek' && hostId === 'projectmood') {
      const cfg = MARIANATEK_CONFIG.projectMood;
      const from = fromDate.toISOString().split('T')[0];
      const to = toDate.toISOString().split('T')[0];
      sessions = await fetchAllMarianaTekSessions(
        cfg.baseUrl,
        cfg.locationId,
        cfg.regionId,
        cfg.classTypeFilter,
        from,
        to,
        cfg.name,
      );
      venueName = cfg.name;
    } else if (platform === 'trybe' && hostId === 'senseofself') {
      const cfg = TRYBE_CONFIG.senseOfSelf;
      // TryBe only exposes upcoming sessions; fetch 90 days ahead and merge with past cache
      const fetchFrom = new Date();
      const fetchTo = new Date();
      fetchTo.setDate(fetchTo.getDate() + 90);
      sessions = await fetchAllTrybeSessions(
        cfg.venueId,
        cfg.offerings,
        fetchFrom,
        fetchTo,
        cfg.name,
        existingSessions,
      );
      venueName = cfg.name;
    } else {
      return NextResponse.json({ error: `Unsupported platform/hostId: ${platform}/${hostId}` }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
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
    return NextResponse.json({ error: `Failed to write cache: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sessionCount: sessions.length, venueName });
}
