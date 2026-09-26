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
  /**
   * False when this record's `ticketsSold` could not be established and is a
   * placeholder rather than an observation. `sanitizeSessions` drops these so a
   * placeholder zero never reads as an empty session and drags down an average.
   *
   * Set by platforms that publish availability only inside a window: Punchpass
   * hides its "N spots left" badge the moment a session starts, so any session
   * first seen after it began has an unknowable booking count. Undefined means
   * "known", so existing platforms are unaffected.
   */
  utilisationKnown?: boolean;
  /**
   * Where `capacity` came from. Platforms that publish a seat total leave this
   * undefined; anything derived says so, because a derived denominator should
   * be visibly labelled wherever it is surfaced rather than passing as a
   * reported one.
   *
   * `derived-grid` is Navia: the feed publishes staggered entry counters, not
   * sessions, so a sitting's capacity is the sum of its entries' caps.
   */
  capacitySource?: 'reported' | 'derived-grid' | 'max-observed' | 'static-config' | 'unknown';
  /** Where `ticketsSold` came from. */
  soldSource?: 'reported' | 'reported-remaining' | 'derived-grid' | 'unknown';
  /**
   * What a "seat" means at this venue. Only `seats` is comparable to the
   * benchmark averages — `slot-occupancy` counts bookings against a schedule
   * with no seat denominator (private hire, rolling-entry grids).
   */
  measure?: 'seats' | 'concurrent-occupancy' | 'slot-occupancy';
  /** Confidence in `capacity`. Derived denominators are at best 'medium'. */
  confidence?: 'high' | 'medium' | 'low';
  /**
   * Why `capacity` deserves less trust than usual, one caveat per entry, worded
   * for a reader. The report lists each once beside the figures it qualifies,
   * so identical wording across sessions groups into one line.
   */
  capacityNotes?: string[];
  /**
   * A booking count recorded earlier that the platform's own records no longer
   * support. Kept rather than discarded, so preferring the platform's figure
   * stays reversible: restore `ticketsSold` from here to undo it.
   */
  supersededSold?: SupersededSold;
}

export interface SupersededSold {
  /** The count we recorded, which `ticketsSold` has replaced. */
  ticketsSold: number;
  source: 'slot-feed';
  reason: 'cancelled-after-reading' | 'room-full-read-as-sold' | 'no-supporting-reading';
  note: string;
  /** When the decision to prefer the platform's figure was made, YYYY-MM-DD. */
  decidedOn: string;
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
