import { useState, useCallback } from 'react';
import { momenceClient, type HostInfo } from '@/lib/momenceClient';
import {
  calculateMetrics,
  calculateMonthlyData,
  calculateDemandPatterns,
  calculateVenueConfig,
  calculateClassTypeData,
  generateTimeSlots
} from '@/lib/metricsCalculator';
import { sanitizeSessions, logDataQuality, normalizeCapacity, type OperatingHoursBounds } from '@/lib/utils';
import { inferOperatingHours, calculateBenchmarkMetrics } from '@/lib/benchmarkMetrics';
import { API_CONFIG } from '@/config/api';
import type { MomenceSession, SessionsQueryParams } from '@/types/momence';

function filterByDateRange(sessions: MomenceSession[], fromDate: string, toDate: string): MomenceSession[] {
  const from = new Date(fromDate).getTime();
  // Parse toDate and extend to end-of-day if it resolves to midnight
  const toParsed = new Date(toDate);
  const toTime = toParsed.getHours() === 0 && toParsed.getMinutes() === 0 && toParsed.getSeconds() === 0
    ? new Date(toParsed.getFullYear(), toParsed.getMonth(), toParsed.getDate(), 23, 59, 59, 999).getTime()
    : toParsed.getTime();

  return sessions.filter(session => {
    const sessionDate = new Date(session.startsAt).getTime();
    return sessionDate >= from && sessionDate <= toTime;
  });
}

function filterToLastMonths(sessions: MomenceSession[], months: number): MomenceSession[] {
  if (sessions.length === 0) return [];

  // Find the most recent session date
  let maxDate = -Infinity;
  for (const s of sessions) {
    const t = new Date(s.startsAt).getTime();
    if (t > maxDate) maxDate = t;
  }
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
  effectiveFromISO: string | null;  // Actual date range used for calculations
  effectiveToISO: string | null;
}

