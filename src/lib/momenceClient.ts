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
    queryParams.set('pageSize', String(params.pageSize || API_CONFIG.defaultPageSize));

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
   * Transform API response to typed format
   */
  private transformResponse(data: any, params: SessionsQueryParams): MomenceSessionsResponse {
    // Handle response with 'payload' array (Momence readonly API format)
    if (data.payload && Array.isArray(data.payload)) {
      return {
        sessions: data.payload.map(this.transformSession),
        totalCount: data.total || data.payload.length,
        page: (data.page ?? 0) + 1,
        pageSize: data.pageSize || params.pageSize || API_CONFIG.defaultPageSize,
        totalPages: data.totalPages || Math.ceil((data.total || data.payload.length) / (params.pageSize || API_CONFIG.defaultPageSize)),
      };
    }

    // Handle paginated response with 'data' array
    if (data.data && Array.isArray(data.data)) {
      return {
        sessions: data.data.map(this.transformSession),
        totalCount: data.total || data.data.length,
        page: (data.page || 0) + 1, // Convert 0-indexed to 1-indexed
        pageSize: data.pageSize || params.pageSize || API_CONFIG.defaultPageSize,
        totalPages: data.totalPages || Math.ceil((data.total || data.data.length) / (params.pageSize || API_CONFIG.defaultPageSize)),
      };
    }

    // Handle if data has 'sessions' key
    if (data.sessions && Array.isArray(data.sessions)) {
      return {
        sessions: data.sessions.map(this.transformSession),
        totalCount: data.total || data.totalCount || data.sessions.length,
        page: (data.page || 0) + 1,
        pageSize: data.pageSize || params.pageSize || API_CONFIG.defaultPageSize,
        totalPages: data.totalPages || Math.ceil((data.total || data.sessions.length) / (params.pageSize || API_CONFIG.defaultPageSize)),
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
    // Calculate tickets sold from registrations/attendees
    const ticketsSold = session.registrationsCount ?? session.attendeesCount ?? session.ticketsSold ?? session.bookedCount ?? 0;
    
    // Get price - handle various formats
    const price = session.price ?? session.fixedTicketPrice ?? session.ticketPrice ?? 0;
    
    return {
      id: session.id || session._id || String(Math.random()),
      sessionName: session.name || session.sessionName || session.title || 'Unknown',
      startsAt: session.startDate || session.startsAt || session.startTime || session.start,
      endsAt: session.endDate || session.endsAt || session.endTime || session.end,
      durationMinutes: session.duration || session.durationMinutes || 60,
      capacity: session.spotsTotal ?? session.capacity ?? session.maxAttendees ?? 0,
      ticketsSold,
      fixedTicketPrice: price,
      location: session.locationName || session.location || session.venue || '',
      inPerson: session.inPerson !== false,
      level: session.level || session.type || session.sessionType,
    };
  }
}

// Export singleton instance
export const momenceClient = new MomenceClient();

// Export class for custom instances
export { MomenceClient };
