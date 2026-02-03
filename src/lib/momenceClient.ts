import { API_CONFIG } from '@/config/api';
import type { MomenceSession, MomenceSessionsResponse, SessionsQueryParams } from '@/types/momence';

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
   * Fetch sessions from the Momence API
   */
  async fetchSessions(params: SessionsQueryParams): Promise<MomenceSessionsResponse> {
    const queryParams = new URLSearchParams({
      hostId: params.hostId,
      startsAtFrom: params.startsAtFrom,
      startsAtTo: params.startsAtTo,
      page: String(params.page || 1),
      pageSize: String(params.pageSize || API_CONFIG.defaultPageSize),
    });

    const url = `${this.baseUrl}/sessions?${queryParams.toString()}`;
    
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
   * Transform API response to typed format
   * Adjust this based on actual Momence API response structure
   */
  private transformResponse(data: any, params: SessionsQueryParams): MomenceSessionsResponse {
    // Handle if data is already in expected format
    if (data.sessions && Array.isArray(data.sessions)) {
      return {
        sessions: data.sessions.map(this.transformSession),
        totalCount: data.totalCount || data.sessions.length,
        page: data.page || params.page || 1,
        pageSize: data.pageSize || params.pageSize || API_CONFIG.defaultPageSize,
        totalPages: data.totalPages || Math.ceil((data.totalCount || data.sessions.length) / (params.pageSize || API_CONFIG.defaultPageSize)),
      };
    }

    // Handle if data is an array directly
    if (Array.isArray(data)) {
      return {
        sessions: data.map(this.transformSession),
        totalCount: data.length,
        page: params.page || 1,
        pageSize: params.pageSize || API_CONFIG.defaultPageSize,
        totalPages: 1,
      };
    }

    // Fallback
    return {
      sessions: [],
      totalCount: 0,
      page: 1,
      pageSize: params.pageSize || API_CONFIG.defaultPageSize,
      totalPages: 0,
    };
  }

  /**
   * Transform a single session to typed format
   */
  private transformSession(session: any): MomenceSession {
    return {
      id: session.id || session._id || String(Math.random()),
      sessionName: session.sessionName || session.name || session.title || 'Sauna & Ice',
      startsAt: session.startsAt || session.startTime || session.start,
      endsAt: session.endsAt || session.endTime || session.end,
      durationMinutes: session.durationMinutes || session.duration || 60,
      capacity: session.capacity || session.maxAttendees || 12,
      ticketsSold: session.ticketsSold || session.attendees || session.bookedCount || 0,
      fixedTicketPrice: session.fixedTicketPrice || session.price || 35,
      location: session.location || session.venue || 'Aalto',
      inPerson: session.inPerson !== false,
      level: session.level || session.type,
    };
  }
}

// Export singleton instance
export const momenceClient = new MomenceClient();

// Export class for custom instances
export { MomenceClient };
