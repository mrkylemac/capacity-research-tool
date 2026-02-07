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

// Platform types for venue identification
export type Platform = 'momence' | 'glofox';

export interface VenueConfig {
  id: string;
  name: string;
  platform: Platform;
}

// Unified venue list
export const VENUES: VenueConfig[] = [
  { id: '49448', name: 'Aalto, Adelaide', platform: 'momence' },
  { id: '59636', name: 'Sol Sauna, Prahran', platform: 'momence' },
  { id: '37867', name: 'Inner Studio, Collingwood', platform: 'momence' },
  { id: '190198', name: 'Inner Studio, South Yarra', platform: 'momence' },
  // { id: '16053', name: 'HOI', platform: 'momence' },
  { id: '46052', name: 'Fjord, San Francisco', platform: 'momence' },
  { id: 'lore', name: 'Lore Bathing Club, NYC', platform: 'glofox' },
];
