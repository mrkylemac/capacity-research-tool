import { useState } from 'react';
import { format, subMonths, subYears } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DateRange } from 'react-day-picker';

const SAVED_VENUES = [
  { id: '49448', name: 'Aalto Community' },
  { id: '59636', name: 'Sol Sauna' },
  { id: '37867', name: 'Inner Studio' },
] as const;

const PRESETS = [
  { label: 'Last 3 months', from: () => subMonths(new Date(), 3), to: () => new Date() },
  { label: 'Last 6 months', from: () => subMonths(new Date(), 6), to: () => new Date() },
  { label: 'Last 12 months', from: () => subMonths(new Date(), 12), to: () => new Date() },
  { label: 'All time', from: () => subYears(new Date(), 10), to: () => new Date() },
] as const;

interface FiltersPanelProps {
  onFetchData: (hostId: string, fromDate: string, toDate: string) => void;
  isLoading: boolean;
}

export function FiltersPanel({ onFetchData, isLoading }: FiltersPanelProps) {
  const [selectedVenue, setSelectedVenue] = useState<string>(SAVED_VENUES[0].id);
  const [customId, setCustomId] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });

  const handleVenueChange = (value: string) => {
    if (value === 'custom') {
      setIsCustom(true);
      setCustomId('');
    } else {
      setIsCustom(false);
      setSelectedVenue(value);
    }
  };

  const handlePreset = (preset: typeof PRESETS[number]) => {
    setDateRange({ from: preset.from(), to: preset.to() });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hostId = isCustom ? customId : selectedVenue;
    if (!hostId || !dateRange.from || !dateRange.to) return;
    
    onFetchData(
      hostId,
      format(dateRange.from, 'yyyy-MM-dd'),
      format(dateRange.to, 'yyyy-MM-dd')
    );
  };

  const dateLabel = dateRange.from && dateRange.to
    ? `${format(dateRange.from, 'MMM d, yyyy')} – ${format(dateRange.to, 'MMM d, yyyy')}`
    : 'Select dates';

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

        {/* Date Range Picker with Presets */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="truncate">{dateLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex">
                <div className="flex flex-col gap-1 border-r p-3">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="justify-start text-xs"
                      onClick={() => handlePreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => range && setDateRange(range)}
                  numberOfMonths={2}
                  defaultMonth={dateRange.from}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Fetch Button */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground opacity-0">Action</Label>
          <Button 
            type="submit" 
            disabled={isLoading || (isCustom && !customId) || !dateRange.from || !dateRange.to} 
            className="w-full"
          >
            {isLoading ? 'Loading...' : 'Fetch Data'}
          </Button>
        </div>
      </div>
    </form>
  );
}
