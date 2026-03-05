// Momence API Configuration

export const API_CONFIG = {
  baseUrl: 'https://readonly-api.momence.com/host-plugins/host',
  defaultHostId: '37867',
  sessionTypes: [
    'course-class',
    'fitness',
    'retreat',
    'special-event',
    'special-event-new',
  ] as const,
  pageSize: 100,
} as const;

// Platform types for venue identification
export type Platform = 'momence' | 'glofox' | 'marianatek' | 'trybe' | 'portal' | 'xtraclubs';

export interface VenueConfig {
  mapsQuery?: string;
  id: string;
  name: string;
  platform: Platform;
  location: string;
  /** IANA timezone name, e.g. 'Australia/Melbourne'. Used to localise operating hours. */
  timezone?: string;
  /** Short positive descriptor shown beneath the venue name on the report header. */
  tagline?: string;
}

// Venue list
export const VENUES: VenueConfig[] = [
  { id: 'innerstudio', name: 'Inner Studio, Melbourne', platform: 'momence', location: 'Melbourne', mapsQuery: 'Inner Studio Collingwood Melbourne', timezone: 'Australia/Melbourne' },
  { id: '59636', name: 'Sol Sauna', platform: 'momence', location: 'Prahran', mapsQuery: 'Sol Sauna Prahran Melbourne', timezone: 'Australia/Melbourne', tagline: 'Melbourne\'s most loved urban sauna — authentic heat, cold plunge, and community.' },
  { id: '49448', name: 'Aalto, Adelaide', platform: 'momence', location: 'Adelaide', mapsQuery: 'Aalto Bathhouse Adelaide', timezone: 'Australia/Adelaide' },
  { id: '41167', name: 'EQ', platform: 'momence', location: 'South Melbourne', mapsQuery: 'EQ Wellness South Melbourne', timezone: 'Australia/Melbourne' },
  // { id: '46052', name: 'Fjord, San Francisco', platform: 'momence', location: 'San Francisco', mapsQuery: 'Fjord SF San Francisco', timezone: 'America/Los_Angeles' },
  { id: 'lore', name: 'Lore Bathing Club, NYC', platform: 'glofox', location: 'New York', mapsQuery: 'Lore Bathing Club New York', timezone: 'America/New_York' },
  { id: 'projectmood', name: 'Project Mood, Melbourne', platform: 'marianatek', location: 'Melbourne', mapsQuery: 'Project Mood Melbourne', timezone: 'Australia/Melbourne' },
  // { id: 'aerth', name: 'Ærth Saunas, Victoria BC', platform: 'marianatek', location: 'Victoria BC', mapsQuery: 'Aerth Saunas Victoria BC', timezone: 'America/Vancouver' },
  { id: 'senseofself', name: 'Sense of Self, Melbourne', platform: 'trybe', location: 'Melbourne', mapsQuery: 'Sense of Self Bathhouse Melbourne', timezone: 'Australia/Melbourne' },
  { id: '40726', name: 'Panda Society', platform: 'momence', location: '', mapsQuery: 'Panda Society', timezone: 'Australia/Melbourne' },
  { id: 'portal', name: 'Portal, Colorado', platform: 'portal', location: 'Colorado', mapsQuery: 'Portal Thermaculture Denver', timezone: 'America/Denver' },
  { id: 'xtraclubs', name: 'Xtra Clubs, Sydney', platform: 'xtraclubs', location: 'Sydney', mapsQuery: 'Xtra Clubs Bondi Junction Sydney', timezone: 'Australia/Sydney' },
  { id: 'wellnesssocial', name: 'Wellness Social Club, Melbourne', platform: 'glofox', location: 'Melbourne', mapsQuery: 'Wellness Social Club Melbourne', timezone: 'Australia/Melbourne' },
];

