import { addDays, addHours, format, startOfDay } from 'date-fns';
import type { MomenceSession, MomenceSessionsResponse } from '@/types/momence';

/**
 * Generate mock session data for development/demo purposes
 * This simulates what the Momence API would return
 */
export function generateMockSessions(
  fromDate: string,
  toDate: string,
  page: number = 1,
  pageSize: number = 50
): MomenceSessionsResponse {
  const sessions: MomenceSession[] = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);
  
  let currentDate = startOfDay(start);
  let sessionId = 1;

  // Generate sessions for each day in range
  while (currentDate <= end) {
    // Skip some days randomly (simulating closed days)
    if (Math.random() > 0.15) {
      // Generate 4-8 sessions per day
      const sessionsPerDay = Math.floor(Math.random() * 5) + 4;
      
      // Start times between 5:30 and 20:30
      const startHours = [5.5, 6.5, 7.5, 9, 10.5, 14, 16, 17.5, 18.5, 19.5, 20.5];
      const selectedHours = startHours
        .sort(() => Math.random() - 0.5)
        .slice(0, sessionsPerDay);
      
      selectedHours.forEach(hour => {
        const sessionStart = addHours(currentDate, hour);
        const sessionEnd = addHours(sessionStart, 1);
        
        // Vary utilisation by time of day (morning/evening higher)
        const isPeakTime = hour < 8 || hour >= 17;
        const baseUtilisation = isPeakTime ? 0.75 : 0.5;
        const variance = (Math.random() - 0.5) * 0.4;
        const utilisation = Math.max(0.1, Math.min(1, baseUtilisation + variance));
        
        const capacity = 12;
        const ticketsSold = Math.round(capacity * utilisation);

        sessions.push({
          id: `session-${sessionId++}`,
          sessionName: 'Sauna & Ice',
          startsAt: sessionStart.toISOString(),
          endsAt: sessionEnd.toISOString(),
          durationMinutes: 60,
          capacity,
          ticketsSold,
          fixedTicketPrice: 35,
          location: 'Aalto Brunswick',
          inPerson: true,
          level: 'Open',
        });
      });
    }
    
    currentDate = addDays(currentDate, 1);
  }

  // Sort by start time
  sessions.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  // Paginate
  const totalCount = sessions.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const paginatedSessions = sessions.slice(startIndex, startIndex + pageSize);

  return {
    sessions: paginatedSessions,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}
