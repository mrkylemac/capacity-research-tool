// Momence API Configuration
// Update this file to configure your API endpoint

export const API_CONFIG = {
  // Base URL for the Momence API
  baseUrl: 'https://api.momence.com/v1',
  
  // Default host ID for Aalto Community
  defaultHostId: '49448',
  
  // Default page size options
  pageSizeOptions: [20, 50, 100] as const,
  
  // Default page size
  defaultPageSize: 50 as const,
} as const;

export type PageSizeOption = 20 | 50 | 100;
