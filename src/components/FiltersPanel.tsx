import { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { API_CONFIG, type PageSizeOption } from '@/config/api';
import { Calendar, Search, Settings } from 'lucide-react';

interface FiltersPanelProps {
  onFetchData: (hostId: string, fromDate: string, toDate: string, pageSize: number) => void;
  isLoading: boolean;
}

export function FiltersPanel({ onFetchData, isLoading }: FiltersPanelProps) {
  const [hostId, setHostId] = useState<string>(API_CONFIG.defaultHostId);
  const [fromDate, setFromDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pageSize, setPageSize] = useState<PageSizeOption>(API_CONFIG.defaultPageSize as PageSizeOption);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFetchData(hostId, fromDate, toDate, pageSize);
  };

  return (
    <form onSubmit={handleSubmit} className="stat-card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">Query Parameters</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Host ID */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-muted-foreground text-xs uppercase tracking-wider">Host ID</span>
          </label>
          <input
            type="text"
            value={hostId}
            onChange={(e) => setHostId(e.target.value)}
            className="input input-bordered bg-muted border-border text-foreground w-full"
            placeholder="49448"
          />
        </div>

        {/* From Date */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" /> From Date
            </span>
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input input-bordered bg-muted border-border text-foreground w-full"
          />
        </div>

        {/* To Date */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-muted-foreground text-xs uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" /> To Date
            </span>
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input input-bordered bg-muted border-border text-foreground w-full"
          />
        </div>

        {/* Page Size */}
        <div className="form-control">
          <label className="label">
            <span className="label-text text-muted-foreground text-xs uppercase tracking-wider">Page Size</span>
          </label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) as PageSizeOption)}
            className="select select-bordered bg-muted border-border text-foreground w-full"
          >
            {API_CONFIG.pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>

        {/* Fetch Button */}
        <div className="form-control">
          <label className="label">
            <span className="label-text opacity-0">Action</span>
          </label>
          <button
            type="submit"
            disabled={isLoading}
            className="btn bg-primary hover:bg-primary/90 text-primary-foreground border-none w-full gap-2"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <Search className="w-4 h-4" />
            )}
            Fetch Data
          </button>
        </div>
      </div>
    </form>
  );
}
