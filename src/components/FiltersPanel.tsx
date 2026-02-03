import { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { API_CONFIG, type PageSizeOption } from '@/config/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    <form onSubmit={handleSubmit} className="notion-card mb-6">
      <h3 className="text-sm font-medium text-foreground mb-4">Query Parameters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Host ID */}
        <div className="space-y-2">
          <Label htmlFor="hostId" className="text-xs text-muted-foreground">Host ID</Label>
          <Input
            id="hostId"
            type="text"
            value={hostId}
            onChange={(e) => setHostId(e.target.value)}
            placeholder="49448"
          />
        </div>

        {/* From Date */}
        <div className="space-y-2">
          <Label htmlFor="fromDate" className="text-xs text-muted-foreground">From Date</Label>
          <Input
            id="fromDate"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        {/* To Date */}
        <div className="space-y-2">
          <Label htmlFor="toDate" className="text-xs text-muted-foreground">To Date</Label>
          <Input
            id="toDate"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        {/* Page Size */}
        <div className="space-y-2">
          <Label htmlFor="pageSize" className="text-xs text-muted-foreground">Page Size</Label>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) as PageSizeOption)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {API_CONFIG.pageSizeOptions.map(size => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fetch Button */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground opacity-0">Action</Label>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Loading...' : 'Fetch Data'}
          </Button>
        </div>
      </div>
    </form>
  );
}
