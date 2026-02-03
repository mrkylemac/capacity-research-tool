interface DataStatusProps {
  isLoading: boolean;
  error: Error | null;
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export function DataStatus({ isLoading, error, totalCount, totalPages, currentPage }: DataStatusProps) {
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

  if (totalCount > 0) {
    return (
      <div className="text-sm text-muted-foreground mb-4">
        Loaded <strong className="text-foreground">{totalCount}</strong> sessions
        {totalPages > 1 && (
          <> (page {currentPage} of {totalPages})</>
        )}
      </div>
    );
  }

  return null;
}
