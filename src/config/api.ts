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
export type Platform = 'momence' | 'glofox' | 'marianatek' | 'trybe' | 'sheets';

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
  { id: '37867', name: 'Inner Studio, Collingwood', platform: 'momence', location: 'Collingwood', mapsQuery: 'Inner Studio Collingwood Melbourne', timezone: 'Australia/Melbourne' },
  { id: '190198', name: 'Inner Studio, South Yarra', platform: 'momence', location: 'South Yarra', mapsQuery: 'Inner Studio South Yarra Melbourne', timezone: 'Australia/Melbourne' },
  { id: '59636', name: 'Sol Sauna', platform: 'momence', location: 'Prahran', mapsQuery: 'Sol Sauna Prahran Melbourne', timezone: 'Australia/Melbourne', tagline: 'Melbourne\'s most loved urban sauna — authentic heat, cold plunge, and community.' },
  { id: '49448', name: 'Aalto, Adelaide', platform: 'momence', location: 'Adelaide', mapsQuery: 'Aalto Bathhouse Adelaide', timezone: 'Australia/Adelaide' },
  { id: '41167', name: 'EQ', platform: 'momence', location: 'South Melbourne', mapsQuery: 'EQ Wellness South Melbourne', timezone: 'Australia/Melbourne' },
  // { id: '46052', name: 'Fjord, San Francisco', platform: 'momence', location: 'San Francisco', mapsQuery: 'Fjord SF San Francisco', timezone: 'America/Los_Angeles' },
  { id: 'lore', name: 'Lore Bathing Club, NYC', platform: 'glofox', location: 'New York', mapsQuery: 'Lore Bathing Club New York', timezone: 'America/New_York' },
  { id: 'projectmood', name: 'Project Mood, Melbourne', platform: 'marianatek', location: 'Melbourne', mapsQuery: 'Project Mood Melbourne', timezone: 'Australia/Melbourne' },
  // { id: 'aerth', name: 'Ærth Saunas, Victoria BC', platform: 'marianatek', location: 'Victoria BC', mapsQuery: 'Aerth Saunas Victoria BC', timezone: 'America/Vancouver' },
  { id: 'senseofself', name: 'Sense of Self, Melbourne', platform: 'trybe', location: 'Melbourne', mapsQuery: 'Sense of Self Bathhouse Melbourne', timezone: 'Australia/Melbourne' },
  { id: 'akari', name: 'Akari Saunas, Brooklyn', platform: 'glofox', location: 'Brooklyn', mapsQuery: 'Akari Sauna Williamsburg Brooklyn', timezone: 'America/New_York' },
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
  akariSaunas: {
    branchId: '67cf4fe8ef346c3817003b8f',
    namespace: '', // TODO: discover via guest token probe
    name: 'Akari Saunas',
    timezone: 'America/New_York',
    // No guest token yet — run `npx tsx scripts/test-akari-saunas.ts` to discover
    token: '',
    tokenExpiry: '',
    operatingSince: '2025-01-01',
    // Google Sheets occupancy feed (live data published by venue)
    sheetsSpreadsheetId: '1yrIBz86iBFtin1_glrHsl0g05raVsisvbgIYaAYtin4',
    sheetsApiKey: 'AIzaSyB_CloyomHHpxfqBS8jJFBeIiR_MjE4gAQ',
    sheetsRange: 'SingleRow!A2:E2',
  },
} as const;

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
