import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { momenceClient } from '@/lib/momenceClient';
import { generateMockSessions } from '@/lib/mockData';
import { 
  calculateMetrics, 
  calculateMonthlyData, 
  calculateDemandPatterns, 
  calculateVenueConfig,
  calculateClassTypeData 
} from '@/lib/metricsCalculator';
import { API_CONFIG } from '@/config/api';
import type { MomenceSession, SessionsQueryParams } from '@/types/momence';

interface UseSessionsOptions {
  useMockData?: boolean;
}

export function useSessions(options: UseSessionsOptions = { useMockData: true }) {
  const [allSessions, setAllSessions] = useState<MomenceSession[]>([]);
  const [queryParams, setQueryParams] = useState<SessionsQueryParams | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sessions', queryParams],
    queryFn: async () => {
      if (!queryParams) return null;

      if (options.useMockData) {
        // Use mock data for development
        return generateMockSessions(
          queryParams.startsAtFrom,
          queryParams.startsAtTo,
          queryParams.page || 1,
          queryParams.pageSize || API_CONFIG.defaultPageSize
        );
      }

      // Use real API
      return momenceClient.fetchSessions(queryParams);
    },
    enabled: !!queryParams,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all pages to get complete data for metrics
  const fetchAllSessions = useCallback(async (params: Omit<SessionsQueryParams, 'page'>) => {
    const allData: MomenceSession[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      let response;
      if (options.useMockData) {
        response = generateMockSessions(
          params.startsAtFrom,
          params.startsAtTo,
          page,
          100 // Fetch larger pages for efficiency
        );
      } else {
        response = await momenceClient.fetchSessions({
          ...params,
          page,
          pageSize: 100,
        });
      }

      allData.push(...response.sessions);
      hasMore = page < response.totalPages;
      page++;

      // Safety limit
      if (page > 100) break;
    }

    setAllSessions(allData);
    return allData;
  }, [options.useMockData]);

  const fetchData = useCallback((params: SessionsQueryParams) => {
    setQueryParams(params);
    fetchAllSessions(params);
  }, [fetchAllSessions]);

  // Calculate all metrics from complete session data
  const metrics = queryParams ? calculateMetrics(
    allSessions,
    queryParams.startsAtFrom,
    queryParams.startsAtTo
  ) : null;

  const monthlyData = calculateMonthlyData(allSessions);
  const demandPatterns = calculateDemandPatterns(allSessions);
  const classTypeData = calculateClassTypeData(allSessions);
  const venueConfig = queryParams ? calculateVenueConfig(
    allSessions,
    queryParams.startsAtFrom,
    queryParams.startsAtTo
  ) : null;

  return {
    // Raw data
    sessions: data?.sessions || [],
    allSessions,
    totalCount: data?.totalCount || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || API_CONFIG.defaultPageSize,
    totalPages: data?.totalPages || 0,
    
    // Computed data
    metrics,
    monthlyData,
    demandPatterns,
    classTypeData,
    venueConfig,
    
    // State
    isLoading,
    error,
    
    // Actions
    fetchData,
    setPage: (page: number) => {
      if (queryParams) {
        setQueryParams({ ...queryParams, page });
      }
    },
  };
}
