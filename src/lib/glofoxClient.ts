import type {
  GlofoxEvent,
  GlofoxEventsResponse,
  GlofoxSession,
  GlofoxQueryParams
} from '@/types/glofox';
import { GLOFOX_CONFIG } from '@/config/api';

const GLOFOX_API_BASE = 'https://api.glofox.com/2.0';

// CORS proxies to try in order — Glofox API doesn't allow cross-origin requests
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

/**
 * Check if the Glofox guest token has expired
 */
function checkTokenExpiry(): void {
  const expiry = GLOFOX_CONFIG.loreBathingClub.tokenExpiry;
  if (new Date() > new Date(expiry)) {
    throw new Error(
      `Glofox guest token expired on ${expiry}. ` +
      `Visit the Lore Bathing Club booking page to obtain a new token.`
    );
  }
}

/**
 * Glofox API Client
 * Uses guest JWT token from public booking widget.
 * Routes through a CORS proxy since the Glofox API doesn't allow
 * cross-origin requests from third-party domains.
 */
class GlofoxClient {
  /**
   * Fetch events from Glofox API
   */
  async fetchEvents(params: GlofoxQueryParams): Promise<GlofoxEventsResponse> {
    checkTokenExpiry();

    const start = Math.floor(params.startDate.getTime() / 1000);
    const end = Math.floor(params.endDate.getTime() / 1000);

    const url = new URL(`${GLOFOX_API_BASE}/events`);
    url.searchParams.set('start', start.toString());
    url.searchParams.set('end', end.toString());
    url.searchParams.set('include', 'trainers,facility,program');
    url.searchParams.set('page', (params.page || 1).toString());
    url.searchParams.set('limit', (params.limit || 50).toString());
    url.searchParams.set('private', 'false');
    url.searchParams.set('sort_by', 'time_start');

    const headers: Record<string, string> = {
      'accept': 'application/json',
      'authorization': `Bearer ${params.token}`,
      'x-glofox-branch-id': params.branchId,
      'x-glofox-branch-timezone': params.timezone || 'America/New_York',
      'x-glofox-source': 'webportal',
    };

    const targetUrl = url.toString();

    // Try direct request first (works on localhost / same-origin)
    try {
      const directResponse = await fetch(targetUrl, { method: 'GET', headers });
      if (directResponse.ok) {
        return directResponse.json();
      }
    } catch {
      // Direct request failed (likely CORS) — fall through to proxies
      console.log('Direct Glofox request failed, trying CORS proxies...');
    }

    // Try CORS proxies in order
    let lastError: Error | null = null;
    for (const makeProxyUrl of CORS_PROXIES) {
      const proxiedUrl = makeProxyUrl(targetUrl);
      try {
        const response = await fetch(proxiedUrl, { method: 'GET', headers });
        if (response.ok) {
          return response.json();
        }
        lastError = new Error(`Glofox API Error: ${response.status} ${response.statusText}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.log(`CORS proxy failed (${proxiedUrl}):`, lastError.message);
      }
    }

    throw new Error(
      `Unable to reach Glofox API — blocked by CORS and all proxies failed. ` +
      `${lastError?.message || 'Unknown error'}. ` +
      `Try running locally (localhost) or set up a server-side proxy.`
    );
  }

  /**
   * Fetch all events with pagination
   */
  async fetchAllEvents(params: Omit<GlofoxQueryParams, 'page' | 'limit'>): Promise<GlofoxEvent[]> {
    const allEvents: GlofoxEvent[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const response = await this.fetchEvents({
        ...params,
        page,
        limit,
      });

      allEvents.push(...response.data);
      
      console.log(`Glofox page ${page}: ${response.data.length} events (total: ${allEvents.length}/${response.total_count})`);

      if (!response.has_more || page >= 100) break;
      page++;
    }

    return allEvents;
  }

  /**
   * Transform Glofox events to normalized session format (matches MomenceSession)
   */
  transformToSessions(events: GlofoxEvent[]): GlofoxSession[] {
    return events.map(event => {
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
        fixedTicketPrice: 0, // Glofox doesn't expose pricing in this endpoint
        location: event.facility?.name || '',
        inPerson: true,
        level: event.level,
      };
    });
  }

  /**
   * Convenience method: fetch and transform to sessions
   */
  async fetchSessions(params: Omit<GlofoxQueryParams, 'page' | 'limit'>): Promise<GlofoxSession[]> {
    const events = await this.fetchAllEvents(params);
    return this.transformToSessions(events);
  }
}

// Export singleton
export const glofoxClient = new GlofoxClient();
export { GlofoxClient };
