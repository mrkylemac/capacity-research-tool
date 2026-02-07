import { format } from 'date-fns';
import type { DataRange, FetchProgress } from '@/hooks/useSessions';

interface DataStatusProps {
  isLoading: boolean;
  error: Error | null;
  sessionCount: number;
  pageCount: number;
  dataRange?: DataRange;
  fetchProgress?: FetchProgress;
}

export function DataStatus({ isLoading, error, sessionCount, pageCount, dataRange, fetchProgress }: DataStatusProps) {
  if (isLoading) {
    const count = fetchProgress?.sessionsFetched || 0;
    const pages = fetchProgress?.pagesLoaded || 0;
    
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>
          Fetching session data
          {count > 0 && (
            <span className="text-foreground font-medium">
              ... {count.toLocaleString()} sessions
              {pages > 1 && <span className="text-muted-foreground font-normal"> ({pages} pages)</span>}
            </span>
          )}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
        Error loading data: {error.message}
      </div>
    );
  }

  if (sessionCount > 0) {
    const dateRangeText = dataRange?.from && dataRange?.to
      ? ` from ${format(dataRange.from, 'MMM d, yyyy')} to ${format(dataRange.to, 'MMM d, yyyy')}`
      : '';
    
    // Show fallback notice if we couldn't match the requested range
    if (dataRange?.fallbackApplied) {
      return (
        <div className="space-y-2 mb-4">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <p className="font-medium">Showing last {dataRange.fallbackMonths} months of available data</p>
            <p className="text-xs mt-1">
              No sessions found in requested range. Data available{dateRangeText}.
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            Loaded <strong className="text-foreground">{sessionCount.toLocaleString()}</strong> sessions
            {pageCount > 1 && <> across {pageCount} API requests</>}
          </div>
        </div>
      );
    }
    
    return (
      <div className="text-sm text-muted-foreground mb-4">
        Loaded <strong className="text-foreground">{sessionCount.toLocaleString()}</strong> sessions
        {pageCount > 1 && <> across {pageCount} API requests</>}
        {dateRangeText}
      </div>
    );
  }

  // Show info about raw API data when no sessions match the filter
  if (sessionCount === 0 && dataRange?.rawFrom && dataRange?.rawTo) {
    return (
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
        <p className="font-medium">No sessions found in requested date range</p>
        <p className="text-sm mt-1">
          API returned data from {format(dataRange.rawFrom, 'MMM d, yyyy')} to {format(dataRange.rawTo, 'MMM d, yyyy')}.
          Try selecting a different date range or "All time".
        </p>
      </div>
    );
  }

  return null;
}
