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
export type Platform = 'momence';

export interface VenueConfig {
  id: string;
  name: string;
  platform: Platform;
  location: string;
}

// Venue list
export const VENUES: VenueConfig[] = [
  { id: '37867', name: 'Inner Studio, Collingwood', platform: 'momence', location: 'Melbourne' },
  { id: '190198', name: 'Inner Studio, South Yarra', platform: 'momence', location: 'Melbourne' },
  { id: '59636', name: 'Sol Sauna', platform: 'momence', location: 'Melbourne' },
];
