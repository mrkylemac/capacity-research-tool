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

export interface DataRange {
  from: Date | null;
  to: Date | null;
  rawFrom: Date | null;  // Before filtering
  rawTo: Date | null;
}

export function useSessions() {
  const [allSessions, setAllSessions] = useState<MomenceSession[]>([]);
  const [queryParams, setQueryParams] = useState<SessionsQueryParams | null>(null);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [dataRange, setDataRange] = useState<DataRange>({ from: null, to: null, rawFrom: null, rawTo: null });

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

      // Calculate date range of raw API data
      let rawMinDate: Date | null = null;
      let rawMaxDate: Date | null = null;
      
      if (allData.length > 0) {
        const dates = allData.map(s => new Date(s.startsAt).getTime());
        rawMinDate = new Date(Math.min(...dates));
        rawMaxDate = new Date(Math.max(...dates));
        console.log('API returned data range:', rawMinDate.toISOString(), 'to', rawMaxDate.toISOString());
      }

      // Apply client-side date filtering since API ignores date params
      const filteredData = filterByDateRange(allData, params.startsAtFrom, params.startsAtTo);
      
      console.log(`Filtered: ${allData.length} → ${filteredData.length} sessions within requested range`);

      // Calculate date range of filtered data
      let filteredMinDate: Date | null = null;
      let filteredMaxDate: Date | null = null;
      
      if (filteredData.length > 0) {
        const dates = filteredData.map(s => new Date(s.startsAt).getTime());
        filteredMinDate = new Date(Math.min(...dates));
        filteredMaxDate = new Date(Math.max(...dates));
      }

      setDataRange({
        from: filteredMinDate,
        to: filteredMaxDate,
        rawFrom: rawMinDate,
        rawTo: rawMaxDate,
      });
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
    dataRange,
    isLoading,
    error,
    fetchData,
  };
}
