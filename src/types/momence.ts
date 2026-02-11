// Momence API Types

export interface MomenceSession {
  id: string;
  sessionName: string;
  startsAt: string; // ISO date string
  endsAt: string; // ISO date string
  durationMinutes: number;
  capacity: number;
  ticketsSold: number;
  fixedTicketPrice: number;
  location: string;
  inPerson: boolean;
  level?: string;
  isCancelled?: boolean;
}

export interface MomenceSessionsResponse {
  sessions: MomenceSession[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SessionsQueryParams {
  hostId: string;
  startsAtFrom: string; // ISO date string
  startsAtTo: string; // ISO date string
  page?: number;
  pageSize?: number;
}

// Computed metrics types
export interface SessionMetrics {
  totalSessions: number;
  totalTicketsSold: number;
  totalCapacity: number;
  avgUtilisation: number;
  totalRevenue: number;
  avgRevenuePerVisit: number;
  avgRevenuePerSession: number;
  sessionsPerDay: number;
  sessionsPerWeek: number;
  operatingSince: string;
}

export interface MonthlyData {
  month: string;
  year: number;
  sessions: number;
  ticketsSold: number;
  capacity: number;
  utilisation: number;
  revenue: number;
}

export interface TimeSlotData {
  slot: string;
  avgTickets: number;
  capacity: number;
  utilisation: number;
  utilisationBand: 'High' | 'Medium' | 'Low';
}

export interface VenueConfig {
  venueName: string;
  sessionType: string;
  duration: number;
  price: number;
  capacity: number;
  sessionsPerDay: number;
  operatingHours: string;
}

export interface ClassTypeData {
  className: string;
  sessionCount: number;
  totalVisitors: number;
  avgVisitorsPerSession: number;
  totalCapacity: number;
  avgUtilisation: number;
  totalRevenue: number;
}
