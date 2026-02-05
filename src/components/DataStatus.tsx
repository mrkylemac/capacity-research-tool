interface DataStatusProps {
  isLoading: boolean;
  error: Error | null;
  sessionCount: number;
  pageCount: number;
}

export function DataStatus({ isLoading, error, sessionCount, pageCount }: DataStatusProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
        <span className="animate-pulse">Fetching session data...</span>
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
    return (
      <div className="text-sm text-muted-foreground mb-4">
        Loaded <strong className="text-foreground">{sessionCount.toLocaleString()}</strong> sessions
        {pageCount > 1 && <> across {pageCount} API requests</>}
      </div>
    );
  }

  return null;
}
