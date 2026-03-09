import type {
  GlofoxEvent,
  GlofoxEventsResponse,
  GlofoxSession,
  GlofoxQueryParams,
} from '@/types/glofox';
import { sanitizeSessions, logDataQuality } from '@/lib/utils';

const GLOFOX_PROXY_EVENTS = '/api/glofox/events';

function checkTokenExpiry(tokenExpiry: string): void {
  if (new Date() > new Date(tokenExpiry)) {
    throw new Error(
      `Glofox guest token expired on ${tokenExpiry}. Obtain a new guest token.`,
    );
  }
}

/**
 * Glofox API Client
 * Uses server-side proxy (/api/glofox/events) to avoid CORS.
 */
class GlofoxClient {
  async fetchEvents(params: GlofoxQueryParams): Promise<GlofoxEventsResponse> {
    checkTokenExpiry(params.tokenExpiry);

    const start = Math.floor(params.startDate.getTime() / 1000);
    const end = Math.floor(params.endDate.getTime() / 1000);

    const url = new URL(GLOFOX_PROXY_EVENTS, window.location.origin);
    url.searchParams.set('start', start.toString());
    url.searchParams.set('end', end.toString());
    url.searchParams.set('include', 'trainers,facility,program');
    url.searchParams.set('page', (params.page || 1).toString());
    url.searchParams.set('limit', (params.limit || 50).toString());
    url.searchParams.set('private', 'false');
    url.searchParams.set('sort_by', 'time_start');

    const headers: Record<string, string> = {
      accept: 'application/json',
      authorization: `Bearer ${params.token}`,
      'x-glofox-branch-id': params.branchId,
      'x-glofox-branch-timezone': params.timezone || 'America/New_York',
      'x-glofox-source': 'webportal',
    };

    const res = await fetch(url.toString(), { method: 'GET', headers });
    if (!res.ok) throw new Error(`Glofox API Error: ${res.status} ${res.statusText}`);
    return res.json();
  }

  async fetchAllEvents(params: Omit<GlofoxQueryParams, 'page' | 'limit'>): Promise<GlofoxEvent[]> {
    const allEvents: GlofoxEvent[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const response = await this.fetchEvents({ ...params, page, limit });
      allEvents.push(...response.data);
      console.log(`Glofox page ${page}: ${response.data.length} events (total: ${allEvents.length}/${response.total_count})`);
      if (!response.has_more || page >= 100) break;
      page++;
    }

    return allEvents;
  }

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
        fixedTicketPrice: 0,
        location: event.facility?.name || '',
        inPerson: true,
        level: event.level,
      };
    });
  }

  async fetchSessions(params: Omit<GlofoxQueryParams, 'page' | 'limit'>): Promise<GlofoxSession[]> {
    const events = await this.fetchAllEvents(params);
    const raw = this.transformToSessions(events);
    const { sessions, report } = sanitizeSessions(raw);
    logDataQuality('Glofox', report);
    return sessions as GlofoxSession[];
  }
}

export const glofoxClient = new GlofoxClient();
export { GlofoxClient };
