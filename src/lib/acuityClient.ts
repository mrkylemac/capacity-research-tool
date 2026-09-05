/**
 * Acuity Scheduling client — fetches availability from the public
 * scheduling widget API. Supports two Acuity appointment models:
 *
 *   mode: 'class'   → POST /availability/class  (group classes; no live venue
 *                                                 since Sauna Goose left for Momence)
 *   mode: 'service' → GET  /availability/times   (individual bookings, e.g. The Corner Sauna)
 *
 * Data model:
 * - Future sessions only (past sessions are removed by the API)
 * - `slotsAvailable` = remaining spots → ticketsSold = classSize - slotsAvailable
 * - Price comes from the static appointment type config (not per-session)
 * - Class-mode pagination: server caps at 15 results per page
 * - Service-mode: one request per appointment type + calendar pair; maxDays-based
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

/** Service-type slot — simpler than class slot (no appointmentTypeId/calendarId in response) */
interface AcuityServiceSlot {
  time: string;          // ISO 8601 with timezone offset
  slotsAvailable: number;
}

/** Response is keyed by date string (YYYY-MM-DD), each value is an array of slots */
type AcuityAvailabilityResponse = Record<string, AcuityClassSlot[]>;
type AcuityTimesResponse = Record<string, AcuityServiceSlot[]>;

interface AcuityAppointmentType {
  id: number;
  name: string;
  duration: number;
  price: string;
  classSize: number;
  calendarId?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// CLASS MODE — POST /availability/class (no live venue; Sauna Goose was the last)
// ══════════════════════════════════════════════════════════════════════════════

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

function classSlotToSession(
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

async function fetchAllClassSessions(
  cfg: AcuityConfig,
  existingSessions: MomenceSession[],
  onProgress?: (count: number) => void,
): Promise<MomenceSession[]> {
  const typeMap = new Map<number, AcuityAppointmentType>();
  for (const at of cfg.appointmentTypes) {
    typeMap.set(at.id, at);
  }

  const appointmentTypeIds = cfg.appointmentTypes.map(at => at.id);
  const calendarIds = cfg.calendarIds;

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
        const session = classSlotToSession(slot, typeMap);
        if (session && !freshIds.has(session.id)) {
          freshIds.add(session.id);
          freshSessions.push(session);
        }
        pageCount++;
      }
    }

    onProgress?.(freshSessions.length);
    console.log(`[Acuity/class] Offset ${offset}: ${pageCount} slots (total: ${freshSessions.length})`);

    if (pageCount < PAGE_SIZE) break;
    offset += pageCount;

    if (offset > 5000) {
      console.warn('[Acuity/class] Hit pagination safety limit at offset 5000');
      break;
    }
  }

  return mergeWithCached(freshSessions, freshIds, existingSessions, 'class');
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE MODE — GET /availability/times (e.g. The Corner Sauna)
// ══════════════════════════════════════════════════════════════════════════════

const SERVICE_MAX_DAYS = 30;

/**
 * Fetch available time slots for a single appointment type + calendar pair.
 * Service-type Acuity venues use GET with query params (not POST with body).
 */
async function fetchAcuityTimesPage(
  baseUrl: string,
  ownerKey: string,
  timezone: string,
  appointmentTypeId: number,
  calendarId: number,
): Promise<AcuityTimesResponse> {
  const today = new Date().toISOString().slice(0, 10);

  const url = new URL(`${baseUrl}/api/scheduling/v1/availability/times`);
  url.searchParams.set('owner', ownerKey);
  url.searchParams.set('appointmentTypeId', String(appointmentTypeId));
  url.searchParams.set('calendarId', String(calendarId));
  url.searchParams.set('startDate', today);
  url.searchParams.set('maxDays', String(SERVICE_MAX_DAYS));
  url.searchParams.set('timezone', timezone);

  const res = await fetch(url.toString(), {
    headers: {
      accept: 'application/json',
      'user-agent': 'Mozilla/5.0',
      'x-secondo-owner': ownerKey,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Acuity times API ${res.status}: ${body}`);
  }

  return res.json();
}

function serviceSlotToSession(
  slot: AcuityServiceSlot,
  apptType: AcuityAppointmentType,
  calendarId: number,
): MomenceSession {
  const start = new Date(slot.time);
  const end = new Date(start.getTime() + apptType.duration * 60_000);
  const ticketsSold = Math.max(0, apptType.classSize - slot.slotsAvailable);

  return {
    id: `acuity-${apptType.id}-${calendarId}-${slot.time}`,
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

async function fetchAllServiceSessions(
  cfg: AcuityConfig,
  existingSessions: MomenceSession[],
  onProgress?: (count: number) => void,
): Promise<MomenceSession[]> {
  const freshSessions: MomenceSession[] = [];
  const freshIds = new Set<string>();

  // Query each appointment type + its calendar pair
  for (const apptType of cfg.appointmentTypes) {
    const calId = apptType.calendarId;
    if (!calId) {
      console.warn(`[Acuity/service] Skipping type ${apptType.id} (${apptType.name}) — no calendarId`);
      continue;
    }

    console.log(`[Acuity/service] Fetching: ${apptType.name} (type=${apptType.id}, cal=${calId})`);

    const page = await fetchAcuityTimesPage(
      cfg.baseUrl, cfg.ownerKey, cfg.timezone,
      apptType.id, calId,
    );

    for (const slots of Object.values(page)) {
      for (const slot of slots) {
        const session = serviceSlotToSession(slot, apptType, calId);
        if (!freshIds.has(session.id)) {
          freshIds.add(session.id);
          freshSessions.push(session);
        }
      }
    }

    onProgress?.(freshSessions.length);
    console.log(`[Acuity/service] ${apptType.name}: running total ${freshSessions.length} sessions`);
  }

  return mergeWithCached(freshSessions, freshIds, existingSessions, 'service');
}

// ══════════════════════════════════════════════════════════════════════════════
// Shared — incremental merge + public entry point
// ══════════════════════════════════════════════════════════════════════════════

function mergeWithCached(
  freshSessions: MomenceSession[],
  freshIds: Set<string>,
  existingSessions: MomenceSession[],
  label: string,
): MomenceSession[] {
  const now = new Date();
  const past = existingSessions.filter(
    s => new Date(s.startsAt) < now && !freshIds.has(s.id),
  );
  console.log(`[Acuity/${label}] Retaining ${past.length} cached past sessions, ${freshSessions.length} fresh`);

  return [...past, ...freshSessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * Fetch all sessions for an Acuity venue.
 * Automatically dispatches to the correct mode (class vs service) based on config.
 */
export async function fetchAllAcuitySessions(
  cfg: AcuityConfig,
  existingSessions: MomenceSession[],
  onProgress?: (count: number) => void,
): Promise<MomenceSession[]> {
  if (cfg.mode === 'service') {
    return fetchAllServiceSessions(cfg, existingSessions, onProgress);
  }
  return fetchAllClassSessions(cfg, existingSessions, onProgress);
}