export function useSessions() {
  const [allSessions, setAllSessions] = useState<MomenceSession[]>([]);
  const [queryParams, setQueryParams] = useState<SessionsQueryParams | null>(null);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchPhase, setFetchPhase] = useState<'idle' | 'fetching' | 'processing'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [fetchingCount, setFetchingCount] = useState(0);
  const [dataRange, setDataRange] = useState<DataRange>({ from: null, to: null, rawFrom: null, rawTo: null, effectiveFromISO: null, effectiveToISO: null });

  const fetchData = useCallback(async (params: Omit<SessionsQueryParams, 'page' | 'pageSize'>) => {
    setIsLoading(true);
    setFetchPhase('fetching');
    setError(null);
    setFetchingCount(0);
    setQueryParams({ ...params, page: 1, pageSize: API_CONFIG.pageSize });

    try {
      // Fetch host info and page 1 in parallel
      const [fetchedHostInfo, firstResponse] = await Promise.all([
        momenceClient.fetchHostInfo(params.hostId),
        momenceClient.fetchSessions({ ...params, page: 1, pageSize: API_CONFIG.pageSize }),
      ]);

      setHostInfo(fetchedHostInfo);

      const allData: MomenceSession[] = [...firstResponse.sessions];
      setFetchingCount(allData.length);

      // Fetch remaining pages in parallel batches of 10
      const MAX_PAGES = 250;
      const BATCH_SIZE = 10;
      const totalPagesFromAPI = Math.min(firstResponse.totalPages || 1, MAX_PAGES);

      if (firstResponse.sessions.length === API_CONFIG.pageSize && totalPagesFromAPI > 1) {
        for (let batchStart = 2; batchStart <= totalPagesFromAPI; batchStart += BATCH_SIZE) {
          const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, totalPagesFromAPI);
          const pageNumbers = Array.from({ length: batchEnd - batchStart + 1 }, (_, i) => batchStart + i);

          const batchResults = await Promise.all(
            pageNumbers.map(p => momenceClient.fetchSessions({ ...params, page: p, pageSize: API_CONFIG.pageSize }))
          );

          let reachedEnd = false;
          for (const result of batchResults) {
            allData.push(...result.sessions);
            if (result.sessions.length < API_CONFIG.pageSize) {
              reachedEnd = true;
              break;
            }
          }

          setFetchingCount(allData.length);
          if (reachedEnd) break;
        }
      }

      const pagesLoaded = Math.ceil(allData.length / API_CONFIG.pageSize);

      setFetchPhase('processing');

      // Calculate date range of raw API data
      let rawMinDate: Date | null = null;
      let rawMaxDate: Date | null = null;

      if (allData.length > 0) {
        let minTs = Infinity, maxTs = -Infinity;
        for (const s of allData) {
          const t = new Date(s.startsAt).getTime();
          if (t < minTs) minTs = t;
          if (t > maxTs) maxTs = t;
        }
        rawMinDate = new Date(minTs);
        rawMaxDate = new Date(maxTs);
      }

      // Apply client-side date filtering since API ignores date params
      let filteredData = filterByDateRange(allData, params.startsAtFrom, params.startsAtTo);
      let fallbackApplied = false;
      let fallbackMonths = 0;

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
      }

      // Calculate date range of filtered data
      let filteredMinDate: Date | null = null;
      let filteredMaxDate: Date | null = null;

      if (filteredData.length > 0) {
        let minTs = Infinity, maxTs = -Infinity;
        for (const s of filteredData) {
          const t = new Date(s.startsAt).getTime();
          if (t < minTs) minTs = t;
          if (t > maxTs) maxTs = t;
        }
        filteredMinDate = new Date(minTs);
        filteredMaxDate = new Date(maxTs);
      }

      // When fallback is applied, use the actual filtered data range for calculations
      // instead of the original query dates which don't match the data
      const effectiveFrom = fallbackApplied && filteredMinDate
        ? filteredMinDate.toISOString()
        : params.startsAtFrom;
      const effectiveTo = fallbackApplied && filteredMaxDate
        ? filteredMaxDate.toISOString()
        : params.startsAtTo;

      // Sanitization pipeline:
      // 1. Basic sanitization (cancelled, invalid dates, zero capacity)
      const { sessions: basicClean, report: basicReport } = sanitizeSessions(filteredData);
      logDataQuality('Basic sanitization', basicReport);

      // 2. Infer operating hours using percentile-based bounds (eliminates outliers)
      const operatingHours = inferOperatingHours(basicClean);
      const earliestStart = Math.min(operatingHours.weekdayStart, operatingHours.weekendStart);
      const latestEnd = Math.max(operatingHours.weekdayEnd, operatingHours.weekendEnd);

      // 3. Filter sessions outside operating hours (prevents phantom time slots)
      const hoursBounds: OperatingHoursBounds = {
        earliestStart,
        latestEnd
      };
      const { sessions: hoursFiltered, report: hoursReport } = sanitizeSessions(basicClean, hoursBounds);
      if (hoursReport.dropped.outsideOperatingHours > 0) {
        logDataQuality('Operating hours filter', hoursReport);
      }

      // 4. Normalize capacity to modal value (reduces variance from special events)
      const { sessions: cleanData } = normalizeCapacity(hoursFiltered, 0.5, true);

      setDataRange({
        from: filteredMinDate,
        to: filteredMaxDate,
        rawFrom: rawMinDate,
        rawTo: rawMaxDate,
        fallbackApplied,
        fallbackMonths,
        effectiveFromISO: effectiveFrom,
        effectiveToISO: effectiveTo,
      });
      setTotalCount(cleanData.length);
      setTotalPages(pagesLoaded);
      setAllSessions(cleanData);

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sessions'));
    } finally {
      setIsLoading(false);
      setFetchPhase('idle');
    }
  }, []);

  // Use effective dates (actual data range) rather than raw query params
  // This ensures calculations are accurate when fallback dates are applied
  const effectiveFrom = dataRange.effectiveFromISO || queryParams?.startsAtFrom;
  const effectiveTo = dataRange.effectiveToISO || queryParams?.startsAtTo;

  const metrics = (queryParams && effectiveFrom && effectiveTo) ? calculateMetrics(
    allSessions,
    effectiveFrom,
    effectiveTo
  ) : null;

  // Calculate benchmark metrics with inferred operating hours
  const benchmarkMetrics = (queryParams && effectiveFrom && effectiveTo && allSessions.length > 0)
    ? calculateBenchmarkMetrics(allSessions, effectiveFrom, effectiveTo)
    : null;

  const monthlyData = calculateMonthlyData(allSessions);

  // Generate dynamic time slots based on operating hours
  const timeSlots = benchmarkMetrics ? generateTimeSlots(benchmarkMetrics.operatingHours) : undefined;
  const demandPatterns = calculateDemandPatterns(allSessions, timeSlots);

  const classTypeData = calculateClassTypeData(allSessions);
  const venueConfig = (queryParams && effectiveFrom && effectiveTo) ? calculateVenueConfig(
    allSessions,
    effectiveFrom,
    effectiveTo
  ) : null;

  const hydrateFromCache = useCallback((sessions: MomenceSession[], hostId: string, fromDate: string, toDate: string, cachedHostInfo: HostInfo | null) => {
    setAllSessions(sessions);
    setQueryParams({ hostId, startsAtFrom: fromDate, startsAtTo: toDate, page: 1, pageSize: API_CONFIG.pageSize });
    setHostInfo(cachedHostInfo);
    setError(null);
    setTotalCount(sessions.length);
    setTotalPages(1);
    setFetchingCount(sessions.length);
    let from: Date | null = null;
    let to: Date | null = null;
    if (sessions.length > 0) {
      let minTs = Infinity, maxTs = -Infinity;
      for (const s of sessions) {
        const t = new Date(s.startsAt).getTime();
        if (t < minTs) minTs = t;
        if (t > maxTs) maxTs = t;
      }
      from = new Date(minTs);
      to = new Date(maxTs);
    }
    setDataRange({
      from,
      to,
      rawFrom: from,
      rawTo: to,
      effectiveFromISO: fromDate,
      effectiveToISO: toDate,
    });
  }, []);

  return {
    allSessions,
    totalCount,
    totalPages,
    fetchingCount,
    page: 1,
    metrics,
    benchmarkMetrics,
    monthlyData,
    demandPatterns,
    classTypeData,
    venueConfig,
    hostInfo,
    dataRange,
    isLoading,
    fetchPhase,
    error,
    fetchData,
    hydrateFromCache,
  };
}
