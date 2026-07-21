/**
 * bsport API client — fetches session data from KEEN Wellbeing (Zurich)
 * via the public booking API at api.production.bsport.io.
 *
 * Data model:
 * - Full history available (back to 2024-11) via date-range pagination
 * - `effectif` = capacity, `validated_booking_count` = confirmed bookings
 * - `date_start` is ISO 8601 with the venue's UTC offset
 * - Pricing is credit-based (1 credit per session); a static CHF per-visit
 *   rate from config is applied instead
 * - Sessions run across multiple establishments (flagship, Utoquai, pop-ups);
 *   the establishment name becomes the session `location`
 */

import type { MomenceSession } from '@/types/momence';
import type { BsportConfig } from '@/config/api';

// ── API types ────────────────────────────────────────────────────────────────

export interface BsportOffer {
  id: number;
  company: number;
  activity: number;
  activity_name: string;
  meta_activity: number;
  establishment: number;
  date_start: string;        // ISO 8601 with offset, e.g. "2026-07-12T18:00:00+02:00"
  duration_minute: number;
  effectif: number;          // capacity
  validated_booking_count: number;
  name_override: string;
  manager_only: boolean;
  full: boolean;
  timezone_name: string;
}

interface BsportOfferResponse {
  count: number;
  page: number;
  next_page: number | null;
  results: BsportOffer[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 200;
const MAX_PAGES = 200;

// ── Mapping ──────────────────────────────────────────────────────────────────

export function bsportOfferToSession(offer: BsportOffer, cfg: BsportConfig): MomenceSession {
  const start = new Date(offer.date_start);
  const end = new Date(start.getTime() + offer.duration_minute * 60000);

  return {
    id: String(offer.id),
    sessionName: offer.name_override || offer.activity_name,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    durationMinutes: offer.duration_minute,
    capacity: offer.effectif,
    ticketsSold: offer.validated_booking_count,
    fixedTicketPrice: cfg.sessionPriceChf,
    location: cfg.establishments[offer.establishment] ?? `Establishment ${offer.establishment}`,
    inPerson: true,
  };
}

// ── Fetcher ──────────────────────────────────────────────────────────────────

async function fetchBsportPage(
  cfg: BsportConfig,
  minDate: string,
  maxDate: string,
  page: number,
): Promise<BsportOfferResponse> {
  const url = new URL(`${cfg.baseUrl}/offer/`);
  url.searchParams.set('company', String(cfg.companyId));
  url.searchParams.set('only_future_strict', 'false');
  url.searchParams.set('min_date', minDate);
  url.searchParams.set('max_date', maxDate);
  url.searchParams.set('activity__in', cfg.activityIds.join(','));
  url.searchParams.set('page_size', String(PAGE_SIZE));
  url.searchParams.set('page', String(page));

  const res = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      origin: 'https://backoffice.bsport.io',
      referer: 'https://backoffice.bsport.io/',
    },
  });

  if (!res.ok) {
    throw new Error(`bsport API: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch all sessions for a bsport venue between two dates.
 * Paginates through the offer endpoint; bsport exposes full history,
 * so no incremental cache merging is needed.
 */
export async function fetchAllBsportSessions(
  cfg: BsportConfig,
  fromDate: Date,
  toDate: Date,
  onProgress?: (count: number) => void,
): Promise<MomenceSession[]> {
  const minDate = fromDate.toISOString().slice(0, 10);
  const maxDate = toDate.toISOString().slice(0, 10);

  const sessions: MomenceSession[] = [];
  const seenIds = new Set<number>();
  let page = 1;

  while (true) {
    const response = await fetchBsportPage(cfg, minDate, maxDate, page);

    for (const offer of response.results ?? []) {
      if (offer.manager_only || seenIds.has(offer.id)) continue;
      seenIds.add(offer.id);
      sessions.push(bsportOfferToSession(offer, cfg));
    }

    onProgress?.(sessions.length);
    console.log(`[bsport/${cfg.name}] Page ${page}: ${response.results?.length ?? 0} offers (total: ${sessions.length}/${response.count})`);

    if (response.next_page === null || page >= MAX_PAGES) break;
    page = response.next_page;
  }

  return sessions.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
