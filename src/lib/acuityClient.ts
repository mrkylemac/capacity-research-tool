/**
 * Acuity Scheduling client — fetches class availability from the public
 * scheduling widget API. Uses the same POST endpoint the scheduling SPA calls.
 *
 * Data model:
 * - Future sessions only (past sessions are removed by the API)
 * - `slotsAvailable` = remaining spots → ticketsSold = classSize - slotsAvailable
 * - Price comes from the static appointment type config (not per-session)
 * - Pagination: server caps at 15 results per page regardless of requested limit
 *
 * Incremental caching: like TryBe, we merge fresh (future) sessions with
 * previously cached past sessions to build history over time.
 */

import type { MomenceSession } from '@/types/momence';
import type { AcuityConfig } from '@/config/api';

// ── API types ────────────────────────────────────────────────────────────────

interface AcuityClassSlot {
  appointmentTypeId: number;
  calendarId: number;
  time: string;  // ISO 8601 with timezone offset, e.g. "2026-03-06T07:00:00+11:00"
  slotsAvailable: number;
  seriesClassCount: number | null;
}

/** Response is keyed by date string (YYYY-MM-DD), each value is an array of class slots */
type AcuityAvailabilityResponse = Record<string, AcuityClassSlot[]>;

interface AcuityAppointmentType {
  id: number;
  name: string;
  duration: number;
  price: string;
  classSize: number;
}

// ── Fetcher ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15; // Acuity caps at 15 per request

async function fetchAcuityPage(
  baseUrl: string,
  ownerKey: string,
  timezone: string,
  appointmentTypeIds: number[],
  calendarIds: number[],
  offset: number,
): Promise<AcuityAvailabilityResponse> {
  const url = `${baseUrl}/api/scheduling/v1/availability/class`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0',
      origin: baseUrl,
    },
    body: JSON.stringify({
      owner: ownerKey,
      timezone,
      bookableAppointmentTypeIds: appointmentTypeIds,
      bookableCalendarIds: calendarIds,
      limit: PAGE_SIZE,
      offset,
    }),
  });

  if (!res.ok) {
    throw new Error(`Acuity API: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

function slotToSession(
  slot: AcuityClassSlot,
  typeMap: Map<number, AcuityAppointmentType>,
): MomenceSession | null {
  const apptType = typeMap.get(slot.appointmentTypeId);
  if (!apptType) return null;

  const start = new Date(slot.time);
  const end = new Date(start.getTime() + apptType.duration * 60_000);
  const ticketsSold = Math.max(0, apptType.classSize - slot.slotsAvailable);

  return {
    id: `acuity-${slot.appointmentTypeId}-${slot.calendarId}-${slot.time}`,
    sessionName: apptType.name,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    durationMinutes: apptType.duration,
    capacity: apptType.classSize,
    ticketsSold,
    fixedTicketPrice: parseFloat(apptType.price) || 0,
    location: '',
    inPerson: true,
  };
}

export async function fetchAllAcuitySessions(
  cfg: AcuityConfig,
  existingSessions: MomenceSession[],
  onProgress?: (count: number) => void,
): Promise<MomenceSession[]> {
  // Build appointment type lookup from config
  const typeMap = new Map<number, AcuityAppointmentType>();
  for (const at of cfg.appointmentTypes) {
    typeMap.set(at.id, at);
  }

  const appointmentTypeIds = cfg.appointmentTypes.map(at => at.id);
  const calendarIds = cfg.calendarIds;

  // Paginate through all available future sessions
  const freshSessions: MomenceSession[] = [];
  const freshIds = new Set<string>();
  let offset = 0;

  while (true) {
    const page = await fetchAcuityPage(
      cfg.baseUrl, cfg.ownerKey, cfg.timezone,
      appointmentTypeIds, calendarIds, offset,
    );

    let pageCount = 0;
    for (const slots of Object.values(page)) {
      for (const slot of slots) {
        const session = slotToSession(slot, typeMap);
        if (session && !freshIds.has(session.id)) {
          freshIds.add(session.id);
          freshSessions.push(session);
        }
        pageCount++;
      }
    }

    onProgress?.(freshSessions.length);
    console.log(`[Acuity] Offset ${offset}: ${pageCount} slots (total sessions: ${freshSessions.length})`);

    if (pageCount < PAGE_SIZE) break;
    offset += pageCount;

    // Safety limit
    if (offset > 5000) {
      console.warn('[Acuity] Hit pagination safety limit at offset 5000');
      break;
    }
  }

  // Merge with cached sessions (incremental history pattern)
  // - Past sessions not in fresh set: keep as-is (they've left the API window)
  // - Sessions in both: use fresh data (updated ticketsSold counts)
  // - New fresh sessions: add them
  const now = new Date();
  const past = existingSessions.filter(
    s => new Date(s.startsAt) < now && !freshIds.has(s.id),
  );
  console.log(`[Acuity] Retaining ${past.length} cached past sessions, ${freshSessions.length} fresh`);

  return [...past, ...freshSessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
