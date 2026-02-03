import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

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
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span>Fetching session data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-error/10 border border-error/20 text-error">
        <AlertCircle className="w-5 h-5" />
        <span>Error loading data: {error.message}</span>
      </div>
    );
  }

  if (totalCount > 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <CheckCircle2 className="w-4 h-4 text-success" />
        <span>
          Loaded <strong className="text-foreground">{totalCount}</strong> sessions
          {totalPages > 1 && (
            <> (page {currentPage} of {totalPages})</>
          )}
        </span>
      </div>
    );
  }

  return null;
}
