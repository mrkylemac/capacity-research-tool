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
export type Platform = 'momence' | 'glofox' | 'marianatek';

export interface VenueConfig {
  mapsQuery?: string;
  id: string;
  name: string;
  platform: Platform;
  location: string;
  /** IANA timezone name, e.g. 'Australia/Melbourne'. Used to localise operating hours. */
  timezone?: string;
}

// Venue list
export const VENUES: VenueConfig[] = [
  { id: '37867', name: 'Inner Studio, Collingwood', platform: 'momence', location: 'Collingwood', mapsQuery: 'Inner Studio Collingwood Melbourne', timezone: 'Australia/Melbourne' },
  { id: '190198', name: 'Inner Studio, South Yarra', platform: 'momence', location: 'South Yarra', mapsQuery: 'Inner Studio South Yarra Melbourne', timezone: 'Australia/Melbourne' },
  { id: '59636', name: 'Sol Sauna', platform: 'momence', location: 'Prahran', mapsQuery: 'Sol Sauna Prahran Melbourne', timezone: 'Australia/Melbourne' },
];

// Glofox configuration
export const GLOFOX_CONFIG = {
  loreBathingClub: {
    token: '',
    branchId: '',
    timezone: 'Australia/Melbourne',
  },
} as const;

// Mariana Tek configuration
export const MARIANATEK_CONFIG: Record<string, {
  baseUrl: string;
  locationId: string;
  regionId: string;
  name: string;
  classTypeFilter?: string[];
}> = {
  aerthSaunas: {
    baseUrl: '',
    locationId: '',
    regionId: '',
    name: 'Aerth Saunas',
  },
  projectMood: {
    baseUrl: '',
    locationId: '',
    regionId: '',
    name: 'Project Mood',
  },
};
