// Momence API Configuration

export const API_CONFIG = {
  baseUrl: 'https://readonly-api.momence.com/host-plugins/host',
  defaultHostId: '49448',
  sessionTypes: [
    'course-class',
    'fitness',
    'retreat',
    'special-event',
    'special-event-new',
  ] as const,
  pageSize: 100,
} as const;

// Glofox API Configuration

export const GLOFOX_CONFIG = {
  loreBathingClub: {
    branchId: '67c5eb09efb4277b06084eb6',
    namespace: 'lorebathingclub',
    name: 'Lore Bathing Club',
    timezone: 'America/New_York',
    // Guest token - expires Mar 8, 2026
    token: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJfIiwiZXhwIjoxNzcyODUyMDc4LCJpYXQiOjE3NzA0MzI4NzgsImlzcyI6Il8iLCJ1c2VyIjp7Il9pZCI6Imd1ZXN0IiwibmFtZXNwYWNlIjoibG9yZWJhdGhpbmdjbHViIiwiYnJhbmNoX2lkIjoiNjdjNWViMDllZmI0Mjc3YjA2MDg0ZWI2IiwiZmlyc3RfbmFtZSI6Ikd1ZXN0IiwibGFzdF9uYW1lIjoiVXNlciIsInR5cGUiOiJHVUVTVCIsImlzU3VwZXJBZG1pbiI6ZmFsc2V9fQ.ht0QGgJ3dzT3Cp5CTMiqSIJawAlxWfWX_PakV4XlFu4',
    tokenExpiry: '2026-03-08',
    // Venue opened Jan 1, 2026
    operatingSince: '2026-01-01',
  },
} as const;

// Mariana Tek API Configuration (customer classes endpoint)
export const MARIANATEK_CONFIG = {
  projectMood: {
    baseUrl: 'https://projectmood.marianatek.com/api/customer/v1',
    locationId: '48717',
    regionId: '48541',
    name: 'Project Mood',
    timezone: 'Australia/Melbourne',
  },
} as const;

// Platform types for venue identification
export type Platform = 'momence' | 'glofox' | 'marianatek';

export interface VenueConfig {
  id: string;
  name: string;
  platform: Platform;
  location: string;
}

// Unified venue list, grouped by location
export const VENUES: VenueConfig[] = [
  { id: '49448', name: 'Aalto, Adelaide', platform: 'momence', location: 'Adelaide' },
  { id: '59636', name: 'Sol Sauna, Prahran', platform: 'momence', location: 'Melbourne' },
  { id: '37867', name: 'Inner Studio, Collingwood', platform: 'momence', location: 'Melbourne' },
  { id: '190198', name: 'Inner Studio, South Yarra', platform: 'momence', location: 'Melbourne' },
  { id: '16053', name: 'HOI', platform: 'momence', location: 'Melbourne' },
  { id: 'projectmood', name: 'Project Mood, Melbourne', platform: 'marianatek', location: 'Melbourne' },
  { id: '46052', name: 'Fjord, San Francisco', platform: 'momence', location: 'San Francisco' },
  { id: 'lore', name: 'Lore Bathing Club, NYC', platform: 'glofox', location: 'New York' },
];
