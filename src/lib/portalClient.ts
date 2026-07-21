import type { MomenceSession } from '@/types/momence';
import { sanitizeSessions, logDataQuality } from '@/lib/utils';

interface PortalAvailabilityItem {
  id: string;
  name: string;
  title: string;
  sessionStartUtc: string;
  sessionEndUtc: string;
  location: {
    id: string;
    name: string;
    address: string;
    type: string;
  };
  totalCapacity: number;
  remainingCapacity: number;
  bookedCount: number;
  price: number | null;
  currency: string | null;
  memberPrice: number | null;
  nonMemberPrice: number | null;
  sessionType: number;
  mainImage: string | null;
  description: string | null;
}

interface PortalAvailabilityResponse {
  data: PortalAvailabilityItem[];
  success?: boolean;
  message?: string;
}

interface PortalLocation {
  wixLocationId: string;
  name: string;
  operatingSince: string;
}

function toSession(item: PortalAvailabilityItem): MomenceSession {
  const start = new Date(item.sessionStartUtc);
  const end = new Date(item.sessionEndUtc);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60_000);

  return {
    id: item.id,
    sessionName: item.name || 'Temperature Session',
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    durationMinutes,
    capacity: item.totalCapacity,
    ticketsSold: Math.max(0, item.bookedCount),
    fixedTicketPrice: 0,
    location: item.location.name,
    inPerson: true,
  };
}

/**
 * Fetch a single day's availability for one location.
 * The Portal API caps responses at 50 items, but a single day has ~15 sessions.
 */
async function fetchDay(
  baseUrl: string,
  wixLocationId: string,
  date: Date,
): Promise<PortalAvailabilityItem[]> {
  const startUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 7, 0, 0));
  const endUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() + 1, 6, 59, 59, 999));

  const res = await fetch(`${baseUrl}/bookings/getAvailabilityList`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionType: 0,
      locationWixId: wixLocationId,
      startDateUtc: startUtc.toISOString(),
      endDateUtc: endUtc.toISOString(),
    }),
  });

  if (!res.ok) {
    throw new Error(`Portal API: ${res.status} ${res.statusText}`);
  }

  const data: PortalAvailabilityResponse = await res.json();
  return data.data ?? [];
}

/** Run async tasks with bounded concurrency. */
async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

/**
 * Fetch all sessions across all Portal locations for the given date range.
 * Iterates day-by-day per location to stay under the 50-item response cap.
 * Uses concurrent requests (10 at a time) to keep total fetch time reasonable.
 */
export async function fetchPortalSessions(
  baseUrl: string,
  locations: readonly PortalLocation[],
  fromDate: string,
  toDate: string,
  venueName: string,
  onProgress?: (sessionCount: number) => void,
): Promise<MomenceSession[]> {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  // Build list of all (location, date) pairs to fetch
  const tasks: { loc: PortalLocation; date: Date }[] = [];
  for (const loc of locations) {
    const locFrom = new Date(Math.max(from.getTime(), new Date(loc.operatingSince).getTime()));
    const cursor = new Date(locFrom);
    while (cursor <= to) {
      tasks.push({ loc, date: new Date(cursor) });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  console.log(`[${venueName}] Fetching ${tasks.length} day-location pairs across ${locations.length} locations`);

  let totalSoFar = 0;
  const itemResults = await mapConcurrent(tasks, 10, async ({ loc, date }) => {
    const items = await fetchDay(baseUrl, loc.wixLocationId, date);
    totalSoFar += items.length;
    onProgress?.(totalSoFar);
    return items;
  });

  // Only keep sessions from configured location records, matched by Wix id —
  // never by name: a single record can be renamed over time (Bozeman's record
  // served as 'Lyons' from Nov 2025 to mid-Jan 2026), and each session's
  // location.name is the authoritative label for where it actually ran.
  const allowedIds = new Set(locations.map(l => l.wixLocationId));
  const all = itemResults.flat().filter(i => allowedIds.has(i.location.id)).map(toSession);
  console.log(`[${venueName}] Total: ${all.length} sessions (filtered to configured location ids)`);

  const { sessions, report } = sanitizeSessions(all);
  logDataQuality('Portal', report);
  return sessions;
}
