import type { MomenceSession } from '@/types/momence';
import { sanitizeSessions, logDataQuality } from '@/lib/utils';

interface XtraScheduleItem {
  _id: string;
  date: string;        // "2026-03-06"
  time: number;        // 6 = 6:00 AM, 6.5 = 6:30 AM (24-hour decimal)
  capacity: number;
  numReservations: number;
  hidden: boolean;
  peak: boolean;
  specialSession?: {
    identifier: string;
    title: string;
    description: string;
  };
}

interface XtraScheduleResponse {
  success: boolean;
  schedules: XtraScheduleItem[];
}

interface XtraLocation {
  siteId: string;
  name: string;
  operatingSince: string;
}

/**
 * Convert a decimal time (e.g. 6.5) into hours and minutes.
 */
function decimalTimeToHM(time: number): { hours: number; minutes: number } {
  const hours = Math.floor(time);
  const minutes = Math.round((time - hours) * 60);
  return { hours, minutes };
}

function toSession(
  item: XtraScheduleItem,
  locationName: string,
  timezone: string,
): MomenceSession {
  const { hours, minutes } = decimalTimeToHM(item.time);

  // Build an ISO date string in the venue's local time
  // item.date is "YYYY-MM-DD", time is in local 24-hour
  const localStart = new Date(`${item.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

  // Sessions are 30 minutes (each time slot is 0.5 apart)
  const durationMinutes = 30;
  const localEnd = new Date(localStart.getTime() + durationMinutes * 60_000);

  const sessionName = item.specialSession?.title ?? 'Sauna Session';

  return {
    id: item._id,
    sessionName,
    startsAt: localStart.toISOString(),
    endsAt: localEnd.toISOString(),
    durationMinutes,
    capacity: item.capacity,
    ticketsSold: Math.max(0, item.numReservations),
    fixedTicketPrice: 0,
    location: locationName,
    inPerson: true,
  };
}

/**
 * Fetch a single day's schedule for one Xtra Clubs location.
 */
async function fetchDay(
  baseUrl: string,
  siteId: string,
  date: string, // "YYYY-MM-DD"
): Promise<XtraScheduleItem[]> {
  const res = await fetch(`${baseUrl}/schedule/available?site=${siteId}&date=${date}`, {
    headers: { accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Xtra Clubs API: ${res.status} ${res.statusText}`);
  }

  const data: XtraScheduleResponse = await res.json();
  return data.schedules ?? [];
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
 * Fetch all sessions across all Xtra Clubs locations for the given date range.
 * Iterates day-by-day per location using bounded concurrency.
 */
export async function fetchXtraClubsSessions(
  baseUrl: string,
  locations: readonly XtraLocation[],
  fromDate: string,
  toDate: string,
  venueName: string,
  timezone: string,
  onProgress?: (sessionCount: number) => void,
): Promise<MomenceSession[]> {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  // Build list of all (location, date) pairs to fetch
  const tasks: { loc: XtraLocation; dateStr: string }[] = [];
  for (const loc of locations) {
    const locFrom = new Date(Math.max(from.getTime(), new Date(loc.operatingSince).getTime()));
    const cursor = new Date(locFrom);
    while (cursor <= to) {
      const dateStr = cursor.toISOString().split('T')[0];
      tasks.push({ loc, dateStr });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  console.log(`[${venueName}] Fetching ${tasks.length} day-location pairs across ${locations.length} locations`);

  let totalSoFar = 0;
  const results = await mapConcurrent(tasks, 10, async ({ loc, dateStr }) => {
    const items = await fetchDay(baseUrl, loc.siteId, dateStr);
    // Filter out hidden sessions
    const sessions = items.filter(s => !s.hidden).map(s => toSession(s, loc.name, timezone));
    totalSoFar += sessions.length;
    onProgress?.(totalSoFar);
    return sessions;
  });

  const all = results.flat();
  console.log(`[${venueName}] Total: ${all.length} sessions`);

  const { sessions, report } = sanitizeSessions(all);
  logDataQuality('Xtra Clubs', report);
  return sessions;
}
