'use client';

import { useQuery } from '@tanstack/react-query';
import type { TrackerApiResponse } from '@/types/tracker';

export function useCapExData() {
  return useQuery<TrackerApiResponse>({
    queryKey: ['tracker', 'capex'],
    queryFn: async () => {
      const res = await fetch('/api/sheets/CapEx');
      if (!res.ok) throw new Error(`Failed to fetch CapEx data: ${res.status}`);
      return res.json() as Promise<TrackerApiResponse>;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
