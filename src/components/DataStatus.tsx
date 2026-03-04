import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import type { DataRange } from '@/hooks/useSessions';

interface DataStatusProps {
  isLoading: boolean;
  fetchPhase?: 'idle' | 'fetching' | 'processing';
  error: Error | null;
  sessionCount: number;
  pageCount: number;
  dataRange?: DataRange;
  /** Shown when loading and sessionCount is 0 (e.g. "Fetching Project Mood data...") */
  loadingLabel?: string;
}

export function DataStatus({ isLoading, fetchPhase, error, sessionCount, pageCount, dataRange, loadingLabel }: DataStatusProps) {
  const [displayedCount, setDisplayedCount] = useState(0);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate the session count upward by 10 per tick when new data arrives
  useEffect(() => {
    if (!isLoading || fetchPhase === 'processing') {
      if (animRef.current) {
        clearInterval(animRef.current);
        animRef.current = null;
      }
      return;
    }

    if (sessionCount <= displayedCount) return;

    if (animRef.current) {
      clearInterval(animRef.current);
    }

    animRef.current = setInterval(() => {
      setDisplayedCount(prev => {
        const next = prev + 10;
        if (next >= sessionCount) {
          if (animRef.current) {
            clearInterval(animRef.current);
            animRef.current = null;
          }
          return sessionCount;
        }
        return next;
      });
    }, 30);

    return () => {
      if (animRef.current) {
        clearInterval(animRef.current);
        animRef.current = null;
      }
    };
  }, [sessionCount, isLoading, fetchPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset displayed count when a new fetch starts
  useEffect(() => {
    if (isLoading && fetchPhase === 'fetching' && sessionCount === 0) {
      setDisplayedCount(0);
    }
  }, [isLoading, fetchPhase, sessionCount]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-base text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
        {fetchPhase === 'processing' ? (
          <span>Filtering to your date range…</span>
        ) : displayedCount > 0 ? (
          <span>
            Downloading session history…{' '}
            <strong className="text-foreground">{displayedCount.toLocaleString()}</strong> sessions
          </span>
        ) : (
          <span>{loadingLabel ?? 'Fetching session data…'}</span>
        )}
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
            <p className="text-base mt-1">
              No sessions found in requested range. Data available{dateRangeText}.
            </p>
          </div>
          <div className="text-base text-muted-foreground">
            Loaded <strong className="text-foreground">{sessionCount.toLocaleString()}</strong> sessions
          </div>
        </div>
      );
    }

    return (
      <div className="text-base text-muted-foreground mb-4">
        Loaded <strong className="text-foreground">{sessionCount.toLocaleString()}</strong> sessions{dateRangeText}
      </div>
    );
  }

  // Show info about raw API data when no sessions match the filter
  if (sessionCount === 0 && dataRange?.rawFrom && dataRange?.rawTo) {
    return (
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
        <p className="font-medium">No sessions found in requested date range</p>
        <p className="text-base mt-1">
          API returned data from {format(dataRange.rawFrom, 'MMM d, yyyy')} to {format(dataRange.rawTo, 'MMM d, yyyy')}.
          Try selecting a different date range or "All time".
        </p>
      </div>
    );
  }

  return null;
}
