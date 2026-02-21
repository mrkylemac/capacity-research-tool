import type { MomenceSession } from '@/types/momence';

interface MarianaTekFetchParams {
  baseUrl: string;
  locationId: string;
  regionId: string;
  fromDate: string;
  toDate: string;
  venueName: string;
  classTypeFilter?: string[];
  onProgress: (loaded: number, total: number) => void;
}

export async function fetchMarianaTekSessions(_params: MarianaTekFetchParams): Promise<MomenceSession[]> {
  throw new Error('Mariana Tek integration not yet configured');
}
