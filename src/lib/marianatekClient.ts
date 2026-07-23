import type { MarianaTekClass, MarianaTekClassesResponse } from '@/types/marianatek';
import type { MomenceSession } from '@/types/momence';
import { sanitizeSessions, logDataQuality } from '@/lib/utils';

async function fetchClasses(
  baseUrl: string,
  locationId: string,
  regionId: string,
  minStartDate: string,
  maxStartDate: string,
  venueName: string,
  page = 1,
  pageSize = 500,
): Promise<MarianaTekClassesResponse> {
  const url = new URL(`${baseUrl}/classes`);
  url.searchParams.set('min_start_date', minStartDate);
  url.searchParams.set('max_start_date', maxStartDate);
  url.searchParams.set('page_size', String(pageSize));
  url.searchParams.set('page', String(page));
  url.searchParams.set('location', locationId);
  url.searchParams.set('region', regionId);

  console.log(`[${venueName}] Fetching page`, page, ':', url.toString());

  const res = await fetch(url.toString(), { method: 'GET', headers: { accept: 'application/json' } });

  console.log(`[${venueName}] Response:`, res.status, res.statusText);

  if (!res.ok) {
    const text = await res.text();
    console.error(`[${venueName}] Error response body:`, text.slice(0, 500));
    throw new Error(`Mariana Tek API: ${res.status} ${res.statusText}`);
  }
  return res.json();
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
  venueName: string;
  classTypeFilters: readonly string[];
  onProgress?: (sessionsFetched: number, pagesLoaded: number) => void;
}

/**
 * Fetch all classes in the date range, in 90-day chunks with pagination.
 * Calls onProgress after each page so the UI can show loading activity.
 *
 * Chunking matters twice over: Mariana Tek fronts the customer API with a
 * WAF that 403s any request whose min_start_date reaches past the tenant's
 * history horizon (observed ~6 months). Chunks inside the horizon succeed;
 * chunks beyond it are skipped with a warning instead of failing the whole
 * fetch — that history is simply unreachable anonymously.
 */
export async function fetchMarianaTekSessions(params: MarianaTekFetchParams): Promise<MomenceSession[]> {
  const { baseUrl, locationId, regionId, fromDate, toDate, venueName, classTypeFilters, onProgress } = params;

  console.log(`[${venueName}] Starting fetch`, { baseUrl, locationId, regionId, fromDate, toDate, classTypeFilters });

  const CHUNK_MS = 90 * 24 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const seen = new Set<string>();
  const all: MomenceSession[] = [];
  const pageSize = 500;
  let pagesLoaded = 0;

  const rangeEnd = new Date(toDate);
  let cursor = new Date(fromDate);

  while (cursor <= rangeEnd) {
    const chunkEnd = new Date(Math.min(rangeEnd.getTime(), cursor.getTime() + CHUNK_MS));
    const minStr = cursor.toISOString().slice(0, 10);
    const maxStr = chunkEnd.toISOString().slice(0, 10);

    try {
      let page = 1;
      while (true) {
        const data = await fetchClasses(baseUrl, locationId, regionId, minStr, maxStr, venueName, page, pageSize);
        pagesLoaded++;
        const rawResults = data.results || [];
        const filteredClasses = rawResults.filter(
          (c) => c.class_type?.name != null && classTypeFilters.includes(c.class_type.name),
        );
        for (const c of filteredClasses) {
          if (!seen.has(c.id)) {
            seen.add(c.id);
            all.push(classToSession(c));
          }
        }

        const pagination = data.meta?.pagination;
        console.log(`[${venueName}] ${minStr} → ${maxStr} page`, page, ':', rawResults.length, 'classes →', filteredClasses.length, `matching (total: ${all.length})`, pagination ? `| ${JSON.stringify(pagination)}` : '');

        onProgress?.(all.length, pagesLoaded);

        // Stop on empty RAW page, not empty filtered page — a page of only
        // non-matching class types must not truncate the fetch.
        if (!pagination || page >= pagination.pages || rawResults.length === 0) break;
        page++;
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('403')) {
        console.warn(`[${venueName}] Chunk ${minStr} → ${maxStr} rejected (403) — beyond the API's history horizon, skipping`);
      } else {
        console.error(`[${venueName}] Fetch failed:`, err);
        throw err;
      }
    }

    cursor = new Date(chunkEnd.getTime() + DAY_MS);
  }

  console.log(`[${venueName}] Done. Total sessions:`, all.length);
  const { sessions, report } = sanitizeSessions(all);
  logDataQuality('MarianaTek', report);
  return sessions;
}
