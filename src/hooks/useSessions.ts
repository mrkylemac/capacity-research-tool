import { useState, useCallback } from 'react';
import { momenceClient, type HostInfo } from '@/lib/momenceClient';
import { 
  calculateMetrics, 
  calculateMonthlyData, 
  calculateDemandPatterns, 
  calculateVenueConfig,
  calculateClassTypeData 
} from '@/lib/metricsCalculator';
import { API_CONFIG } from '@/config/api';
import type { MomenceSession, SessionsQueryParams } from '@/types/momence';

function filterByDateRange(sessions: MomenceSession[], fromDate: string, toDate: string): MomenceSession[] {
  const from = new Date(fromDate).getTime();
  const to = new Date(toDate).getTime();
  
  return sessions.filter(session => {
    const sessionDate = new Date(session.startsAt).getTime();
    return sessionDate >= from && sessionDate <= to;
  });
}

export function useSessions() {
  const [allSessions, setAllSessions] = useState<MomenceSession[]>([]);
  const [queryParams, setQueryParams] = useState<SessionsQueryParams | null>(null);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchData = useCallback(async (params: Omit<SessionsQueryParams, 'page' | 'pageSize'>) => {
    setIsLoading(true);
    setError(null);
    setQueryParams({ ...params, page: 1, pageSize: API_CONFIG.pageSize });

    console.log('Requested date range:', params.startsAtFrom, 'to', params.startsAtTo);

    try {
      // Fetch host info in parallel with first page of sessions
      const hostInfoPromise = momenceClient.fetchHostInfo(params.hostId);
      
      const allData: MomenceSession[] = [];
      let page = 1;
      let pagesLoaded = 0;

      while (true) {
        const response = await momenceClient.fetchSessions({
          ...params,
          page,
          pageSize: API_CONFIG.pageSize,
        });

        const sessionCount = response.sessions.length;
        allData.push(...response.sessions);
        pagesLoaded++;
        
        console.log(`Page ${page}: fetched ${sessionCount} sessions (total so far: ${allData.length})`);

        // Stop if: no results, less than full page (end of data), or safety limit
        if (sessionCount === 0 || sessionCount < API_CONFIG.pageSize || pagesLoaded >= 100) {
          break;
        }

        page++;
      }

      // Get host info result
      const fetchedHostInfo = await hostInfoPromise;
      setHostInfo(fetchedHostInfo);

      // Log date range of raw API data
      if (allData.length > 0) {
        const dates = allData.map(s => new Date(s.startsAt).getTime());
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        console.log('API returned data range:', minDate.toISOString(), 'to', maxDate.toISOString());
      }

      // Apply client-side date filtering since API ignores date params
      const filteredData = filterByDateRange(allData, params.startsAtFrom, params.startsAtTo);
      
      console.log(`Filtered: ${allData.length} → ${filteredData.length} sessions within requested range`);

      setTotalCount(filteredData.length);
      setTotalPages(pagesLoaded);
      setAllSessions(filteredData);
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sessions'));
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    allSessions,
    totalCount,
    totalPages,
    page: 1,
    metrics,
    monthlyData,
    demandPatterns,
    classTypeData,
    venueConfig,
    hostInfo,
    isLoading,
    error,
    fetchData,
  };
}
