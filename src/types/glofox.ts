// Glofox API Types

export interface GlofoxEvent {
  _id: string;
  namespace: string;
  branch_id: string;
  program_id: string;
  name: string;
  description?: string;
  time_start: number; // Unix timestamp
  duration: number; // minutes
  size: number; // capacity
  booked: number; // tickets sold
  waiting: number;
  level?: string;
  type?: string;
  facility?: GlofoxFacility;
  trainers?: GlofoxTrainer[];
  private: boolean;
}

export interface GlofoxFacility {
  _id: string;
  name: string;
}

export interface GlofoxTrainer {
  _id: string;
  first_name: string;
  last_name: string;
}

export interface GlofoxEventsResponse {
  object: string;
  page: number;
  limit: number;
  has_more: boolean;
  total_count: number;
  data: GlofoxEvent[];
}

// Normalized session format (matches MomenceSession structure)
export interface GlofoxSession {
  id: string;
  sessionName: string;
  startsAt: string; // ISO date
  endsAt: string;
  durationMinutes: number;
  capacity: number;
  ticketsSold: number;
  fixedTicketPrice: number;
  location: string;
  inPerson: boolean;
  level?: string;
}

export interface GlofoxVenueConfig {
  branchId: string;
  namespace: string;
  name: string;
  timezone: string;
  token: string;
  tokenExpiry: string;
}

export interface GlofoxQueryParams {
  branchId: string;
  token: string;
  timezone?: string;
  startDate: Date;
  endDate: Date;
  page?: number;
  limit?: number;
}
