import type { MarianaTekClass, MarianaTekClassesResponse } from '@/types/marianatek';
import type { MomenceSession } from '@/types/momence';
import { sanitizeSessions, logDataQuality } from '@/lib/utils';

/**
 * Mariana Tek customer classes API client.
 * Fetches from /api/customer/v1/classes with location/region and date range.
 * No auth in the public classes endpoint used here.
 */
async function fetchClasses(
  baseUrl: string,
  locationId: string,
  regionId: string,
  minStartDate: string,
  maxStartDate: string,
  page = 1,
  pageSize = 500
): Promise<MarianaTekClassesResponse> {
  const url = new URL(`${baseUrl}/classes`);
  url.searchParams.set('min_start_date', minStartDate);
  url.searchParams.set('max_start_date', maxStartDate);
  url.searchParams.set('page_size', String(pageSize));
  url.searchParams.set('page', String(page));
  url.searchParams.set('location', locationId);
  url.searchParams.set('region', regionId);

  const urlString = url.toString();
  console.log('[Project Mood] Fetching page', page, ':', urlString);

  const res = await fetch(urlString, { method: 'GET', headers: { accept: 'application/json' } });

  console.log('[Project Mood] Response:', res.status, res.statusText, 'Content-Type:', res.headers.get('content-type'));

  if (!res.ok) {
    const text = await res.text();
    console.error('[Project Mood] Error response body:', text.slice(0, 500));
    throw new Error(`Mariana Tek API: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data;
}

function classToSession(c: MarianaTekClass): MomenceSession {
  const start = new Date(c.start_datetime);
  const durationMs = (c.class_type?.duration ?? 0) * 60 * 1000;
  const endsAt = new Date(start.getTime() + durationMs);
  const ticketsSold = c.capacity - c.available_spot_count;

  return {
    id: c.id,
    sessionName: c.name,
    startsAt: start.toISOString(),
    endsAt: endsAt.toISOString(),
    durationMinutes: c.class_type?.duration ?? 0,
    capacity: c.capacity,
    ticketsSold: Math.max(0, ticketsSold),
    fixedTicketPrice: c.is_free_class ? 0 : 0,
    location: c.location?.name || c.classroom_name || '',
    inPerson: !c.class_type?.is_live_stream,
    level: undefined,
  };
}

export interface MarianaTekFetchParams {
  baseUrl: string;
  locationId: string;
  regionId: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;
  onProgress?: (sessionsFetched: number, pagesLoaded: number) => void;
}

/**
 * Fetch all classes in the date range, following pagination.
 * Calls onProgress after each page so the UI can show loading activity.
 */
export async function fetchMarianaTekSessions(params: MarianaTekFetchParams): Promise<MomenceSession[]> {
  const { baseUrl, locationId, regionId, fromDate, toDate, onProgress } = params;

  console.log('[Project Mood] Starting fetch', { baseUrl, locationId, regionId, fromDate, toDate });

  const all: MomenceSession[] = [];
  let page = 1;
  const pageSize = 500;

  const OPEN_BATHHOUSE_CLASS_TYPE = 'Open Bathhouse';

  try {
    while (true) {
      const data = await fetchClasses(baseUrl, locationId, regionId, fromDate, toDate, page, pageSize);
      const rawResults = data.results || [];
      const openBathhouseOnly = rawResults.filter(
        (c) => c.class_type?.name === OPEN_BATHHOUSE_CLASS_TYPE
      );
      const sessions = openBathhouseOnly.map(classToSession);
      all.push(...sessions);

      const pagination = data.meta?.pagination;
      console.log('[Project Mood] Page', page, ':', rawResults.length, 'classes →', openBathhouseOnly.length, 'Open Bathhouse (total:', all.length + ')', pagination ? `| pagination: ${JSON.stringify(pagination)}` : '| no meta.pagination');

      onProgress?.(all.length, page);

      if (!pagination || page >= pagination.pages || sessions.length === 0) {
        console.log('[Project Mood] Done. Total sessions:', all.length);
        break;
      }
      page++;
    }
  } catch (err) {
    console.error('[Project Mood] Fetch failed:', err);
    throw err;
  }

  const { sessions, report } = sanitizeSessions(all);
  logDataQuality('MarianaTek', report);
  return sessions;
}
