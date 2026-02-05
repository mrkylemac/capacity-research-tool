import { useState } from 'react';
import { format, subMonths, subYears } from 'date-fns';
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

const SAVED_VENUES = [
  { id: '49448', name: 'Aalto Community' },
  { id: '59636', name: 'Sol Sauna' },
  { id: '37867', name: 'Inner Studio' },
] as const;

const DATE_RANGES = [
  { id: '3m', label: 'Last 3 months', getFrom: () => subMonths(new Date(), 3) },
  { id: '6m', label: 'Last 6 months', getFrom: () => subMonths(new Date(), 6) },
  { id: '12m', label: 'Last 12 months', getFrom: () => subMonths(new Date(), 12) },
  { id: 'all', label: 'All time', getFrom: () => subYears(new Date(), 10) },
] as const;

interface FiltersPanelProps {
  onFetchData: (hostId: string, fromDate: string, toDate: string) => void;
  isLoading: boolean;
}

export function FiltersPanel({ onFetchData, isLoading }: FiltersPanelProps) {
  const [selectedVenue, setSelectedVenue] = useState<string>(SAVED_VENUES[0].id);
  const [customId, setCustomId] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [dateRange, setDateRange] = useState<string>('3m');

  const handleVenueChange = (value: string) => {
    if (value === 'custom') {
      setIsCustom(true);
      setCustomId('');
    } else {
      setIsCustom(false);
      setSelectedVenue(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hostId = isCustom ? customId : selectedVenue;
    const range = DATE_RANGES.find(r => r.id === dateRange) || DATE_RANGES[0];
    const fromDate = format(range.getFrom(), 'yyyy-MM-dd');
    const toDate = format(new Date(), 'yyyy-MM-dd');
    
    if (hostId) {
      onFetchData(hostId, fromDate, toDate);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="notion-card mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Venue Selection */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Venue</Label>
          {isCustom ? (
            <div className="flex gap-2">
              <Input
                type="text"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                placeholder="Enter Host ID"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => setIsCustom(false)}
                className="px-2"
              >
                ×
              </Button>
            </div>
          ) : (
            <Select value={selectedVenue} onValueChange={handleVenueChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select venue" />
              </SelectTrigger>
              <SelectContent>
                {SAVED_VENUES.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    {venue.name}
                  </SelectItem>
                ))}
                <SelectItem value="custom">+ Custom ID...</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Date Range</Label>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((range) => (
                <SelectItem key={range.id} value={range.id}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fetch Button */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground opacity-0">Action</Label>
          <Button 
            type="submit" 
            disabled={isLoading || (isCustom && !customId)} 
            className="w-full"
          >
            {isLoading ? 'Loading...' : 'Fetch Data'}
          </Button>
        </div>
      </div>
    </form>
  );
}
