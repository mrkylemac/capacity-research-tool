import { API_CONFIG } from '@/config/api';
import type { MomenceSession, MomenceSessionsResponse, SessionsQueryParams } from '@/types/momence';

export interface HostInfo {
  id: number;
  name: string;
  currency: string;
  countryCode: string;
  timeZone: string;
  industry: string;
  profileImage: string | null;
}

/**
 * Momence API Client
 * Handles all API calls to the Momence readonly API
 */
class MomenceClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch host info from the Momence API
   */
  async fetchHostInfo(hostId: string): Promise<HostInfo | null> {
    const url = `${this.baseUrl}/${hostId}/host-schedule`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('Could not fetch host info:', response.status);
        return null;
      }

      const data = await response.json();
      
      if (data.host) {
        return {
          id: data.host.id,
          name: data.host.name || 'Unknown Venue',
          currency: data.host.currency || 'aud',
          countryCode: data.host.countryCode || 'AU',
          timeZone: data.host.timeZone || 'Australia/Melbourne',
          industry: data.host.industry?.name || 'Wellness',
          profileImage: data.host.profileImage || data.host.logo || data.host.image || null,
        };
      }
      
      return null;
    } catch (error) {
      console.warn('Error fetching host info:', error);
      return null;
    }
  }

  /**
   * Fetch sessions from the Momence API
   */
  async fetchSessions(params: SessionsQueryParams): Promise<MomenceSessionsResponse> {
    const queryParams = new URLSearchParams();
    
    // Add session types
    API_CONFIG.sessionTypes.forEach(type => {
      queryParams.append('sessionTypes[]', type);
    });
    
    // Add date range
    queryParams.set('fromDate', params.startsAtFrom);
    if (params.startsAtTo) {
      queryParams.set('toDate', params.startsAtTo);
    }
    
    // Pagination (0-indexed)
    queryParams.set('page', String((params.page || 1) - 1));
    queryParams.set('pageSize', String(params.pageSize || API_CONFIG.pageSize));

    const url = `${this.baseUrl}/${params.hostId}/host-schedule/sessions?${queryParams.toString()}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.transformResponse(data, params);
    } catch (error) {
      console.error('Momence API Error:', error);
      throw error;
    }
  }

  /**
   * Transform API response to typed format.
   * Note: cancelled sessions are kept here to preserve page counts for pagination.
   * They are filtered out by sanitizeSessions() after all pages are fetched.
   */
  private transformResponse(data: any, params: SessionsQueryParams): MomenceSessionsResponse {
    // Handle response with 'payload' array (Momence readonly API format).
    // Pagination metadata moved into a nested `pagination` object
    // ({ page, pageSize, totalCount }) — fall back to the legacy top-level
    // fields for older response shapes.
    if (data.payload && Array.isArray(data.payload)) {
      const pagination = data.pagination || {};
      const pageSize = pagination.pageSize || data.pageSize || params.pageSize || API_CONFIG.pageSize;
      const totalCount = pagination.totalCount ?? data.total ?? data.payload.length;
      return {
        sessions: data.payload.map(this.transformSession),
        totalCount,
        page: (pagination.page ?? data.page ?? 0) + 1,
        pageSize,
        totalPages: data.totalPages || Math.ceil(totalCount / pageSize),
      };
    }

    // Handle paginated response with 'data' array
    if (data.data && Array.isArray(data.data)) {
      return {
        sessions: data.data.map(this.transformSession),
        totalCount: data.total || data.data.length,
        page: (data.page || 0) + 1,
        pageSize: data.pageSize || params.pageSize || API_CONFIG.pageSize,
        totalPages: data.totalPages || Math.ceil((data.total || data.data.length) / (params.pageSize || API_CONFIG.pageSize)),
      };
    }

    // Handle if data has 'sessions' key
    if (data.sessions && Array.isArray(data.sessions)) {
      return {
        sessions: data.sessions.map(this.transformSession),
        totalCount: data.total || data.totalCount || data.sessions.length,
        page: (data.page || 0) + 1,
        pageSize: data.pageSize || params.pageSize || API_CONFIG.pageSize,
        totalPages: data.totalPages || Math.ceil((data.total || data.sessions.length) / (params.pageSize || API_CONFIG.pageSize)),
      };
    }

    // Handle if data is an array directly
    if (Array.isArray(data)) {
      return {
        sessions: data.map(this.transformSession),
        totalCount: data.length,
        page: params.page || 1,
        pageSize: params.pageSize || API_CONFIG.pageSize,
        totalPages: 1,
      };
    }

    // Fallback
    return {
      sessions: [],
      totalCount: 0,
      page: 1,
      pageSize: params.pageSize || API_CONFIG.pageSize,
      totalPages: 0,
    };
  }

  /**
   * Transform a single session to typed format
   */
  private transformSession(session: any): MomenceSession {
    // Prefer API's own ticketsSold (actual sales) over registrationsCount (may include cancellations/no-shows)
    const ticketsSold = session.ticketsSold ?? session.registrationsCount ?? session.attendeesCount ?? session.bookedCount ?? 0;

    // Prefer fixedTicketPrice (API returns this reliably alongside price: null)
    const price = session.fixedTicketPrice ?? session.price ?? session.ticketPrice ?? 0;
    const capacity = session.spotsTotal ?? session.capacity ?? session.maxAttendees ?? 0;

    return {
      id: session.id || session._id || String(Math.random()),
      sessionName: session.name || session.sessionName || session.title || 'Unknown',
      startsAt: session.startDate || session.startsAt || session.startTime || session.start || '',
      endsAt: session.endDate || session.endsAt || session.endTime || session.end || '',
      durationMinutes: session.duration || session.durationMinutes || 60,
      capacity,
      ticketsSold,
      fixedTicketPrice: price,
      location: session.locationName || session.location || session.venue || '',
      inPerson: session.inPerson !== false,
      level: session.level || session.type || session.sessionType,
      isCancelled: session.isCancelled === true,
    };
  }
}

// Export singleton instance
export const momenceClient = new MomenceClient();

// Export class for custom instances
export { MomenceClient };

/**
 * Flag the timetable a venue loaded before it started selling on Momence.
 *
 * Momence keeps serving sessions from before a venue went live, and every one
 * of them comes back with `ticketsSold: 0` and full remaining spots. Sól Saunas
 * is the case in point: 2,190 sessions between 10 Aug and 28 Oct 2025, one
 * session name, one capacity, one price, 28 a day, not a single booking, then
 * the real timetable and real bookings from 2 Nov 2025. The venue opened in
 * November; the rest was a schedule sitting in the system.
 *
 * Counted as real, those zeros deflate every rate that divides by time. Sól's
 * "12 months" read 450 visits/week against 634 for "3 months", and seat
 * occupancy 23% against 39%, because a sixth of the window held sessions that
 * could not report a booking.
 *
 * The rule: within a location, a session that starts before that location's
 * first booked session has no booking data, so it carries
 * `utilisationKnown: false` and drops out of every average. Locations are
 * treated separately because a venue can open a second site later.
 *
 * Two guards keep an honestly empty venue honest:
 *   - a location with no bookings at all is left alone, since nothing
 *     distinguishes "never published" from "nobody came"
 *   - the first booked session must have already run, so a brand new venue
 *     holding only forward bookings keeps its real zero history
 */
export function markPreLaunchSessions(
  sessions: MomenceSession[],
  now: number = Date.now(),
): MomenceSession[] {
  const locationOf = (s: MomenceSession) => (s.location ?? '').trim();

  // Earliest session per location that has already run and recorded a booking.
  const firstBooked = new Map<string, number>();
  for (const s of sessions) {
    if (!(s.ticketsSold > 0)) continue;
    const ts = new Date(s.startsAt).getTime();
    if (!Number.isFinite(ts) || ts > now) continue;
    const loc = locationOf(s);
    const prev = firstBooked.get(loc);
    if (prev === undefined || ts < prev) firstBooked.set(loc, ts);
  }
  if (firstBooked.size === 0) return sessions;

  return sessions.map(s => {
    if (s.utilisationKnown === false) return s;
    const cutoff = firstBooked.get(locationOf(s));
    if (cutoff === undefined) return s;
    const ts = new Date(s.startsAt).getTime();
    if (!Number.isFinite(ts) || ts >= cutoff) return s;
    return { ...s, utilisationKnown: false as const };
  });
}