// Glofox configuration
export const GLOFOX_CONFIG = {
  loreBathingClub: {
    branchId: '67c5eb09efb4277b06084eb6',
    namespace: 'lorebathingclub',
    name: 'Lore Bathing Club',
    timezone: 'America/New_York',
    // Guest token — expires 2026-03-08
    token: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJfIiwiZXhwIjoxNzcyODUyMDc4LCJpYXQiOjE3NzA0MzI4NzgsImlzcyI6Il8iLCJ1c2VyIjp7Il9pZCI6Imd1ZXN0IiwibmFtZXNwYWNlIjoibG9yZWJhdGhpbmdjbHViIiwiYnJhbmNoX2lkIjoiNjdjNWViMDllZmI0Mjc3YjA2MDg0ZWI2IiwiZmlyc3RfbmFtZSI6Ikd1ZXN0IiwibGFzdF9uYW1lIjoiVXNlciIsInR5cGUiOiJHVUVTVCIsImlzU3VwZXJBZG1pbiI6ZmFsc2V9fQ.ht0QGgJ3dzT3Cp5CTMiqSIJawAlxWfWX_PakV4XlFu4',
    tokenExpiry: '2026-03-08',
    operatingSince: '2026-01-01',
  },
  wellnessSocialClub: {
    branchId: '6769bc07dd963d1b0108804b',
    namespace: "wellnesssocialbusine",
    name: 'Wellness Social Club',
    timezone: 'Australia/Melbourne',
    token: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJfIiwiZXhwIjoxNzc1MzY0MTM3LCJpYXQiOjE3NzI2ODU3MzcsImlzcyI6Il8iLCJ1c2VyIjp7Il9pZCI6Imd1ZXN0IiwibmFtZXNwYWNlIjoid2VsbG5lc3Nzb2NpYWxidXNpbmUiLCJicmFuY2hfaWQiOiI2NzY5YmMwN2RkOTYzZDFiMDEwODgwNGIiLCJmaXJzdF9uYW1lIjoiR3Vlc3QiLCJsYXN0X25hbWUiOiJVc2VyIiwidHlwZSI6IkdVRVNUIiwiaXNTdXBlckFkbWluIjpmYWxzZX19.Pj2NwdXiTGPdAaAQ13dqXgV-G2sBr-7o86ptwLJs--E',
    tokenExpiry: '2026-04-08',
    operatingSince: '2025-06-01',
  },
} as const;

/** Resolve the Glofox config entry for a given venue hostId. */
export function getGlofoxConfig(hostId: string) {
  const map: Record<string, (typeof GLOFOX_CONFIG)[keyof typeof GLOFOX_CONFIG]> = {
    lore: GLOFOX_CONFIG.loreBathingClub,
    wellnesssocial: GLOFOX_CONFIG.wellnessSocialClub,
  };
  const cfg = map[hostId];
  if (!cfg) throw new Error(`No Glofox config for hostId "${hostId}"`);
  return cfg;
}

// TryBe configuration (public customer API — no auth required)
export const TRYBE_CONFIG = {
  senseOfSelf: {
    venueId: '9f40f5e4-d840-487a-b5cd-12e9a571b80e',
    // Each offering is a bookable session type. Sessions are fetched per-offering.
    offerings: [
      { id: '689bfaa6238f5106bb09ebef', name: 'Quiet Morning Bathhouse' },
      { id: '6861f7143c3fb8e08d061fa4', name: 'Bathhouse Session' },
    ],
    name: 'Sense of Self',
    timezone: 'Australia/Melbourne',
    // TryBe only exposes upcoming/current sessions — past sessions are not accessible
    // via the public API. The fetcher merges newly fetched sessions with previously
    // cached past sessions to build up history over time.
    launchDate: '2025-07-07',
  },
} as const;

// Mariana Tek configuration (customer classes endpoint — no auth required)
export const MARIANATEK_CONFIG = {
  projectMood: {
    baseUrl: 'https://projectmood.marianatek.com/api/customer/v1',
    locationId: '48717',
    regionId: '48541',
    name: 'Project Mood',
    timezone: 'Australia/Melbourne',
    classTypeFilter: 'Open Bathhouse',
  },
  aerthSaunas: {
    baseUrl: 'https://aerthsaunas.marianatek.com/api/customer/v1',
    locationId: '48717',
    regionId: '48541',
    name: 'Ærth Saunas',
    timezone: 'America/Vancouver',
    classTypeFilter: 'Ærth Cycle (90 min)',
  },
} as const;

// Xtra Clubs configuration (public schedule API — no auth required)
export const XTRA_CLUBS_CONFIG = {
  baseUrl: 'https://checkout.xtraclubs.au/api',
  name: 'Xtra Clubs',
  timezone: 'Australia/Sydney',
  locations: [
    { siteId: '65c468e98af2a3e02af945ae', name: 'Bondi Junction', operatingSince: '2024-01-01' },
    { siteId: '6785c335ead6da842a685ba1', name: 'Green Square', operatingSince: '2025-01-01' },
    { siteId: '67ee5f25751de5d4c7470c67', name: 'Merrickville', operatingSince: '2025-01-01' },
  ],
} as const;

// Inner Studio configuration (multi-location Momence venue)
export const INNER_STUDIO_CONFIG = {
  name: 'Inner Studio',
  timezone: 'Australia/Melbourne',
  locations: [
    { hostId: '37867', name: 'Collingwood' },
    { hostId: '190198', name: 'South Yarra' },
  ],
} as const;

// Portal Thermaculture configuration (custom Wix-backed booking platform — no auth required)
export const PORTAL_CONFIG = {
  baseUrl: 'https://book.portalthermaculture.com/api',
  name: 'Portal',
  timezone: 'America/Denver',
  locations: [
    { wixLocationId: '09d22dbe-dae2-4847-b657-90cf03ea5e67', name: 'Denver', operatingSince: '2025-03-26' },
    { wixLocationId: '8ac6d40a-fbbb-4524-9959-33da8cdc67bc', name: 'Boulder', operatingSince: '2025-03-26' },
  ],
} as const;
