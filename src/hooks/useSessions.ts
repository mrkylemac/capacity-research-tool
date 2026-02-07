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

function filterToLastMonths(sessions: MomenceSession[], months: number): MomenceSession[] {
  if (sessions.length === 0) return [];
  
  // Find the most recent session date
  const maxDate = Math.max(...sessions.map(s => new Date(s.startsAt).getTime()));
  const cutoffDate = new Date(maxDate);
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  
  return sessions.filter(s => new Date(s.startsAt).getTime() >= cutoffDate.getTime());
}

export interface DataRange {
  from: Date | null;
  to: Date | null;
  rawFrom: Date | null;
  rawTo: Date | null;
  fallbackApplied?: boolean;  // True if we fell back to available data
  fallbackMonths?: number;    // How many months of available data we're showing
}

export interface FetchProgress {
  sessionsFetched: number;
  pagesLoaded: number;
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
  const [fetchProgress, setFetchProgress] = useState<FetchProgress>({ sessionsFetched: 0, pagesLoaded: 0 });

  const fetchData = useCallback(async (params: Omit<SessionsQueryParams, 'page' | 'pageSize'>) => {
    setIsLoading(true);
    setError(null);
    setFetchProgress({ sessionsFetched: 0, pagesLoaded: 0 });
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
        
        // Update progress for UI feedback
        setFetchProgress({ sessionsFetched: allData.length, pagesLoaded });
        
        console.log(`Page ${page}: fetched ${sessionCount} sessions (total so far: ${allData.length})`);

        // Stop if: no results, less than full page (end of data), or safety limit
        // Note: Inner Studio has 218+ pages, so limit needs to be high enough
        if (sessionCount === 0 || sessionCount < API_CONFIG.pageSize || pagesLoaded >= 250) {
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
      let filteredData = filterByDateRange(allData, params.startsAtFrom, params.startsAtTo);
      let fallbackApplied = false;
      let fallbackMonths = 0;
      
      console.log(`Filtered: ${allData.length} → ${filteredData.length} sessions within requested range`);

      // If no data in requested range but API has data, fall back to last available months
      if (filteredData.length === 0 && allData.length > 0) {
        // Try last 6 months of available data first, then 3 if still sparse
        const last6 = filterToLastMonths(allData, 6);
        if (last6.length >= 10) {
          filteredData = last6;
          fallbackMonths = 6;
        } else {
          filteredData = filterToLastMonths(allData, 3);
          fallbackMonths = 3;
        }
        fallbackApplied = true;
        console.log(`Fallback applied: showing last ${fallbackMonths} months of available data (${filteredData.length} sessions)`);
      }

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
        fallbackApplied,
        fallbackMonths,
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
    fetchProgress,
    fetchData,
  };
}
