/**
 * Pre-compute average weekly visitors for every venue from static JSON data.
 * Used by the VenueComparisonChart to show cross-venue benchmarking.
 */
import { VENUES } from '@/config/api';
import { differenceInDays, parseISO } from 'date-fns';
import type { MomenceSession } from '@/types/momence';

// Static imports for all venue JSON files
import innerStudioData from '@/data/venues/innerstudio-momence.json';
import solData from '@/data/venues/59636-momence.json';
import aaltoData from '@/data/venues/49448-momence.json';
import eqData from '@/data/venues/41167-momence.json';
import pandaData from '@/data/venues/40726-momence.json';
import loreData from '@/data/venues/lore-glofox.json';
import projectMoodData from '@/data/venues/projectmood-marianatek.json';
import senseOfSelfData from '@/data/venues/senseofself-trybe.json';
import portalData from '@/data/venues/portal-portal.json';
import xtraClubsData from '@/data/venues/xtraclubs-xtraclubs.json';
import wellnessSocialData from '@/data/venues/wellnesssocial-glofox.json';
import southYarraData from '@/data/venues/190198-momence.json';

export interface VenueComparisonEntry {
  venueId: string;
  venueName: string;
  weeklyVisitors: number;
  totalVisitors: number;
  weeksOfData: number;
}

interface VenueDataFile {
  hostId: string;
  venueName: string;
  dateRange: { from: string; to: string };
  sessions: MomenceSession[];
}

// Map hostId → static JSON data
const VENUE_DATA_MAP: Record<string, VenueDataFile> = {
  innerstudio: innerStudioData as unknown as VenueDataFile,
  '59636': solData as unknown as VenueDataFile,
  '49448': aaltoData as unknown as VenueDataFile,
  '41167': eqData as unknown as VenueDataFile,
  '40726': pandaData as unknown as VenueDataFile,
  lore: loreData as unknown as VenueDataFile,
  projectmood: projectMoodData as unknown as VenueDataFile,
  senseofself: senseOfSelfData as unknown as VenueDataFile,
  portal: portalData as unknown as VenueDataFile,
  xtraclubs: xtraClubsData as unknown as VenueDataFile,
  wellnesssocial: wellnessSocialData as unknown as VenueDataFile,
};

// Inner Studio sub-locations that get merged into the parent
const MERGED_VENUE_IDS = new Set(['37867', '190198']);

function computeWeeklyAvg(sessions: MomenceSession[], dateRange: { from: string; to: string }): {
  weeklyVisitors: number;
  totalVisitors: number;
  weeksOfData: number;
} {
  // Only count sessions with actual visitors (past, non-cancelled)
  const activeSessions = sessions.filter(s => s.ticketsSold > 0);
  const totalVisitors = activeSessions.reduce((sum, s) => sum + s.ticketsSold, 0);

  const days = differenceInDays(parseISO(dateRange.to), parseISO(dateRange.from)) + 1;
  const weeksOfData = Math.max(days / 7, 1);

  return {
    weeklyVisitors: Math.round(totalVisitors / weeksOfData),
    totalVisitors,
    weeksOfData: Math.round(weeksOfData * 10) / 10,
  };
}

/**
 * Reference line configuration for overlay targets (e.g. "Slow Folk estimate").
 * Set `value` to null to hide the reference line entirely.
 */
export interface ComparisonReferenceLine {
  label: string;
  value: number | null;
}

/**
 * Default reference line config — set value to enable, null to disable.
 * Update this when the Slow Folk weekly visits target is finalised.
 */
export const DEFAULT_REFERENCE_LINE: ComparisonReferenceLine = {
  label: 'Slow Folk (estimate)',
  value: null, // Set to e.g. 345 when ready
};

let _cached: VenueComparisonEntry[] | null = null;

/**
 * Returns average weekly visitors for all tracked venues, sorted descending.
 * Results are cached after first computation.
 */
export function getVenueComparisonData(): VenueComparisonEntry[] {
  if (_cached) return _cached;

  const entries: VenueComparisonEntry[] = [];

  // Merge Inner Studio sub-locations (37867 + 190198) into the parent `innerstudio` entry.
  // The innerstudio-momence.json already contains Collingwood data; add South Yarra on top.
  const innerStudioFile = VENUE_DATA_MAP['innerstudio'];
  if (innerStudioFile) {
    const syFile = southYarraData as unknown as VenueDataFile;
    const mergedSessions = [...innerStudioFile.sessions, ...(syFile?.sessions ?? [])];
    const earliest = innerStudioFile.dateRange.from < (syFile?.dateRange.from ?? innerStudioFile.dateRange.from)
      ? innerStudioFile.dateRange.from
      : syFile?.dateRange.from ?? innerStudioFile.dateRange.from;
    const latest = innerStudioFile.dateRange.to > (syFile?.dateRange.to ?? innerStudioFile.dateRange.to)
      ? innerStudioFile.dateRange.to
      : syFile?.dateRange.to ?? innerStudioFile.dateRange.to;
    const stats = computeWeeklyAvg(mergedSessions, { from: earliest, to: latest });
    const venueCfg = VENUES.find(v => v.id === 'innerstudio');
    entries.push({
      venueId: 'innerstudio',
      venueName: venueCfg?.name?.split(',')[0] ?? innerStudioFile.venueName,
      ...stats,
    });
  }

  // Process remaining venues
  for (const [hostId, data] of Object.entries(VENUE_DATA_MAP)) {
    if (hostId === 'innerstudio') continue; // already handled above
    if (MERGED_VENUE_IDS.has(hostId)) continue; // skip sub-locations

    const stats = computeWeeklyAvg(data.sessions, data.dateRange);
    const venueCfg = VENUES.find(v => v.id === hostId);
    entries.push({
      venueId: hostId,
      venueName: venueCfg?.name?.split(',')[0] ?? data.venueName,
      ...stats,
    });
  }

  // Sort descending by weekly visitors
  entries.sort((a, b) => b.weeklyVisitors - a.weeklyVisitors);

  _cached = entries;
  return entries;
}
